-- ===========================================================================
-- verify_coverage.sql — ตรวจว่า "เก็บข้อมูลครบแค่ไหน" หลังรัน collector
-- ใช้กับ schema ใน securities_db.sql (ฐานข้อมูล securities)
--
-- วิธีใช้: วางทีละบล็อกใน Supabase SQL Editor แล้วกด Run
--   (editor แสดงผลเฉพาะคิวรี่สุดท้ายของไฟล์ จึงไม่ควร paste ทั้งไฟล์รวดเดียว)
--   เกณฑ์ในไฟล์นี้ต้องตรงกับ collector/jobs/check_coverage.py — แก้สองที่พร้อมกัน
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- [0] ภาพรวม: นับแถวทุกตารางที่เกี่ยวข้อง (รู้ว่า "เขียนลงจริง" หรือยัง)
-- ---------------------------------------------------------------------------
select 'securities'      as table_name, count(*) as rows, max(modified_at) as last_write from public.securities
union all select 'prices_daily',      count(*), max(fetched_at) from public.prices_daily
union all select 'prices_latest',     count(*), max(fetched_at) from public.prices_latest
union all select 'fund_nav_history',  count(*), max(fetched_at) from public.fund_nav_history
union all select 'fund_details',      count(*), max(fetched_at) from public.fund_details
union all select 'dividends',         count(*), max(fetched_at) from public.dividends
union all select 'fx_rates',          count(*), max(fetched_at) from public.fx_rates
union all select 'security_aliases',  count(*), null::timestamptz from public.security_aliases
union all select 'update_logs',       count(*), max(started_at) from public.update_logs
order by table_name;


-- ---------------------------------------------------------------------------
-- [1] แถวปัญหาเท่านั้น: ไม่มีข้อมูล / ค้าง / จุดข้อมูลน้อยเกิน
--     เกณฑ์: ค้าง = ข้อมูลล่าสุดห่างเกิน 4 วัน (เผื่อสุดสัปดาห์ + วันหยุด)
--            น้อยเกิน = ต่ำกว่า 100 จุด (แหล่งข้อมูลฟรีให้ประวัติ ~1 ปี ≈ 240 จุด)
-- ---------------------------------------------------------------------------
select case
         when c.data_points = 0                  then '1_missing'
         when c.last_date < current_date - 4     then '2_stale'
         when c.data_points < 100                then '3_thin'
         else        '4_ok'
       end                                       as coverage,
       c.symbol,
       c.asset_type,
       c.exchange_code,
       c.data_points,
       c.first_date,
       c.last_date,
       current_date - c.last_date                as gap_days,
       c.sources
from public.v_coverage c
where c.status = 'active'
  and (c.data_points = 0 or c.last_date < current_date - 4 or c.data_points < 100)
order by coverage, c.asset_type, c.symbol;


-- ---------------------------------------------------------------------------
-- [2] นับรวมต่อสถานะ: ใช้ดูว่ารอบนี้ "ผ่าน" กี่ตัวจากทั้งทะเบียน
-- ---------------------------------------------------------------------------
select coverage, count(*) as securities
from (
  select case
           when c.data_points = 0                then '1_missing'
           when c.last_date < current_date - 4   then '2_stale'
           when c.data_points < 100              then '3_thin'
           else        '4_ok'
         end as coverage
  from public.v_coverage c
  where c.status = 'active'
) x
group by coverage
order by coverage;


-- ---------------------------------------------------------------------------
-- [3] เทียบต่อชนิดสินทรัพย์: หุ้นต้องเข้า prices_daily, กองทุนต้องเข้า fund_nav_history
--     (คอลัมน์ wrong_table ถ้ามากกว่า 0 แปลว่า collector เขียนผิดตาราง)
-- ---------------------------------------------------------------------------
with counts as (
  select security_id, count(*) as price_rows
  from public.prices_daily group by security_id
), navs as (
  select security_id, count(*) as nav_rows
  from public.fund_nav_history group by security_id
)
select s.asset_type,
       aty.has_nav,
       count(*)                                                as securities,
       coalesce(sum(c.price_rows), 0)                          as price_rows,
       coalesce(sum(n.nav_rows), 0)                            as nav_rows,
       count(*) filter (where coalesce(c.price_rows, 0) = 0
                          and coalesce(n.nav_rows, 0) = 0)     as no_data,
       count(*) filter (where aty.has_nav and coalesce(c.price_rows, 0) > 0)   as wrong_table
from public.securities s
join public.asset_types aty on aty.asset_type = s.asset_type
left join counts c using (security_id)
left join navs n using (security_id)
where s.status = 'active'
group by s.asset_type, aty.has_nav
order by s.asset_type;


-- ---------------------------------------------------------------------------
-- [4] ตัวที่แอปจะอ่านราคาไม่ได้: ไม่มีแถวใน prices_latest ทั้งที่เป็นราคาปิดรายวัน
--     (prices_latest คือตารางที่ FamilyFinance ใช้แสดงราคาวันนี้)
-- ---------------------------------------------------------------------------
select s.symbol, s.asset_type, s.exchange_code, s.currency
from public.securities s
join public.asset_types a using (asset_type)
left join public.prices_latest l using (security_id)
where s.status = 'active'
  and not a.has_nav
  and l.security_id is null
order by s.symbol;


-- ---------------------------------------------------------------------------
-- [5] รอบเก็บล่าสุด:แต่ละ run_id เก็บได้กี่ตัว/พลาดกี่ตัว/เขียนกี่แถว
-- ---------------------------------------------------------------------------
select run_id,
       min(started_at)                                       as started_at,
       count(*) filter (where status = 'ok')                 as ok_rows,
       count(*) filter (where status = 'error')              as error_rows,
       sum(rows_upserted)                                    as rows_upserted,
       array_agg(distinct table_name)                        as tables
from public.update_logs
group by run_id
order by min(started_at) desc
limit 10;


-- ---------------------------------------------------------------------------
-- [6] รายละเอียดที่พลาด: error row ล่าสุดพร้อมชื่อหลักทรัพย์
-- ---------------------------------------------------------------------------
select to_char(l.started_at, 'YYYY-MM-DD HH24:MI') as started,
       l.table_name,
       s.symbol,
       l.message
from public.update_logs l
left join public.securities s using (security_id)
where l.status = 'error'
order by l.started_at desc
limit 30;


-- ---------------------------------------------------------------------------
-- [7] sanity: หลักทรัพย์ซ้ำกันเพราะ '.BK' (ต้องเป็น 0 แถว — export ตัด .BK ออกแล้ว)
-- ---------------------------------------------------------------------------
select lower(replace(symbol, '.BK', ''))            as canonical,
       count(*)                                     as rows,
       array_agg(symbol || '@' || exchange_code)    as stored_as
from public.securities
group by canonical
having count(*) > 1
order by count(*) desc, canonical;


-- ---------------------------------------------------------------------------
-- [8] alias ครบไหม: ตัวที่ไม่มี alias เลย แอปจะค้นหาไม่เจอ
-- ---------------------------------------------------------------------------
select s.symbol, s.asset_type, s.exchange_code
from public.securities s
left join public.security_aliases a using (security_id)
where a.security_id is null
order by s.symbol;


-- ---------------------------------------------------------------------------
-- [9] ความลึกของประวัติเทียบกับสิ่งที่แหล่งข้อมูลสัญญาไว้ (data_sources.history_limit_days)
--     ต่ำกว่า 50% ของเพดาน = ควรหาแหล่งอื่นมาเสริม ไม่ใช่เก็บรอบใหม่ซ้ำ
-- ---------------------------------------------------------------------------
select s.symbol,
       s.asset_type,
       c.data_points,
       d.history_limit_days,
       round(100.0 * c.data_points / nullif(d.history_limit_days, 0), 1) as pct_of_limit
from public.v_coverage c
join public.securities s using (security_id)
cross join (select coalesce(max(history_limit_days), 0) as history_limit_days
            from public.data_sources
            where is_active) d
where c.status = 'active'
  and c.data_points > 0
  and c.data_points < 0.5 * d.history_limit_days
order by pct_of_limit nulls last;


-- ---------------------------------------------------------------------------
-- [10] FX + ปันผล: สองอย่างที่ขาดแล้วมูลค่า/ผลตอบแทนทั้ง_curve เพี้ยน
-- ---------------------------------------------------------------------------
select f.pair,
       count(*)                     as rate_days,
       min(f.rate_date)             as first_date,
       max(f.rate_date)             as last_date,
       current_date - max(f.rate_date) as gap_days,
       (array_agg(f.rate order by f.rate_date desc))[1] as latest_rate
from public.fx_rates f
group by f.pair
order by f.pair;

select s.symbol,
       a.asset_type,
       count(*)                                                            as payouts,
       sum(d.amount_per_share)                                             as total_per_share,
       max(coalesce(d.pay_date, d.record_date, d.ex_date))                 as last_payout
from public.dividends d
join public.securities s using (security_id)
join public.asset_types a on a.asset_type = s.asset_type
group by s.symbol, a.asset_type
order by payouts desc, s.symbol
limit 25;

-- ถ้า a.has_dividend = false ทั้งที่กองทุนจ่าย distribution แปลว่าข้อมูลไปอยู่ผิดตาราง
-- (Phase นี้เก็บเฉพาะสิ่งที่แหล่งข้อมูลให้จริง — ดูข้อ 4 ใน securities_data_dictionary.md)
select count(*) as dividend_rows_on_non_paying_asset_type
from public.dividends d
join public.securities s using (security_id)
join public.asset_types a on a.asset_type = s.asset_type
where not a.has_dividend;

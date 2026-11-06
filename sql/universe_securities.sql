-- ---------------------------------------------------------------------------
-- ขยายทะเบียนหลักทรัพย์ให้ครอบคลุมทั้งตลาด (หุ้นไทยทุกตัว / หุ้น+ETF สหรัฐฯ / กองทุนไทยทุกกอง)
--
-- หลักคิด: เก็บ "ประวัติ 1 ปี" เฉพาะตัวที่ถือหรือติดตาม (track_history = true)
-- ส่วนที่เหลือเป็น "ทะเบียน + ราคาล่าสุด" เพื่อไม่ให้รอบเก็บข้อมูลบานปลาย
-- รันไฟล์นี้ใน Supabase SQL Editor ครั้งเดียว (เขียนซ้ำได้ ไม่พัง)
-- ---------------------------------------------------------------------------

-- 1) ธงบอกว่าตัวนี้ต้องเก็บประวัติย้อนหลังหรือไม่
--    ของเดิม (ตัวที่ถือ/ติดตามอยู่) ได้ค่า true โดยปริยาย; แถวใหม่ที่ collector เพิ่มจะได้ false
alter table public.securities
  add column if not exists track_history boolean not null default true;

alter table public.securities
  alter column track_history set default false;

create index if not exists securities_track_history_idx
  on public.securities (asset_type)
  where track_history;

-- 2) NAV ล่าสุดของกองทุน — กองที่ไม่ได้เก็บประวัติยังต้องแสดงมูลค่าล่าสุดได้
--    (ปกติอ่านจาก fund_nav_history แต่กองในทะเบียนทั้งตลาด ~9,700 กองไม่ควรเขียนประวัติทุกวัน)
alter table public.fund_details
  add column if not exists latest_nav numeric(18,6);

alter table public.fund_details
  add column if not exists prev_nav numeric(18,6);

-- 3) มุมมอง coverage เปิดธง track_history ให้ check_coverage แยก "ตัวที่ต้องมีประวัติ"
--    ออกจาก "ทะเบียนทั้งตลาดที่เก็บแค่ราคาล่าสุด" ได้
create or replace view public.v_coverage as
with series as (
  select security_id, trade_date as data_date, fetched_at, source_code
  from public.prices_daily
  union all
  select security_id, nav_date, fetched_at, source_code
  from public.fund_nav_history
)
select
  s.security_id,
  s.symbol,
  s.asset_type,
  s.exchange_code,
  s.currency,
  s.status,
  count(x.data_date)                       as data_points,
  min(x.data_date)                         as first_date,
  max(x.data_date)                         as last_date,
  max(x.fetched_at)                        as last_fetched_at,
  array_agg(distinct x.source_code)        as sources,
  s.track_history                          -- ต่อท้ายเท่านั้น (CREATE OR REPLACE VIEW เพิ่มคอลัมน์กลางไม่ได้)
from public.securities s
left join series x using (security_id)
group by s.security_id, s.symbol, s.asset_type, s.exchange_code, s.currency,
         s.status, s.track_history;

-- 4) มุมมองราคา/NAV ล่าสุด: ถ้ากองไหนไม่มีแถวใน fund_nav_history ให้ใช้ค่าจาก fund_details
--    ใช้ตัวที่ใหม่กว่าระหว่างสองแหล่ง เพื่อไม่ให้ค่าที่ค้างเก่ากว่าทับค่าสด
create or replace view public.v_security_latest as
select
  s.security_id,
  s.symbol,
  s.name_th,
  s.name_en,
  s.asset_type,
  s.exchange_code,
  e.country,
  e.timezone,
  s.currency,
  s.status,
  l.trade_date   as price_date,
  l.close        as price,
  l.prev_close,
  l.change_pct,
  l.is_estimate,
  l.fetched_at   as price_fetched_at,
  case when d.nav_date is not null and (f.nav_date is null or d.nav_date > f.nav_date)
       then d.latest_nav else f.nav end      as fund_nav,
  case when d.nav_date is not null and (f.nav_date is null or d.nav_date > f.nav_date)
       then d.nav_date else f.nav_date end   as fund_nav_date,
  s.track_history                          -- ต่อท้ายเท่านั้น (CREATE OR REPLACE VIEW เพิ่มคอลัมน์กลางไม่ได้)
from public.securities s
join public.exchanges e using (exchange_code)
left join public.prices_latest l using (security_id)
left join lateral (
  select h.nav, h.nav_date
  from public.fund_nav_history h
  where h.security_id = s.security_id
  order by h.nav_date desc
  limit 1
) f on true
left join public.fund_details d using (security_id);

-- 5) ตรวจผลหลังรัน
select
  count(*)                                              as securities_total,
  count(*) filter (where track_history)                 as track_history_true,
  count(*) filter (where asset_type = 'thai-stock')     as thai_stocks,
  count(*) filter (where asset_type = 'foreign-stock')  as foreign_stocks,
  count(*) filter (where asset_type = 'etf')            as etfs,
  count(*) filter (where asset_type = 'mutual-fund')    as mutual_funds
from public.securities;

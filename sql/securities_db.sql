-- ============================================================================
-- ฐานข้อมูลหลักทรัพย์กลาง (หุ้น / ETF / กองทุนรวม / REIT) สำหรับ Family Finance
-- Phase 1: SQL Schema — ร่างตาม "แผนการสร้างฐานข้อมูลหุ้นและกองทุน" ข้อ 6 + ข้อ 12
--
-- ขอบเขตที่ตกลงแล้ว:
--   • เก็บเฉพาะหลักทรัพย์ที่ถืออยู่จริงก่อน (~120 สัญลักษณ์) แล้วค่อยขยาย
--   • ประวัติราคาเก็บเท่าที่แหล่งข้อมูลฟรีให้ (1–2 ปี) — โครงสร้างเป็น append-only
--     ไม่เขียนทับย้อนหลัง และรองรับ import CSV จากแหล่งอื่นทีหลัง
--   • collector รันบน GitHub Actions (เขียนด้วย service_role key เท่านั้น)
--   • Family Finance อ่านผ่าน anon key (ไม่ฝัง secret ในหน้าเว็บ)
--
-- วิธีใช้: เปิด Supabase → SQL Editor → New query → วางทั้งหมด → RUN
-- (ถ้าใช้ project เดียวกับ family_storage: ตารางใหม่ทั้งหมดชื่อไม่ชนของเดิม)
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 0) ค่ากลางที่ใช้ซ้ำ
-- ---------------------------------------------------------------------------

-- asset_type ใช้คำเดียวกับที่ Family Finance เก็บใน trade log อยู่แล้ว
-- (thai-stock / foreign-stock / mutual-fund) เพื่อไม่ต้องแปลชื่อไปมาระหว่างระบบ
create table if not exists public.asset_types (
  asset_type   text primary key,
  label_th     text not null,
  has_nav      boolean not null default false,   -- กองทุนใช้ NAV, หุ้นใช้ close
  has_dividend boolean not null default true
);

insert into public.asset_types (asset_type, label_th, has_nav, has_dividend) values
  ('thai-stock',      'หุ้นไทย',                 false, true),
  ('foreign-stock',   'หุ้นต่างประเทศ',           false, true),
  ('etf',             'ETF',                     false, true),
  ('mutual-fund',     'กองทุนรวม',                true,  true),
  ('reit',            'REIT / กองทุนโครงสร้างพื้นฐาน', false, true)
on conflict (asset_type) do nothing;

create table if not exists public.exchanges (
  exchange_code text primary key,          -- SET, mai, NASDAQ, NYSE, AMEX, OFFSHORE
  name         text not null,
  country      text not null,              -- TH, US, ...
  currency     char(3) not null,           -- THB, USD
  timezone     text not null,              -- Asia/Bangkok, America/New_York
  is_open      boolean not null default true
);

insert into public.exchanges (exchange_code, name, country, currency, timezone) values
  ('SET',      'ตลาดหลักทรัพย์แห่งประเทศไทย', 'TH', 'THB', 'Asia/Bangkok'),
  ('mai',      'ตลาด MAI',                    'TH', 'THB', 'Asia/Bangkok'),
  ('NASDAQ',   'Nasdaq',                      'US', 'USD', 'America/New_York'),
  ('NYSE',     'New York Stock Exchange',     'US', 'USD', 'America/New_York'),
  ('AMEX',     'NYSE American',               'US', 'USD', 'America/New_York'),
  ('OFFSHORE', 'กองทุนรวมไทยแบบต่างประเทศ (ไม่มีตลาดรอง)', 'TH', 'THB', 'Asia/Bangkok')
on conflict (exchange_code) do nothing;

-- ทะเบียนแหล่งข้อมูล + เงื่อนไขสิทธิ์ (ข้อ 8 ของเอกสาร: ต้องบันทึกที่มาเสมอ)
create table if not exists public.data_sources (
  source_code   text primary key,          -- settrade, yahoo, stooq, fundman, sec_th ...
  name          text not null,
  base_url      text,
  coverage      text,                      -- 'TH stocks EOD', 'US 1y closes' ...
  history_limit_days integer,              -- NULL = ไม่ระบุ; 365 = กองทุนไทย capped 1 ปี
  auth_mode     text not null default 'none'
                check (auth_mode in ('none','env_secret','oauth','manual_upload')),
  license_notes text,                      -- สิทธิ์นำข้อมูลไปแสดง/เผยแพร่
  is_active     boolean not null default true,
  added_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 1) securities — ทะเบียนหลักทรัพย์ ใช้ security_id เป็นรหัสกลาง (ไม่ใช้ symbol)
-- ---------------------------------------------------------------------------
create table if not exists public.securities (
  security_id     uuid primary key default gen_random_uuid(),
  symbol          text not null,            -- สัญลักษณ์ "ปัจจุบัน" (BDMS.BK, NVDA, KFGAAP)
  name_th         text,
  name_en         text,
  asset_type      text not null references public.asset_types(asset_type),
  exchange_code   text not null references public.exchanges(exchange_code),
  currency        char(3) not null,
  isin            text,
  sector          text,
  industry        text,
  status          text not null default 'active'
                  check (status in ('active','delisted','suspended','merged','unknown')),
  listed_from     date,
  listed_to       date,
  notes           text,
  created_at      timestamptz not null default now(),
  modified_at     timestamptz not null default now(),
  unique (symbol, exchange_code)
);

-- ประวัติการเปลี่ยนสัญลักษณ์ (ข้อ 12: จัดการหุ้นที่เปลี่ยน symbol / ย้ายตลาด / delist)
create table if not exists public.security_symbol_history (
  id            bigint generated always as identity primary key,
  security_id   uuid not null references public.securities(security_id) on delete cascade,
  symbol        text not null,
  exchange_code text not null references public.exchanges(exchange_code),
  from_date     date not null,
  to_date       date,                        -- NULL = ยังใช้อยู่
  reason        text,
  unique (security_id, symbol, exchange_code, from_date)
);

-- ผูกสัญลักษณ์ที่ Family Finance ใช้เรียก API เข้ากับ security_id (รองรับตัวพิมพ์ใหญ่/เล็กและ .BK)
create table if not exists public.security_aliases (
  security_id  uuid not null references public.securities(security_id) on delete cascade,
  alias        text not null,               -- 'bdms.bk', 'BDMS', 'NVDA', 'KFGAAP' ...
  source_code  text references public.data_sources(source_code),
  primary key (security_id, alias)
);

-- ---------------------------------------------------------------------------
-- 2) ราคา: prices_latest (เรคคอร์เดียวต่อหลักทรัพย์) + prices_daily (ประวัติ)
-- ---------------------------------------------------------------------------
create table if not exists public.prices_daily (
  id            bigint generated always as identity primary key,
  security_id   uuid not null references public.securities(security_id) on delete cascade,
  trade_date    date not null,
  open          numeric(18,6),
  high          numeric(18,6),
  low           numeric(18,6),
  close         numeric(18,6) not null,
  adj_close     numeric(18,6),              -- adjusted (split/dividend) ถ้าแหล่งข้อมูลให้มา
  volume        numeric(20),
  turnover      numeric(20),                -- มูลค่าซื้อขาย (บาท/ดอลลาร์)
  currency      char(3) not null,
  source_code   text not null references public.data_sources(source_code),
  fetched_at    timestamptz not null default now(),
  -- กันข้อมูลซ้ำตามรหัสหลักทรัพย์/วัน/แหล่งข้อมูล (ข้อ 12)
  unique (security_id, trade_date, source_code)
);
create index if not exists prices_daily_lookup_idx on public.prices_daily (security_id, trade_date desc);
create index if not exists prices_daily_date_idx   on public.prices_daily (trade_date desc);

create table if not exists public.prices_latest (
  security_id    uuid primary key references public.securities(security_id) on delete cascade,
  trade_date     date not null,
  close          numeric(18,6) not null,
  prev_close     numeric(18,6),
  change_pct     numeric(8,4),              -- คำนวณจาก close/prev_close (เก็บไว้กันการคำนวณซ้ำ)
  currency       char(3) not null,
  is_estimate    boolean not null default false,
  source_code    text references public.data_sources(source_code),
  fetched_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3) dividends — เงินปันผล / DPU / XD / Record / Payment (ข้อ 5)
-- ---------------------------------------------------------------------------
create table if not exists public.dividends (
  id               bigint generated always as identity primary key,
  security_id      uuid not null references public.securities(security_id) on delete cascade,
  kind             text not null default 'dividend'
                   check (kind in ('dividend','dpu','capital_return','special_dividend','interest')),
  amount_per_share numeric(18,6) not null,  -- ต่อหน่วย (บาทหรือดอลลาร์ตาม currency)
  currency         char(3) not null,
  ex_date          date,                    -- วัน XD
  record_date      date,                    -- วันกำหนดสิทธิ (RL)
  pay_date         date,                    -- วันจ่ายจริง
  period_label     text,                    -- 'Q1/2569', 'H2/2025', 'รอบ 6 เดือน' ...
  fiscal_year      smallint,
  is_declared      boolean not null default true,   -- ประกาศแล้ว vs ประมาณการ
  source_code      text not null references public.data_sources(source_code),
  announced_at     date,
  fetched_at       timestamptz not null default now(),
  -- แหล่งข้อมูลเดียวกันไม่ควรมีแถวซ้ำ (PG15: NULLS NOT DISTINCT กันเคสวันที่เป็น NULL)
  -- ต้องมี pay_date อยู่ในกุญแจด้วย เพราะปันผลที่บันทึกจากแอปมีแค่วันรับเงิน (XD/RL เป็น NULL)
  -- ไม่งั้นปันผล "จำนวนเท่ากัน คนละวัน" ของหุ้นตัวเดิมจะยุบเหลือแถวเดียว
  unique nulls not distinct (security_id, kind, ex_date, record_date, pay_date, amount_per_share, source_code)
);
create index if not exists dividends_ex_date_idx on public.dividends (ex_date desc);
create index if not exists dividends_security_idx on public.dividends (security_id, pay_date desc);

-- ---------------------------------------------------------------------------
-- 4) งบการเงิน + อัตราส่วน (ข้อ 5) — แยก "ค่าจากแหล่งข้อมูล" กับ "ค่าที่คำนวณเอง"
-- ---------------------------------------------------------------------------
create table if not exists public.financials (
  id               bigint generated always as identity primary key,
  security_id      uuid not null references public.securities(security_id) on delete cascade,
  fiscal_year      smallint not null,
  period_type      text not null check (period_type in ('Q1','Q2','Q3','Q4','H1','H2','YTD','FY')),
  revenue          numeric(20),
  gross_profit     numeric(20),
  operating_profit numeric(20),
  net_profit       numeric(20),
  eps              numeric(18,6),
  total_assets     numeric(20),
  total_liabilities numeric(20),
  equity           numeric(20),
  operating_cash_flow numeric(20),
  currency         char(3) not null,
  unit_scale       text not null default 'absolute'
                   check (unit_scale in ('absolute','thousand','million','billion')),
  reported_at      date,                    -- วันเผยแพร่งบ (สำคัญต่อ backtest)
  source_code      text not null references public.data_sources(source_code),
  fetched_at       timestamptz not null default now(),
  unique (security_id, fiscal_year, period_type, source_code)
);

create table if not exists public.ratios (
  id             bigint generated always as identity primary key,
  security_id    uuid not null references public.securities(security_id) on delete cascade,
  as_of_date     date not null,
  period_label   text,                      -- งวดที่ใช้คำนวณ เช่น 'FY2568'
  pe             numeric(12,4),
  pbv            numeric(12,4),
  roe            numeric(8,4),              -- เปอร์เซ็นต์ (12.5 = 12.5%)
  roa            numeric(8,4),
  debt_to_equity numeric(12,4),
  ev_ebitda      numeric(12,4),
  dividend_yield numeric(8,4),              -- เปอร์เซ็นต์
  is_derived     boolean not null default false,   -- true = ระบบคำนวณเอง ไม่ใช่ตัวเลขจากแหล่งข้อมูล
  derived_formula text,                     -- เช่น 'sum(12m dividends)/close'
  source_code    text references public.data_sources(source_code),
  fetched_at     timestamptz not null default now(),
  unique nulls not distinct (security_id, as_of_date, period_label, is_derived, source_code)
);

-- ---------------------------------------------------------------------------
-- 5) กองทุน: รายละเอียด, ประวัติ NAV, สินทรัพย์ที่ถือ
-- ---------------------------------------------------------------------------
create table if not exists public.fund_details (
  security_id       uuid primary key references public.securities(security_id) on delete cascade,
  management_company text,                  -- บลจ.
  fund_type          text,                  -- Equity / Bond / Mixed / RMF / ThaiESG / SSF ...
  policy             text,
  benchmark          text,
  aum                numeric(20),
  aum_currency       char(3),
  expense_ratio      numeric(8,4),          -- เปอร์เซ็นต์ต่อปี
  minimum_first_buy  numeric(18,2),
  inception_date     date,
  nav_date           date,                  -- วันที่ NAV อ้างอิง
  risk_level         smallint,
  source_code        text references public.data_sources(source_code),
  fetched_at         timestamptz not null default now()
);

create table if not exists public.fund_nav_history (
  id           bigint generated always as identity primary key,
  security_id  uuid not null references public.securities(security_id) on delete cascade,
  nav_date     date not null,
  nav          numeric(18,6) not null,
  currency     char(3) not null,
  source_code  text not null references public.data_sources(source_code),
  fetched_at   timestamptz not null default now(),
  unique (security_id, nav_date, source_code)
);
create index if not exists fund_nav_history_lookup_idx on public.fund_nav_history (security_id, nav_date desc);

create table if not exists public.fund_holdings (
  id           bigint generated always as identity primary key,
  security_id  uuid not null references public.securities(security_id) on delete cascade,
  holding_date date not null,               -- วันตัดรอบที่เปิดเผย
  asset_name   text not null,
  asset_type   text references public.asset_types(asset_type),
  weight_pct   numeric(8,4),
  is_top_ten   boolean not null default false,
  source_code  text references public.data_sources(source_code),
  fetched_at   timestamptz not null default now(),
  unique (security_id, holding_date, asset_name, source_code)
);

-- ---------------------------------------------------------------------------
-- 6) corporate actions + FX + log การรัน
-- ---------------------------------------------------------------------------
create table if not exists public.corporate_actions (
  id           bigint generated always as identity primary key,
  security_id  uuid not null references public.securities(security_id) on delete cascade,
  action_date  date not null,
  action_type  text not null check (action_type in
               ('split','reverse_split','par_change','rights_issue','warrant','merger','spin_off','delist','name_change','symbol_change')),
  ratio        numeric(18,8),               -- เช่น 4:1 → 4.0 (ใช้แก้ adj_close และยอดถือครอง)
  price        numeric(18,6),               -- ราคาจอง/rights (ถ้ามี)
  details      text,
  source_code  text references public.data_sources(source_code),
  fetched_at   timestamptz not null default now(),
  unique (security_id, action_date, action_type, details)
);
create index if not exists corporate_actions_date_idx on public.corporate_actions (action_date desc);

create table if not exists public.fx_rates (
  id           bigint generated always as identity primary key,
  pair         text not null,               -- 'USDTHB'
  rate_date    date not null,
  rate         numeric(18,8) not null,
  source_code  text not null references public.data_sources(source_code),
  fetched_at   timestamptz not null default now(),
  unique (pair, rate_date, source_code)
);
create index if not exists fx_rates_lookup_idx on public.fx_rates (pair, rate_date desc);

create table if not exists public.update_logs (
  id            bigint generated always as identity primary key,
  run_id        text not null,              -- ใส่ค่าเดียวกันต่อ 1 รอบการรัน (เช่น UUID ของ workflow run)
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  source_code   text references public.data_sources(source_code),
  table_name    text,
  security_id   uuid references public.securities(security_id) on delete set null,
  status        text not null check (status in ('ok','partial','error','skipped')),
  rows_upserted integer not null default 0,
  message       text
);
create index if not exists update_logs_run_idx on public.update_logs (run_id, started_at desc);
create index if not exists update_logs_status_idx on public.update_logs (status, started_at desc);

-- ---------------------------------------------------------------------------
-- 7) trigger รักษา modified_at ให้อัตโนมัติ
-- ---------------------------------------------------------------------------
create or replace function public.set_modified_at() returns trigger
language plpgsql as $$
begin
  new.modified_at = now();
  return new;
end $$;

drop trigger if exists securities_modified on public.securities;
create trigger securities_modified before update on public.securities
  for each row execute function public.set_modified_at();

-- ---------------------------------------------------------------------------
-- 8) views สำหรับ Phase 2 (ตรวจ coverage) และสำหรับ Family Finance (อ่านค่าเดียวจบ)
-- ---------------------------------------------------------------------------

-- เส้นราคาที่ใช้ได้จริงต่อหลักทรัพย์: ใช้ตรวจว่า "เก็บครบเท่าที่แหล่งให้" หรือยัง
create or replace view public.v_price_coverage as
select
  s.security_id,
  s.symbol,
  s.asset_type,
  s.exchange_code,
  count(p.id)                                   as price_rows,
  min(p.trade_date)                             as first_date,
  max(p.trade_date)                             as last_date,
  max(p.fetched_at)                             as last_fetched_at,
  array_agg(distinct p.source_code)             as sources
from public.securities s
left join public.prices_daily p on p.security_id = s.security_id
group by s.security_id;

-- มุมมอง coverage รวม: นับ "จุดข้อมูล" ที่เกิดขึ้นจริงต่อหลักทรัพย์โดยไม่สนใจว่าเป็นราคาหรือ NAV
-- (collector ใช้ตรวจรอบเก็บข้อมูล: v_price_coverage นับเฉพาะ prices_daily ซึ่ง กองทุนจะเห็นเป็น 0 เสมอ)
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
  array_agg(distinct x.source_code)        as sources
from public.securities s
left join series x using (security_id)
group by s.security_id, s.symbol, s.asset_type, s.exchange_code, s.currency, s.status;

-- มุมมองที่ Family Finance ใช้: ราคา/NAV ล่าสุด + ชื่อย่อ + สกุลเงินต่อ 1 แถว
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
  f.nav          as fund_nav,
  f.nav_date     as fund_nav_date
from public.securities s
join public.exchanges e using (exchange_code)
left join public.prices_latest l using (security_id)
left join lateral (
  select h.nav, h.nav_date
  from public.fund_nav_history h
  where h.security_id = s.security_id
  order by h.nav_date desc
  limit 1
) f on true;

-- ปันผลย้อนหลัง 12 เดือน + yield ที่ระบบคำนวณเอง (แยกจากตัวเลขที่แหล่งข้อมูลให้มา)
-- หลักทรัพย์ที่แหล่งข้อมูลจริง (เช่น yahoo) ให้ตัวเลขต่อหน่วยแล้ว ใช้เฉพาะชุดนั้น
-- ไม่รวมแถวที่แอปบันทึก (manual_log) ซึ่งบางรายการเป็นยอดเงินที่ได้รับทั้งก้อน ไม่ใช่ต่อหน่วย
create or replace view public.v_dividend_12m as
with recent as (
  select d.*,
         max(case when d.source_code <> 'manual_log' then 1 else 0 end)
           over (partition by d.security_id) as has_market_source
  from public.dividends d
  where d.pay_date >= (current_date - interval '365 days')
     or (d.pay_date is null and d.ex_date >= (current_date - interval '365 days'))
)
select
  s.security_id,
  s.symbol,
  s.currency,
  sum(d.amount_per_share)                                  as per_share_12m,
  count(*)                                                 as payouts_12m,
  max(d.pay_date)                                          as last_pay_date,
  case when l.close > 0
       then round((sum(d.amount_per_share) / l.close * 100)::numeric, 2)
       else null end                                       as derived_yield_pct
from recent d
join public.securities s using (security_id)
left join public.prices_latest l using (security_id)
where d.source_code <> 'manual_log' or d.has_market_source = 0
group by s.security_id, s.symbol, s.currency, l.close;

-- ---------------------------------------------------------------------------
-- 9) Row Level Security
--    อ่านได้ทั้ง anon (ข้อมูลตลาดไม่ใช่ข้อมูลส่วนบุคคล) และสมาชิกในบ้าน
--    เขียนได้เฉพาะ service_role = collector บน GitHub Actions เท่านั้น
--    * ห้ามใช้ anon key เขียน และห้ามเอา service_role key ใส่ในหน้าเว็บ *
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'asset_types','exchanges','data_sources','securities','security_symbol_history','security_aliases',
    'prices_daily','prices_latest','dividends','financials','ratios',
    'fund_details','fund_nav_history','fund_holdings','corporate_actions','fx_rates','update_logs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "%s_read" on public.%I', t, t);
    execute format(
      'create policy "%s_read" on public.%I for select to anon, authenticated using (true)', t, t);
  end loop;
end $$;

-- นโยบายเขียน: ทุกตารางอนุญาตเฉพาะ service_role (collector)
do $$
declare t text;
begin
  foreach t in array array[
    'securities','security_symbol_history','security_aliases',
    'prices_daily','prices_latest','dividends','financials','ratios',
    'fund_details','fund_nav_history','fund_holdings','corporate_actions','fx_rates','update_logs',
    'data_sources','exchanges','asset_types'
  ] loop
    execute format('drop policy if exists "%s_write_service" on public.%I', t, t);
    execute format(
      'create policy "%s_write_service" on public.%I
         for all to service_role using (true) with check (true)', t, t);
  end loop;
end $$;

commit;

-- ============================================================================
-- หมายเหตุการใช้งาน
--
-- 1) upsert ที่ collector ควรใช้ (กันเขียนทับประวัติและกันแถวซ้ำ):
--      insert into public.prices_daily (security_id, trade_date, close, currency, source_code, fetched_at)
--      values ($1,$2,$3,$4,'yahoo',now())
--      on conflict (security_id, trade_date, source_code)
--      do update set close = excluded.close, fetched_at = now();
--
-- 2) import CSV ย้อนหลัง (ช่วงที่แหล่งฟรีไม่มีให้) ใส่ source_code = 'manual_upload'
--    แล้วประวัติจากคนละแหล่งจะอยู่คนละแถว ไม่กลบกัน — query โดยกรอง source_code หรือเอาแถวล่าสุด
--
-- 3) ตารางที่ยังไม่ทำในไฟล์นี้ (เอกสารข้อ 6 ระบุว่า "อาจเพิ่มทีหลัง"):
--    trading_calendars, benchmarks/index levels, fund_distributions, data_quality_checks
--    — ถ้า Phase 2 ต้องใช้ XD calendar เต็มรูปแบบค่อยเพิ่ม trading_calendars
--
-- 4) ยังไม่มีตารางเก็บ "พอร์ต/รายการซื้อขาย" โดยตั้งใจ — ของ Family Finance อยู่ใน
--    user_storage (jsonb) และ family_storage อยู่แล้ว ตามหลักการ "แยกฐานข้อมูลกลางออกจากรายการส่วนบุคคล"
-- ============================================================================

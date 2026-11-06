-- คิวขอประวัติย้อนหลัง — หน้าเว็บกด "ขอประวัติ" ที่หลักทรัพย์ที่สนใจ
-- collector (workflow รายวัน) ค่อย ๆ กินคิวทีละชุด ดึง ~1 ปีย้อนหลัง แล้วปิดคิว
-- ไม่พลิก track_history เพื่อไม่ให้รอบถัดไปต้องดึงซ้ำทุกวัน

create table if not exists public.history_requests (
  security_id   uuid primary key references public.securities (security_id) on delete cascade,
  status        text not null default 'pending'
                check (status in ('pending', 'done', 'failed')),
  message       text,
  rows_loaded   integer,
  requested_at  timestamptz not null default now(),
  processed_at  timestamptz
);

create index if not exists history_requests_status_idx
  on public.history_requests (status, requested_at);

comment on table public.history_requests is
  'คิวขอประวัติย้อนหลังจากหน้าเว็บ — ตัวเดียวขอซ้ำได้แค่ครั้งเดียว (PK) จนกว่า collector จะปิดคิว';

alter table public.history_requests enable row level security;

-- หน้าเว็บ (anon key) ขอได้เฉพาะคิว pending เท่านั้น — ปิดทางแก้สถานะ/ยัดคิวปลอม
create policy "anon ขอประวัติได้ (pending เท่านั้น)"
  on public.history_requests for insert to anon
  with check (status = 'pending');

-- อ่านสถานะคิวได้ (ใช้แสดงป้าย อยู่ในคิว/ล้มเหลว ที่หน้าเว็บ)
create policy "anon อ่านคิวได้"
  on public.history_requests for select to anon
  using (true);

-- ขอใหม่ได้เฉพาะคิวที่ล้มเหลว (กลับมาเป็น pending) — คิว done/pending แก้ไม่ได้
create policy "anon ขอใหม่ได้เฉพาะคิวที่ล้มเหลว"
  on public.history_requests for update to anon
  using (status = 'failed')
  with check (status = 'pending');

-- ปิดคิว/แก้สถานะเป็นงานของ collector เท่านั้น (service key ผ่าน RLS อยู่แล้ว ไม่ต้องมี policy)

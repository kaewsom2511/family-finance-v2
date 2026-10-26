-- family_storage: เก็บข้อมูลโครงสร้างที่ทั้งบ้านใช้ร่วมกัน
-- (หมวดหมู่, บัญชีเงินฝากหลัก, การตั้งค่า, บัตรเครดิต, สัญญาหนี้)
-- ส่วนข้อมูลส่วนตัวของแต่ละคนยังอยู่ในตาราง user_storage like เดิม โดยต่อท้ายชื่อคีย์ด้วย #u<uid>
--
-- วิธีใช้: เปิด Supabase → SQL Editor → New query → วางทั้งหมด → RUN

create table if not exists public.family_storage (
  id         text        not null primary key,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- มีแถวเดียวเท่านั้นที่แอปใช้ คือ id = 'family'
insert into public.family_storage (id, data)
values ('family', '{}'::jsonb)
on conflict (id) do nothing;

alter table public.family_storage enable row level security;

-- อนุญาตเฉพาะบัญชีของบ้านนี้ (ต้องมีแถวในตาราง profiles)
drop policy if exists "family_storage_read" on public.family_storage;
create policy "family_storage_read" on public.family_storage
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "family_storage_insert" on public.family_storage;
create policy "family_storage_insert" on public.family_storage
  for insert to authenticated
  with check (id = 'family' and exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "family_storage_update" on public.family_storage;
create policy "family_storage_update" on public.family_storage
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid()))
  with check (id = 'family');

-- (ไม่บังคับ) เปิด Realtime เพื่อให้ทุกเครื่องอัปเดตทันทีที่อีกบัญชีบันทึกข้อมูลร่วม
-- ถ้าข้ามข้อนี้ แอปยัง sync ข้ามบัญชีอัตโนมัติทุก ~60 วินาที และทุกครั้งที่สลับกลับมาที่แท็บ
do $$
begin
  alter publication supabase_realtime add table public.family_storage;
exception when duplicate_object then
  raise notice 'family_storage ถูกเพิ่มใน publication แล้ว';
end $$;

-- ตรวจสอบ: ต้องได้ 1 แถว id = 'family'
select id, updated_at, jsonb_object_keys(data) as key_name
from public.family_storage;

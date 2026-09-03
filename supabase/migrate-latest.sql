-- ────────────────────────────────────────────────────────────
-- 최신 변경사항 적용 마이그레이션
--   · '섬기는 사람들'(church_staff) 테이블이 없으면 만들고
--   · 새가족 등록(new_families) 테이블/정책을 보강하고
--   · 교회 정보(church_profile)의 지도·헌금 URL 컬럼을 추가합니다.
--
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run 하세요.
-- 여러 번 실행해도 안전한(idempotent) 스크립트입니다.
-- (schema.sql 전체를 다시 실행해도 동일한 결과가 됩니다.)
-- ────────────────────────────────────────────────────────────

-- 1) 섬기는 사람들 (목사 · 장로 · 관리 3개 분류)
create table if not exists public.church_staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default '관리',
  role text not null default '',
  detail text not null default '',
  sort_order smallint not null default 0
);

-- 이미 church_staff 가 있던 경우 분류(category) 컬럼을 추가합니다.
alter table public.church_staff add column if not exists category text not null default '관리';

-- 기존에 등록된 사람들의 분류를 직분(role)으로 자동 지정합니다.
-- (목사 · 전도사 · 장로 · 관리 4개 분류)
update public.church_staff set category = '전도사'
  where category = '관리' and (role like '%전도사%' or role like '%강도사%');
update public.church_staff set category = '장로'
  where category = '관리' and role like '%장로%';
update public.church_staff set category = '목사'
  where category = '관리' and role like '%목사%';

-- 이전 마이그레이션에서 '목사'로 통합됐던 전도사를 다시 분리합니다.
update public.church_staff set category = '전도사'
  where category = '목사' and (role like '%전도사%' or role like '%강도사%');

alter table public.church_staff enable row level security;

drop policy if exists "church_staff 공개 조회" on public.church_staff;
create policy "church_staff 공개 조회" on public.church_staff for select using (true);

drop policy if exists "church_staff 관리자 쓰기" on public.church_staff;
create policy "church_staff 관리자 쓰기" on public.church_staff
  for all using (public.is_admin()) with check (public.is_admin());

-- 담임목사 한 명을 기본으로 넣어 둡니다(이미 있으면 건너뜁니다).
insert into public.church_staff (name, category, role, detail, sort_order)
select '공진수', '목사', '담임목사', '', 1
where not exists (select 1 from public.church_staff);

-- 2) 새가족 등록
create table if not exists public.new_families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null default '',
  gender text not null default '',
  address text not null default '',
  referrer text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.new_families enable row level security;

drop policy if exists "새가족 신청" on public.new_families;
create policy "새가족 신청" on public.new_families for insert with check (true);

drop policy if exists "새가족 관리자 조회" on public.new_families;
create policy "새가족 관리자 조회" on public.new_families for select using (public.is_admin());

drop policy if exists "새가족 관리자 삭제" on public.new_families;
create policy "새가족 관리자 삭제" on public.new_families for delete using (public.is_admin());

-- 3) 교회 정보에 지도·헌금 URL 컬럼 추가
alter table public.church_profile add column if not exists giving_url text not null default '';
alter table public.church_profile add column if not exists map_url text not null default '';

-- 네이버 플레이스 정확 위치 링크를 설정합니다.
update public.church_profile set map_url = 'https://naver.me/5CCocDC6' where coalesce(map_url, '') = '';

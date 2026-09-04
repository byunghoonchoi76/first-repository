-- 교회 앱 Supabase 스키마
-- 사용법: Supabase 대시보드 > SQL Editor 에 이 파일 전체를 붙여넣고 실행하세요.

-- ─────────────────────────────────────────────
-- 사용자 프로필 (역할 관리)
-- ─────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '성도',
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);

-- 로그인한 사용자가 관리자인지 확인하는 헬퍼.
-- security definer 로 두어야 profiles 정책 안에서 재귀 없이 사용할 수 있습니다.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ─────────────────────────────────────────────
-- 교회 정보 · 예배 시간
-- ─────────────────────────────────────────────
create table if not exists public.church_profile (
  id smallint primary key default 1 check (id = 1),
  name text not null,
  slogan text not null default '',
  slogan_verse text not null default '',
  pastor text not null default '',
  address text not null default '',
  phone text not null default '',
  email text not null default '',
  offering_account text not null default '',
  youtube_url text not null default '',
  giving_url text not null default '',
  map_url text not null default ''
);

-- 이미 만들어 둔 테이블에도 안전하게 추가합니다.
alter table public.church_profile add column if not exists youtube_url text not null default '';
alter table public.church_profile add column if not exists slogan_verse text not null default '';
alter table public.church_profile add column if not exists giving_url text not null default '';
alter table public.church_profile add column if not exists map_url text not null default '';

create table if not exists public.service_times (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  schedule text not null,
  place text not null default '본당',
  note text,
  -- '예배' 는 전체 예배, '교육부서' 는 연령별 부서 예배
  category text not null default '예배' check (category in ('예배', '교육부서')),
  sort_order smallint not null default 0
);

alter table public.service_times add column if not exists category text not null default '예배';

-- ─────────────────────────────────────────────
-- 주보
-- ─────────────────────────────────────────────
create table if not exists public.bulletins (
  id uuid primary key default gen_random_uuid(),
  service_date date not null,
  title text not null default '주일 예배 주보',
  sermon_title text not null,
  preacher text not null,
  scripture text not null default '',
  weekly_verse text not null default '',
  -- [{ "title": "예배의 부름", "detail": "시편 100:1-5" }, ...]
  order_items jsonb not null default '[]'::jsonb,
  -- ["광고1", "광고2"]
  notices jsonb not null default '[]'::jsonb,
  -- 주보 원본 이미지 주소들 (["앞면.jpg", "뒷면.jpg"]). PDF 주소도 넣을 수 있습니다.
  image_urls jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.bulletins add column if not exists image_urls jsonb not null default '[]'::jsonb;

create index if not exists bulletins_service_date_idx on public.bulletins (service_date desc);

-- ─────────────────────────────────────────────
-- 공지사항
-- ─────────────────────────────────────────────
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  category text not null default '공지' check (category in ('공지', '행사', '소식')),
  author text not null default '교회 사무실',
  pinned boolean not null default false,
  published_at timestamptz not null default now()
);

create index if not exists announcements_published_idx on public.announcements (pinned desc, published_at desc);

-- ─────────────────────────────────────────────
-- 설교
-- ─────────────────────────────────────────────
create table if not exists public.sermons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  preacher text not null,
  scripture text not null default '',
  preached_on date not null,
  series text,
  media_type text not null default 'video' check (media_type in ('video', 'audio')),
  media_url text not null,
  thumbnail_url text,
  summary text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists sermons_preached_on_idx on public.sermons (preached_on desc);

-- ─────────────────────────────────────────────
-- 기도제목
-- ─────────────────────────────────────────────
create table if not exists public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  author text not null default '익명',
  author_id uuid references auth.users on delete set null,
  anonymous boolean not null default false,
  answered boolean not null default false,
  pray_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists prayer_requests_created_idx on public.prayer_requests (created_at desc);

-- '함께 기도' 카운트를 안전하게 1 올립니다 (동시 클릭에도 값이 어긋나지 않도록).
create or replace function public.increment_pray_count(request_id uuid)
returns setof public.prayer_requests
language sql
security definer
set search_path = public
as $$
  update public.prayer_requests
  set pray_count = pray_count + 1
  where id = request_id
  returning *;
$$;

-- 공동 기도제목 — 온 성도가 함께 기도하며 시간(분)을 쌓아 가는 교회 공통 제목
create table if not exists public.communal_prayers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  total_minutes integer not null default 0,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

-- 이 제목으로 기도한 시간(분)을 전체 누적에 안전하게 더합니다 (동시 기도에도 합계가 어긋나지 않도록).
create or replace function public.add_communal_prayer_minutes(p_id uuid, p_minutes integer)
returns setof public.communal_prayers
language sql
security definer
set search_path = public
as $$
  update public.communal_prayers
  set total_minutes = total_minutes + greatest(0, p_minutes)
  where id = p_id
  returning *;
$$;

-- 로그인하지 않은 성도도 함께 기도할 수 있도록 실행 권한을 부여합니다.
grant execute on function public.add_communal_prayer_minutes(uuid, integer) to anon, authenticated;

-- ─────────────────────────────────────────────
-- 소그룹 · 소통방
-- ─────────────────────────────────────────────
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

create table if not exists public.church_staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default '관리',
  role text not null default '',
  detail text not null default '',
  sort_order smallint not null default 0
);

alter table public.church_staff add column if not exists category text not null default '관리';

create table if not exists public.small_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  leader text not null default '',
  meeting_info text not null default '',
  description text not null default '',
  member_count integer not null default 0
);

create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.small_groups on delete cascade,
  author text not null default '성도',
  author_id uuid references auth.users on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists group_messages_group_idx on public.group_messages (group_id, created_at);

-- ─────────────────────────────────────────────
-- RLS: 읽기는 모두에게, 쓰기는 로그인/관리자에게
-- ─────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.church_profile enable row level security;
alter table public.service_times enable row level security;
alter table public.bulletins enable row level security;
alter table public.announcements enable row level security;
alter table public.sermons enable row level security;
alter table public.prayer_requests enable row level security;
alter table public.communal_prayers enable row level security;
alter table public.new_families enable row level security;
alter table public.church_staff enable row level security;
alter table public.small_groups enable row level security;
alter table public.group_messages enable row level security;

-- 프로필: 본인 것만 읽고 쓰기, 관리자는 전체 조회
drop policy if exists "본인 프로필 조회" on public.profiles;
create policy "본인 프로필 조회" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "본인 프로필 생성" on public.profiles;
create policy "본인 프로필 생성" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "본인 프로필 수정" on public.profiles;
create policy "본인 프로필 수정" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id and role = 'member' or public.is_admin());

-- 공개 읽기 + 관리자 쓰기 테이블
do $$
declare
  t text;
begin
  foreach t in array array['church_profile', 'service_times', 'bulletins', 'announcements', 'sermons', 'small_groups', 'church_staff', 'communal_prayers']
  loop
    execute format('drop policy if exists "%s 공개 조회" on public.%I', t, t);
    execute format('create policy "%s 공개 조회" on public.%I for select using (true)', t, t);

    execute format('drop policy if exists "%s 관리자 쓰기" on public.%I', t, t);
    execute format('create policy "%s 관리자 쓰기" on public.%I for all using (public.is_admin()) with check (public.is_admin())', t, t);
  end loop;
end;
$$;

-- 기도제목: 누구나 읽기, 로그인 사용자가 작성, 본인/관리자가 수정
-- 기도제목은 민감할 수 있어 로그인한 성도만 읽을 수 있습니다.
drop policy if exists "기도제목 조회" on public.prayer_requests;
create policy "기도제목 조회" on public.prayer_requests
  for select using (auth.uid() is not null);

drop policy if exists "기도제목 작성" on public.prayer_requests;
create policy "기도제목 작성" on public.prayer_requests
  for insert with check (auth.uid() is not null);

drop policy if exists "기도제목 수정" on public.prayer_requests;
create policy "기도제목 수정" on public.prayer_requests
  for update using (auth.uid() = author_id or public.is_admin());

drop policy if exists "기도제목 삭제" on public.prayer_requests;
create policy "기도제목 삭제" on public.prayer_requests
  for delete using (auth.uid() = author_id or public.is_admin());

-- 소그룹 대화: 로그인 사용자만 읽고 쓰기
drop policy if exists "소그룹 대화 조회" on public.group_messages;
create policy "소그룹 대화 조회" on public.group_messages
  for select using (auth.uid() is not null);

drop policy if exists "소그룹 대화 작성" on public.group_messages;
create policy "소그룹 대화 작성" on public.group_messages
  for insert with check (auth.uid() is not null);

drop policy if exists "소그룹 대화 삭제" on public.group_messages;
create policy "소그룹 대화 삭제" on public.group_messages
  for delete using (auth.uid() = author_id or public.is_admin());

-- 새가족 등록: 누구나 신청(insert)할 수 있고, 조회·삭제는 관리자만
drop policy if exists "새가족 신청" on public.new_families;
create policy "새가족 신청" on public.new_families for insert with check (true);

drop policy if exists "새가족 관리자 조회" on public.new_families;
create policy "새가족 관리자 조회" on public.new_families for select using (public.is_admin());

drop policy if exists "새가족 관리자 삭제" on public.new_families;
create policy "새가족 관리자 삭제" on public.new_families for delete using (public.is_admin());

-- 새로 가입하면 profiles 행을 자동으로 만들어 줍니다.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 앱 화면을 바로 확인할 수 있는 최소 시드 데이터.
-- schema.sql 을 먼저 실행한 뒤 SQL Editor 에서 실행하세요.

insert into public.church_profile (id, name, slogan, slogan_verse, pastor, address, phone, email, offering_account, youtube_url)
values (
  1,
  '구리 목양교회',
  '두려워하지 말라, 강하고 담대하라',
  '신 31:6, 수 1:9',
  '공진수 담임목사',
  '경기도 구리시 장자호수길 67',
  '031-551-1004',
  'stewardk@hanmail.net',
  '농협 382-01-017978',
  'https://www.youtube.com/@mychmedia'
)
on conflict (id) do update set
  name = excluded.name,
  slogan = excluded.slogan,
  slogan_verse = excluded.slogan_verse,
  pastor = excluded.pastor,
  address = excluded.address,
  phone = excluded.phone,
  email = excluded.email,
  offering_account = excluded.offering_account,
  youtube_url = excluded.youtube_url;

insert into public.service_times (name, schedule, place, note, category, sort_order) values
  ('새벽예배', '월~금 오전 5:30', '본당(3층)', null, '예배', 1),
  ('주일예배 1부', '주일 오전 7:30', '본당(3층)', null, '예배', 2),
  ('주일예배 2부', '주일 오전 9:30', '본당(3층)', null, '예배', 3),
  ('주일예배 3부', '주일 오전 11:30', '본당(3층)', null, '예배', 4),
  ('저녁 찬양예배', '주일 오후 5:00', '본당(3층)', '첫째 주는 가정예배', '예배', 5),
  ('목양바이블아카데미(MBA)', '수요일 오전 10:30', '본당(3층)', null, '예배', 6),
  ('수요부흥예배', '수요일 오후 7:30', '본당(3층)', null, '예배', 7),
  ('금요성령집회', '금요일 오후 8:00', '본당(3층)', null, '예배', 8),
  ('영유아부 (0~4세)', '주일 오전 11:30', '자모실(4층)', null, '교육부서', 11),
  ('유치부 (5~7세)', '1부 주일 오전 9:30 · 2부 오전 11:30', '샬롬홀(2층)', null, '교육부서', 12),
  ('초등부 (초등 1~3학년)', '1부 주일 오전 9:30 · 2부 오전 11:30', '드림홀(지하1층)', null, '교육부서', 13),
  ('소년부 (초등 4~6학년)', '1부 주일 오전 9:30 · 2부 오전 11:30', '비전홀(2층)', null, '교육부서', 14),
  ('어와나 (초등 1~6학년)', '주일 오후 2:00', '비전홀(2층)', null, '교육부서', 15),
  ('중등부', '주일 오전 11:30', '여호수아홀(지하1층)', null, '교육부서', 16),
  ('고등부', '주일 오전 9:30', '여호수아홀(지하1층)', null, '교육부서', 17),
  ('청년부', '주일 오후 2:00', '본당(3층)', null, '교육부서', 18);

insert into public.bulletins (service_date, sermon_title, preacher, scripture, weekly_verse, order_items, notices) values
  (
    date_trunc('week', current_date)::date - 1,
    '흔들리지 않는 기초',
    '공진수 담임목사',
    '마태복음 7:24-27',
    '그러므로 누구든지 나의 이 말을 듣고 행하는 자는 그 집을 반석 위에 지은 지혜로운 사람 같으리니 (마 7:24)',
    '[{"title":"예배의 부름","detail":"시편 100:1-5 / 인도자"},
      {"title":"찬송","detail":"찬송가 43장"},
      {"title":"신앙고백","detail":"사도신경 / 다같이"},
      {"title":"성경봉독","detail":"마태복음 7:24-27"},
      {"title":"말씀","detail":"«흔들리지 않는 기초» / 공진수 담임목사"},
      {"title":"축도","detail":"공진수 담임목사"}]'::jsonb,
    '["다음 주일은 성찬식이 있습니다.", "새가족 환영회가 예배 후 2층 사랑방에서 있습니다."]'::jsonb
  );

insert into public.announcements (title, body, category, author, pinned) values
  ('여름 수련회 신청 안내', '7월 18일(금)~20일(주일) 평창 새생명수양관에서 진행합니다. 신청은 각 소그룹 리더에게 해 주세요.', '행사', '교육부', true),
  ('새가족 환영회 안내', '이번 주일 2부 예배 후 2층 사랑방에서 새가족 환영회가 있습니다.', '공지', '새가족부', true),
  ('주차장 보수 공사 안내', '지하주차장 공사로 2주간 지하 주차가 어렵습니다. 인근 공영주차장을 이용해 주세요.', '공지', '관리부', false);

insert into public.sermons (title, preacher, scripture, preached_on, series, media_type, media_url, summary) values
  ('흔들리지 않는 기초', '공진수 담임목사', '마태복음 7:24-27', date_trunc('week', current_date)::date - 1, '산상수훈', 'video', 'https://www.youtube.com/@mychmedia', '차이를 만드는 것은 환경이 아니라 무엇 위에 서 있느냐입니다.'),
  ('새벽을 깨우는 기도', '공진수 담임목사', '마가복음 1:35', current_date - 11, '기도학교', 'audio', 'https://download.samplelib.com/mp3/sample-15s.mp3', '기도는 하루의 방향을 정하는 일입니다.');

insert into public.prayer_requests (title, body, author, anonymous, pray_count) values
  ('어머니 수술을 앞두고 기도 부탁드립니다', '다음 주 화요일 수술이 있습니다. 회복을 위해 함께 기도해 주세요.', '박소영', false, 24),
  ('진로를 놓고 지혜를 구합니다', '이직을 두고 고민 중입니다. 하나님의 뜻을 분별하도록 기도 부탁드려요.', '익명', true, 12);

insert into public.small_groups (name, leader, meeting_info, description, member_count) values
  ('청년부 · 반석', '한지훈 리더', '매주 금요일 오후 8시 · 교육관 2층', '20~30대 청년들이 말씀과 삶을 나누는 모임입니다.', 14),
  ('주부 목장 · 뜰안', '오정민 권사', '매주 화요일 오전 10시 · 2층 사랑방', '자녀 양육과 일상의 고민을 함께 나눕니다.', 9),
  ('장년 성경공부 · 새벽별', '서동원 장로', '매주 수요일 예배 후 · 소예배실', '성경을 통독하며 깊이 묵상하는 모임입니다.', 21);

-- 특정 사용자를 관리자로 지정하려면 (가입 후 실행):
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'admin@example.com');

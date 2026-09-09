const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const DIR = __dirname;
const SHOTS = path.join(DIR, 'shots');

// 인라인 마크업: **굵게**, [칩]
function fmt(s) {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\[\[([^\]]+)\]\]/g, '<span class="chip">$1</span>');
}
function desc(items) {
  return items.map((it) => {
    if (it.h) return `<div class="dhead">${fmt(it.h)}</div>`;
    return `<div class="ditem"><span class="chev">›</span><span>${fmt(it.t)}</span></div>`;
  }).join('');
}
function tip(html) { return `<div class="tip">${fmt(html)}</div>`; }
function phone(src, cap) { return `<div class="shotwrap"><img class="phone" src="${src}"><div class="cap">${cap}</div></div>`; }
function phones(list) {
  return `<div class="shotsrow">${list.map((p) => `<div class="mini"><img src="${p.src}"><div class="cap">${p.cap}</div></div>`).join('')}</div>`;
}
function section({ badge, color, kicker, title, body }) {
  return `<div class="section">
    <div class="sechead">
      <div class="badge" style="background:${color}">${badge}</div>
      <div><div class="kicker">${kicker}</div><div class="title">${title}</div></div>
    </div>
    ${body}
  </div>`;
}

const NAVY = '#17405c', TEAL = '#3a9fb0', GOLD = '#9a7b3f', BROWN = '#7d6a4a', AMBER = '#c1863a';

const sections = [];

// 1. 시작하기
sections.push(section({ badge: '✦', color: NAVY, kicker: 'START', title: '시작하기',
  body: phone('welcome.png', '표어 시작 화면') + desc([
    { t: '앱을 처음 열면 **표어 시작 화면**이 나옵니다. 세 가지 중 하나를 고르세요.' },
    { h: '로그인 · 회원가입 · 손님' },
    { t: '**로그인** — 이미 가입한 계정(이메일·비밀번호)으로 들어갑니다.' },
    { t: '**회원가입** — 이름·이메일·비밀번호로 새로 가입합니다. 가입하면 나의 기도시간이 계정에 저장되어 기기를 바꿔도 이어집니다.' },
    { t: '**손님으로 둘러보기** — 가입 없이 바로 사용합니다. 대부분 기능은 손님으로도 쓸 수 있어요.' },
  ]) + tip('📱 **홈 화면에 앱처럼 설치**할 수 있어요. 크롬(안드로이드)은 [[⋮ → 앱 설치]], 아이폰 사파리는 [[공유 → 홈 화면에 추가]].') }));

// 2. 홈
sections.push(section({ badge: '🏠', color: NAVY, kicker: '아래 탭 · 홈', title: '홈',
  body: phone('home.png', '홈') + desc([
    { t: '교회의 소식을 한눈에 보는 첫 화면입니다.' },
    { h: '오늘의 말씀' },
    { t: '맨 위 배너에 **매일 바뀌는 성경 한 구절**이 나옵니다.' },
    { h: '이번 주 말씀 · 빠른 메뉴' },
    { t: '**이번 주 말씀** 카드를 누르면 최신 설교 영상으로 이동합니다.' },
    { t: '빠른 메뉴: [[실시간 예배]] [[이번 주 주보]] [[온라인 헌금]] [[기도 요청]] [[새가족 등록]]' },
    { h: '이번 주 예배 · 교회 소식 · 교회 안내' },
    { t: '**이번 주 예배** — 이번 주 주보를 바로 확인합니다.' },
    { t: '**교회 소식** — 공지를 옆으로 넘겨 보고, ‘더보기’로 전체 목록.' },
  ]) + tip('📡 교회 유튜브가 **실시간 방송 중**이면 ‘실시간 예배’에 **LIVE 배지**가 자동으로 켜집니다.') }));

// 3. 소식
sections.push(section({ badge: '📣', color: TEAL, kicker: '아래 탭 · 소식', title: '소식',
  body: phone('news.png', '소식') + desc([
    { t: '교회의 공지사항과 소식을 모아 보는 곳입니다.' },
    { t: '목록에서 제목을 누르면 **자세한 내용**을 볼 수 있어요.' },
    { t: '**공지 · 행사 · 소식**으로 분류되고, 맨 위가 가장 최근입니다.' },
  ]) }));

// 4. 설교 (유튜브 자동 연동)
sections.push(section({ badge: '▶', color: TEAL, kicker: '아래 탭 · 설교', title: '설교 (유튜브 자동 연동)',
  body: phone('sermons.png', '설교 — 카테고리 자동 분류') + desc([
    { t: '교회 유튜브 채널 영상이 **자동으로** 나타납니다. (URL 복사·붙여넣기 불필요)' },
    { t: '제목을 읽어 **카테고리로 자동 분류**해요: [[주일예배]] [[새벽예배]] [[수요예배]] [[금요집회]] [[찬양]] [[쇼츠]]' },
    { t: '위쪽 **카테고리 칩**으로 원하는 종류만 골라 보고, 항상 **최신순**으로 정렬됩니다.' },
    { t: '누르면 **유튜브 영상을 앱 안에서 바로** 시청합니다. (쇼츠는 세로 화면)' },
    { t: '홈 화면 **‘이번 주 말씀’**에도 채널의 **가장 최신 영상**이 자동으로 표시됩니다.' },
  ]) + tip('🛠 관리자는 설교 등록 화면의 **‘유튜브에서 불러오기’** 로 영상을 골라 제목·날짜·주소를 자동으로 채우고, 설교자·본문만 더하면 됩니다.') }));

// 5. 기도 (개편)
sections.push(section({ badge: '🙏', color: NAVY, kicker: '아래 탭 · 기도', title: '기도',
  body: phones([{ src: 'prayer_personal.png', cap: '기도 — 개인 (달성률·달력)' }, { src: 'prayer_bottom.png', cap: '기도 — 그래프·타이머·바로가기' }]) + desc([
    { t: '나의 기도시간을 기록하고 한눈에 봅니다. 화면 위 **개인 · 공동** 토글로 전환해요.' },
    { h: '한눈에 보는 기도 (개인)' },
    { t: '**달성률 게이지** — 이번 주 목표 대비 기도 시간. 목표는 [[−]] [[+]] 로 조정해요.' },
    { t: '**나의 기도 기록(달력)** — 기도한 날은 초록 동그라미(오래 기도할수록 진해요), 오늘은 테두리 표시. **연속 일수**도 함께.' },
    { t: '**최근 10일 평균** — 막대 그래프로 흐름을 봅니다.' },
    { h: '기도 시간 입력' },
    { t: '**기도 시작**을 누르면 타이머가 돌고, **마치고 기록하기**로 시간이 저장됩니다. 실제 경과 시간이 **정확히 분 단위**로 기록돼요.' },
    { t: '[[+5분]] [[+10분]] [[+30분]] 버튼으로 바로 더할 수도 있어요.' },
    { h: '바로가기' },
    { t: '**개인 기도제목 · 기도 요청 · 기도 알림**으로 바로 이동합니다.' },
  ]) + tip('💡 로그인하면 나의 기도시간이 **계정에 저장**되어 다른 기기에서도 이어집니다. (손님은 이 기기에만 저장)') }));

// 6. 공동 기도
sections.push(section({ badge: '👥', color: NAVY, kicker: '기도 · 공동', title: '공동 기도',
  body: phone('prayer_communal.png', '기도 — 공동') + desc([
    { t: '온 성도가 함께 정한 **공동 기도제목**으로 기도하고, 내가 참여한 시간을 기록합니다.' },
    { t: '맨 위에 **온 성도가 함께 기도한 시간(전체 누적)**이 표시됩니다.' },
    { t: '각 제목의 **이 제목으로 기도**를 누르면 타이머가 돌고, 마치면 그 시간이 **전체 누적에 계속 쌓입니다.**' },
  ]) }));

// 7. 기도 알림 (3개까지)
sections.push(section({ badge: '🔔', color: AMBER, kicker: '기도 · 새 기능', title: '기도 알림 (최대 3개)',
  body: phone('reminders.png', '기도 알림 · 한 사람당 3개까지') + desc([
    { t: '정한 **요일과 시간**에 “기도할 시간이에요 🙏” 알림을 휴대폰으로 받습니다.' },
    { h: '켜는 방법' },
    { t: '기도 탭 → **기도 알림**으로 들어가 위쪽 **기도 알림 받기**를 켜고 권한을 **허용**합니다.' },
    { t: '알림마다 **요일**(여러 개 가능)을 켜고, **시간**은 [[오전]]/[[오후]] · **시(1~12)** · **분(00~59)** 으로 정합니다.' },
    { h: '한 사람당 최대 3개' },
    { t: '**알림 추가**를 누르면 새벽·점심·저녁처럼 **서로 다른 시간의 알림을 최대 3개**까지 만들 수 있어요. (예: 새벽 5:30 · 점심 12:00 · 밤 9:00)' },
    { t: '알림 오른쪽 위 **휴지통**으로 지우고, 다 정했으면 **이 설정으로 저장**을 누릅니다.' },
    { t: '**테스트 알림 보내기**로 알림이 잘 뜨는지 바로 확인할 수 있어요.' },
  ]) + tip('· 안드로이드/PC는 브라우저에서 바로 옵니다. · 아이폰은 **사파리 → 홈 화면에 추가**로 설치한 앱에서 열어야 알림이 옵니다. · 알림은 **기기마다** 따로 켜 주세요.') }));

// 8. 소통방 (비공개 소그룹)
sections.push(section({ badge: '💬', color: TEAL, kicker: '아래 탭 · 소통방', title: '소통방 (초대제 대화방)',
  body: phones([
    { src: 'groups.png', cap: '내 소통방 목록' },
    { src: 'group_room.png', cap: '소통방 대화' },
    { src: 'group_members.png', cap: '멤버·초대·알림' },
  ]) + desc([
    { t: '소그룹(구역·목장)별 **비공개 대화방**입니다. **초대된 멤버만** 입장·대화할 수 있고, 대화 내용도 멤버끼리만 보입니다.' },
    { h: '누가 무엇을 하나요' },
    { t: '**관리자**가 소통방을 만들고, 앱에 가입한 성도 중에서 **리더를 지정**합니다.' },
    { t: '**리더**는 방 오른쪽 위 [[사람 아이콘]] → **멤버 초대**에서 성도 이름을 검색해 초대합니다.' },
    { t: '초대받은 멤버가 방에 들어와 **대화**하고, 필요하면 **소통방 나가기**도 할 수 있어요.' },
    { h: '새 글 알림 (개인별)' },
    { t: '방의 **사람 아이콘 → 이 소통방 알림**을 켜면, 새 글이 올라올 때 **앱을 닫아 두어도** 알림을 받습니다. **방마다 각자** 켜고 끌 수 있어요.' },
  ]) + tip('🔒 초대되지 않은 분에게는 소통방이 **아예 보이지 않습니다.** 초대는 앱에 **가입(로그인)한 적이 있는** 성도만 검색됩니다.') }));

// 9. 교회 안내 · 기타
sections.push(section({ badge: '⛪', color: GOLD, kicker: '홈 · 교회 안내', title: '교회 안내 · 기타 화면',
  body: phones([
    { src: 'services.png', cap: '예배 안내' }, { src: 'staff.png', cap: '섬기는 사람들' },
    { src: 'location.png', cap: '교회 주소' }, { src: 'giving.png', cap: '헌금 안내' },
    { src: 'bulletins.png', cap: '주보' }, { src: 'new_family.png', cap: '새가족 등록' },
  ]) + desc([
    { t: '**예배 안내** — 주일·새벽·교육부서 예배 시간표를 봅니다.' },
    { t: '**섬기는 사람들** — 교역자·직분자를 목사·전도사·장로 등으로 소개합니다.' },
    { t: '**교회 주소** — 카카오맵·네이버지도·구글지도 길찾기, 주소 복사, 전화 걸기가 됩니다.' },
    { t: '**헌금 안내** — 헌금 계좌를 안내하고, 계좌번호를 복사할 수 있어요.' },
    { t: '**주보** — 이번 주 주보 이미지를 보고, 지난 주보도 목록에서 찾아봅니다.' },
    { t: '**새가족 등록** — 처음 오신 분이 이름·연락처 등을 남기면 담당자에게 전달됩니다.' },
  ]) }));

// 10. 개인 기도제목 · 기도 요청
sections.push(section({ badge: '🌸', color: NAVY, kicker: '기도 · 기도제목 나눔', title: '개인 기도제목 · 기도 요청',
  body: phones([{ src: 'prayer_topics.png', cap: '개인 기도제목' }, { src: 'prayer_requests.png', cap: '기도 요청 · 기도노트' }]) + desc([
    { h: '개인 기도제목' },
    { t: '**나만 보는** 기도제목을 적고 관리합니다. **기도제목 추가**로 새 제목을 적어요. (익명 여부 선택 가능)' },
    { t: '카드 오른쪽 위 [[✎ 연필]]을 누르면 **제목·내용을 수정**하거나 **삭제**할 수 있어요.' },
    { t: '응답되면 **기도 응답되었어요**로 표시하고, **기도 요청으로 올리기**로 성도들과 나눌 수 있어요.' },
    { h: '기도 요청 · 우리의 기도노트' },
    { t: '맨 위 **우리의 기도노트**에 “하나님께서 우리 삶에서 일하고 계십니다.”와 함께 **기도제목·기도 중·응답됨·함께 기도** 현황이 한눈에 모입니다.' },
    { t: '성도들이 [[함께 기도]]를 눌러 함께 기도하고, 응답된 기도가 쌓이는 것을 **다 같이** 확인해요.' },
  ]) }));

// 11. 더보기(설정)
sections.push(section({ badge: '⋯', color: BROWN, kicker: '오른쪽 위 · 더보기', title: '더보기(설정)',
  body: phone('settings.png', '더보기(설정)') + desc([
    { t: '오른쪽 위 [[⋯]] 아이콘을 누르면 열립니다.' },
    { t: '**로그인 / 로그아웃** — 계정으로 로그인하거나 로그아웃합니다.' },
    { t: '**교회 정보** — 담임목사·주소·전화·이메일·헌금·유튜브 등을 한곳에서 확인.' },
    { t: '예배 안내·섬기는 사람들·교회 주소·새가족 등록으로도 이동합니다.' },
  ]) + tip('🔒 손님으로 쓰다가 **로그인**하려면 여기 **더보기 → 로그인**에서 하면 됩니다.') }));

// 12. 관리자
sections.push(section({ badge: '🛠', color: NAVY, kicker: '관리자 전용', title: '관리자 기능',
  body: phones([
    { src: 'admin_home.png', cap: '관리자 홈 · 관리 현황' }, { src: 'admin_members.png', cap: '가입자 현황 · 삭제' }, { src: 'admin_announcement.png', cap: '공지 작성 화면' }, { src: 'admin_newfamilies.png', cap: '새가족 명단' },
  ]) + desc([
    { t: '**관리자 계정**으로 로그인하면, 각 화면에서 내용을 직접 등록·수정할 수 있어요.' },
    { t: '**더보기 → 관리자 화면 열기**에서 전체 관리로 들어갑니다. 맨 위 **관리 현황**에서 주보·공지·소통방·가입자·설교 개수를 한눈에 봅니다.' },
    { t: '주보·공지(소식)·설교·섬기는 사람들·공동 기도제목을 **추가·수정·삭제**.' },
    { h: '가입자 현황·삭제' },
    { t: '관리 현황의 **가입자** 숫자를 누르면 **가입자 명단**(이름·역할·가입일)이 열립니다.' },
    { t: '각 성도의 **휴지통**으로 계정을 **삭제**할 수 있어요. (계정·개인 기록이 함께 삭제, 본인 계정은 삭제 불가)' },
    { h: '소통방 만들기' },
    { t: '**소통방 → 새로 등록**에서 방을 만들고, 성도를 검색해 **리더를 지정**합니다. 이후 초대·대화는 리더와 멤버가 진행합니다.' },
    { t: '새가족 등록 명단은 **관리자만** 볼 수 있어요.' },
  ]) + tip('🔑 관리자 권한이 필요하면 교회 담당자에게 문의해 주세요.') }));

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 12mm 11mm 13mm 11mm; }
  * { box-sizing: border-box; }
  body { font-family: "WenQuanYi Zen Hei", "Noto Sans CJK KR", sans-serif; color: #263238; margin: 0; font-size: 10pt; line-height: 1.55; }
  .cover { text-align: center; padding: 6px 0 14px; border-bottom: 3px solid ${NAVY}; margin-bottom: 16px; }
  .cover .logo { width: 60px; height: 60px; border-radius: 16px; background: #eef2f5; display:inline-flex; align-items:center; justify-content:center; font-size: 26px; }
  .cover h1 { font-size: 22pt; margin: 8px 0 2px; color: ${NAVY}; }
  .cover .sub { color: #7a8791; font-size: 10pt; }
  .intro { text-align:center; color:#5b6b76; font-size: 10.5pt; margin: 0 0 16px; }
  .section { border: 1.5px solid #ece5d6; border-radius: 20px; padding: 18px 20px 20px; margin-bottom: 18px; break-inside: avoid; background: #fff; }
  .sechead { display:flex; align-items:center; gap: 12px; margin-bottom: 12px; }
  .badge { width: 46px; height: 46px; border-radius: 13px; display:flex; align-items:center; justify-content:center; font-size: 22px; color:#fff; flex: 0 0 auto; }
  .kicker { color:#95a2ac; font-size: 8.6pt; font-weight:bold; letter-spacing: .3px; }
  .title { font-size: 16pt; font-weight: bold; color:#1f333f; }
  .shotwrap { text-align:center; margin: 6px 0 12px; }
  img.phone { width: 200px; border-radius: 16px; box-shadow: 0 4px 14px rgba(0,0,0,.12); border: 1px solid #edeef0; }
  .cap { color:#8a97a1; font-size: 9pt; margin-top: 6px; }
  .shotsrow { display:flex; flex-wrap:wrap; gap: 12px 14px; justify-content:center; margin: 6px 0 12px; }
  .mini { width: 150px; text-align:center; }
  .mini img { width: 150px; border-radius: 12px; box-shadow: 0 3px 10px rgba(0,0,0,.10); border:1px solid #edeef0; }
  .dhead { font-weight:bold; color:${NAVY}; font-size: 11pt; margin: 11px 0 5px; padding-left: 15px; position:relative; }
  .dhead::before { content:'●'; color:${TEAL}; position:absolute; left:0; font-size: 8pt; top: 3px; }
  .ditem { display:flex; gap: 7px; margin: 4px 0; padding-left: 4px; }
  .chev { color:${TEAL}; font-weight:bold; flex:0 0 auto; }
  .chip { display:inline-block; background:#eef1f4; border-radius:6px; padding: 0 7px; font-size: 8.8pt; color:#33505f; border:1px solid #e2e8ec; white-space:nowrap; }
  b { color:#173040; }
  .tip { background:#f6efe0; border-radius: 12px; padding: 9px 13px; font-size: 9.4pt; color:#6f5f3c; margin-top: 11px; line-height:1.6; }
  .tip .chip { background:#eee2c9; border-color:#e4d5b4; color:#6a5836; }
  .foot { text-align:center; color:#8a97a1; font-size: 9.5pt; margin-top: 8px; line-height:1.7; }
</style></head><body>
  <div class="cover"><div class="logo">⛪</div><h1>구리 목양교회 앱 사용설명서</h1><div class="sub">화면별 사용 안내 · 2026-09-09</div></div>
  <div class="intro">화면별로 어떻게 쓰는지 하나씩 안내해 드립니다.</div>
  ${sections.join('\n')}
  <div class="foot">구리 목양교회 · 031-551-1004<br>사용 중 궁금한 점은 교회 사무실로 문의해 주세요.</div>
</body></html>`;

fs.writeFileSync(path.join(SHOTS, 'manual.html'), html);

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('file://' + path.join(SHOTS, 'manual.html'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.pdf({ path: path.join(DIR, '구리목양교회_앱_사용설명서_스크린샷.pdf'), format: 'A4', printBackground: true,
    margin: { top: '12mm', bottom: '13mm', left: '11mm', right: '11mm' },
    displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="width:100%;font-size:8px;color:#9aa7b0;text-align:center;font-family:sans-serif;">구리 목양교회 앱 사용설명서 · <span class="pageNumber"></span>/<span class="totalPages"></span></div>' });
  await browser.close();
  console.log('PDF made');
})();

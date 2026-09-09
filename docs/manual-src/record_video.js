const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const DIR = __dirname;
const SHOTS = path.join(DIR, 'shots');
const OUTDIR = path.join(DIR, 'video');
fs.mkdirSync(OUTDIR, { recursive: true });

const NAVY = '#104C6E';
const D = 6500; // 기본 장면 길이(ms)

// 장면 구성 — 자주 쓰는 기능(기도 시간·알림·기도제목)은 더 자세히 + 더 길게
const scenes = [
  { type: 'title', ms: 5200, title: '구리 목양교회 앱', sub: '스마트폰으로 쉽고 편하게 사용하기' },
  { img: 'welcome.png', n: 1, t: '시작하기 · 설치', ms: D, points: [
    '처음 열면 표어 화면 → 로그인 / 회원가입 / 손님으로 둘러보기',
    '가입 없이 손님으로도 대부분 기능 사용 가능',
    '홈 화면에 추가하면 앱처럼 실행 (아이폰: 사파리 → 공유 → 홈 화면에 추가)',
  ] },
  { img: 'home.png', n: 2, t: '홈 화면', ms: 7800, points: [
    "맨 위 '오늘의 말씀' — 매일 바뀌는 성경 한 구절",
    "'이번 주 말씀'은 교회 유튜브 채널 최신 영상이 자동 표시",
    '빠른 메뉴: 실시간예배 · 주보 · 온라인헌금 · 기도요청 · 새가족',
    '방송 중이면 실시간 예배에 LIVE 배지 자동 표시',
  ] },
  { img: 'news.png', n: 3, t: '소식', ms: D, points: [
    '공지 · 행사 · 소식을 한곳에 모아 봐요',
    '제목을 누르면 자세한 내용 확인',
    '맨 위가 가장 최근 소식',
  ] },
  { img: 'sermons.png', n: 4, t: '설교 · 유튜브 자동', ms: 8000, points: [
    '교회 유튜브 채널 영상이 자동으로 올라와요 (등록 불필요)',
    '주일·새벽·수요·금요·찬양·쇼츠로 자동 분류',
    '위쪽 카테고리 칩으로 골라 보고, 항상 최신순',
    '누르면 앱 안에서 바로 재생 (쇼츠는 세로 화면)',
  ] },
  { img: 'prayer_personal.png', n: 5, t: '기도 · 나의 기록', ms: 7800, points: [
    "화면 위에서 '개인'과 '공동' 기도를 전환",
    '달성률 게이지 — 이번 주 기도 목표를 몇 % 채웠는지',
    '달력에 기도한 날이 초록색, 오래 기도할수록 진하게',
    "며칠 연속 기도했는지 '연속 일수'도 표시",
  ] },
  { img: 'prayer_bottom.png', n: 6, t: '기도 · 시간 기록', ms: 8500, points: [
    "'기도 시작'을 누르면 타이머가 흐르고, 마치면 '마치고 기록하기'",
    '실제 기도한 시간이 분 단위로 정확히 저장돼요',
    '짧게 기도했다면 +5분 / +10분 / +30분 버튼으로 간단히 추가',
    "'오늘 기도 기록 지우기'로 잘못 기록한 것 삭제",
    '최근 10일 평균을 막대그래프로 확인',
  ] },
  { img: 'prayer_topics.png', n: 7, t: '기도제목 · 기도 요청', ms: 8500, points: [
    '개인 기도제목: 나만 보는 기도제목을 적고 관리',
    "새 제목을 올릴 때 '익명'으로도 가능",
    "연필(✎) 아이콘으로 제목·내용을 '수정'하거나 '삭제'",
    "'기도 요청'으로 올리면 성도들이 '함께 기도'로 마음을 보태요",
    "'우리의 기도노트'에서 기도 중·응답됨 현황을 다 함께 확인",
  ] },
  { img: 'reminders.png', n: 8, t: '기도 알림 · 3개까지', ms: 9500, points: [
    "'기도 알림 받기'를 켜고 알림을 '허용'",
    '기도할 요일을 여러 개 선택 (일~토)',
    '오전/오후 → 시(1~12) → 분(00~59) 순서로 시간 지정',
    "'알림 추가'로 새벽·점심·저녁 등 최대 3개까지 설정",
    "'이 설정으로 저장' → 정한 시간마다 '기도할 시간이에요 🙏' 알림",
  ] },
  { img: 'group_room.png', n: 9, t: '소통방 · 초대제 대화방', ms: 9000, points: [
    '소그룹(구역·목장)별 비공개 대화방이에요',
    '관리자가 방을 만들고 리더를 지정 → 리더가 멤버를 초대',
    '초대된 멤버만 입장·대화 (오른쪽 위 사람 아이콘에서 멤버·초대)',
    "'이 소통방 알림'을 켜면 새 글이 올라올 때 앱을 닫아도 알림",
  ] },
  { img: 'bulletins.png', n: 10, t: '주보', ms: D, points: [
    '이번 주 주보 이미지를 바로 확인',
    '지난 주보도 목록에서 다시 보기',
  ] },
  { img: 'giving.png', n: 11, t: '헌금 안내', ms: 7500, points: [
    '계좌번호를 한 번에 복사',
    "입금 시 '헌금 종류 첫 글자 + 성명 + 생년' 기재",
    '예: 주정헌금 · 김믿음 · 1976  →  주김믿음76',
  ] },
  { img: 'settings.png', n: 12, t: '로그인 · 더보기', ms: D, points: [
    '오른쪽 위 ⋯(더보기)에서 로그인 / 로그아웃',
    '로그인하면 나의 기도 기록이 계정에 저장 → 기기를 바꿔도 유지',
    '교회 정보(전화 · 지도 · 유튜브 · 헌금)를 한곳에서',
  ] },
  { type: 'title', ms: 5500, title: '함께 기도하고,\n함께 자라가요 🙏', sub: '구리 목양교회' },
];

const scenesJson = JSON.stringify(scenes);

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:1280px; height:720px; overflow:hidden; font-family:"WenQuanYi Zen Hei","Noto Sans CJK KR",sans-serif; }
  #stage { position:relative; width:1280px; height:720px; background:linear-gradient(135deg,#f5efe3,#e9dfce); }
  #header { position:absolute; top:0; left:0; right:0; height:66px; background:${NAVY}; display:flex; align-items:center; padding:0 32px; z-index:5; }
  #header .mk { width:40px; height:40px; border-radius:10px; margin-right:12px; object-fit:cover; background:#fff; }
  #header .tt { color:#fff; font-weight:bold; font-size:20px; letter-spacing:.5px; }
  #header .tt small { color:#cfe0ea; font-weight:normal; font-size:15px; margin-left:8px; }
  #content { position:absolute; top:66px; left:0; right:0; bottom:0; }
  #phoneWrap { position:absolute; left:96px; top:26px; width:286px; height:600px; }
  #phone { width:286px; height:600px; border-radius:32px; background:#0d0d0d; padding:11px; box-shadow:0 18px 46px rgba(0,0,0,.28); }
  #screen { position:relative; width:100%; height:100%; border-radius:23px; overflow:hidden; background:#fff; }
  #screen img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; opacity:0; transition:opacity .55s ease; }
  #screen img.on { opacity:1; }
  #cap { position:absolute; left:452px; right:56px; top:0; bottom:0; display:flex; flex-direction:column; justify-content:center; }
  #cap .chip { align-self:flex-start; background:${NAVY}; color:#fff; font-weight:bold; font-size:15px; padding:5px 15px; border-radius:999px; margin-bottom:14px; }
  #cap h1 { color:#12303f; font-size:38px; line-height:1.2; margin-bottom:18px; }
  #cap ul { list-style:none; }
  #cap li { position:relative; color:#38505c; font-size:21px; line-height:1.45; padding-left:26px; margin:11px 0; }
  #cap li::before { content:''; position:absolute; left:2px; top:10px; width:9px; height:9px; border-radius:50%; background:#3a9fb0; }
  #cap.in .chip { animation:rise .5s ease both; }
  #cap.in h1 { animation:rise .5s ease .06s both; }
  #cap.in li { animation:rise .5s ease both; }
  #cap.in li:nth-child(1){animation-delay:.12s} #cap.in li:nth-child(2){animation-delay:.19s}
  #cap.in li:nth-child(3){animation-delay:.26s} #cap.in li:nth-child(4){animation-delay:.33s}
  #cap.in li:nth-child(5){animation-delay:.40s} #cap.in li:nth-child(6){animation-delay:.47s}
  @keyframes rise { from{opacity:0; transform:translateY(16px)} to{opacity:1; transform:translateY(0)} }
  #title { position:absolute; inset:0; display:none; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:0 80px; z-index:10; background:linear-gradient(135deg,#f5efe3,#e9dfce); }
  #title img.logo { width:130px; height:130px; border-radius:30px; margin-bottom:26px; box-shadow:0 16px 36px rgba(16,76,110,.30); }
  #title h1 { color:#12303f; font-size:50px; line-height:1.28; white-space:pre-line; }
  #title .sub { color:#6b7785; font-size:25px; margin-top:16px; }
  #title.in img.logo { animation:rise .6s ease both; }
  #title.in h1 { animation:rise .6s ease .08s both; }
  #title.in .sub { animation:rise .6s ease .16s both; }
  #barwrap { position:absolute; left:0; right:0; bottom:0; height:6px; background:rgba(16,76,110,.12); z-index:20; }
  #bar { height:100%; width:0; background:${NAVY}; }
</style></head><body>
<div id="stage">
  <div id="header"><img class="mk" src="app-icon.png"><div class="tt">구리 목양교회 앱 사용 안내<small id="hstep"></small></div></div>
  <div id="content">
    <div id="phoneWrap"><div id="phone"><div id="screen"><img id="imgA"><img id="imgB"></div></div></div>
    <div id="cap"><span class="chip"></span><h1></h1><ul></ul></div>
  </div>
  <div id="title"><img class="logo" src="app-icon.png"><h1></h1><div class="sub"></div></div>
  <div id="barwrap"><div id="bar"></div></div>
</div>
<script>
  const scenes = ${scenesJson};
  const content=document.getElementById('content'), titleEl=document.getElementById('title');
  const cap=document.getElementById('cap'), chip=cap.querySelector('.chip'), capH=cap.querySelector('h1'), capUl=cap.querySelector('ul');
  const hstep=document.getElementById('hstep'), imgs=[document.getElementById('imgA'),document.getElementById('imgB')], bar=document.getElementById('bar');
  let layer=0;
  function runBar(ms){ bar.style.transition='none'; bar.style.width='0'; void bar.offsetWidth; bar.style.transition='width '+ms+'ms linear'; bar.style.width='100%'; }
  function show(i){
    const s=scenes[i]; runBar(s.ms);
    if(s.type==='title'){
      content.style.display='none'; titleEl.style.display='flex'; hstep.textContent='';
      titleEl.querySelector('h1').textContent=s.title; titleEl.querySelector('.sub').textContent=s.sub;
      titleEl.classList.remove('in'); void titleEl.offsetWidth; titleEl.classList.add('in');
    } else {
      titleEl.style.display='none'; content.style.display='block';
      const cur=imgs[layer], next=imgs[1-layer];
      next.onload=()=>{ next.style.animation='kb '+s.ms+'ms linear'; next.classList.add('on'); cur.classList.remove('on'); };
      next.src=s.img; if(next.complete) next.onload(); layer=1-layer;
      hstep.textContent=' · '+s.t; chip.textContent='STEP '+s.n; capH.textContent=s.t;
      capUl.innerHTML=s.points.map(p=>'<li>'+p+'</li>').join('');
      cap.classList.remove('in'); void cap.offsetWidth; cap.classList.add('in');
    }
  }
  // Ken Burns 키프레임 동적 등록
  const st=document.createElement('style'); st.textContent='@keyframes kb{from{transform:scale(1)}to{transform:scale(1.05)}}'; document.head.appendChild(st);
  let i=0; show(0);
  function next(){ i++; if(i>=scenes.length){ window.__done=true; return; } show(i); setTimeout(next, scenes[i].ms); }
  setTimeout(next, scenes[0].ms);
</script>
</body></html>`;

fs.writeFileSync(path.join(SHOTS, 'player.html'), html);
const TOTAL_MS = scenes.reduce((a, s) => a + s.ms, 0) + 1200;

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: OUTDIR, size: { width: 1280, height: 720 } } });
  const page = await ctx.newPage();
  await page.goto('file://' + path.join(SHOTS, 'player.html'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(TOTAL_MS);
  const video = page.video();
  await ctx.close();
  const p = await video.path();
  await browser.close();
  fs.writeFileSync(path.join(OUTDIR, 'webm_path.txt'), p);
  console.log('WEBM:', p, 'TOTAL_MS:', TOTAL_MS);
})();

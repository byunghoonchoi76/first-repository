# 교회 앱 (Church App)

주보·공지·설교·기도·소그룹을 한 곳에서 볼 수 있는 교회 공동체 앱입니다.
**Expo(React Native)** 한 코드베이스로 **iOS · Android · 웹**을 모두 지원합니다.

## 무엇이 들어 있나요

| 화면 | 내용 |
| --- | --- |
| 홈 | 이번 주 말씀, 빠른 메뉴, 이번 주 예배, 나의 기도 요약, 예배 시간 안내, 최근 소식·설교 |
| 주보 | 예배 순서·광고와 함께, 홈페이지에 올린 주보 원본 이미지(JPG/PNG·PDF)를 그대로 보기 |
| 소식 | 공지 / 행사 / 소식 분류, 상단 고정, 상세 보기 |
| 설교 | 시리즈·쇼츠별 목록, 상세 화면에서 유튜브 영상을 앱 안에서 바로 재생 (쇼츠는 세로 화면) |
| 기도 | 기도 타이머와 빠른 기록, 연속 일수·최근 7일 그래프, 기도제목 나눔(익명 가능)과 &lsquo;함께 기도&rsquo; |
| 소그룹 | 소그룹 목록과 소통방(채팅) |
| 예배 안내 | 예배(새벽·주일 1~3부·저녁 찬양·MBA·수요·금요)와 교육부서 예배 시간표 |
| 더보기 | 로그인/로그아웃, 교회 정보(전화·지도·이메일·유튜브 채널 바로 연결), 데이터 모드 |
| 관리자 | 주보·공지·설교 등록/수정/삭제 (관리자 계정만) |

## 바로 실행하기

```bash
npm install
npm start          # QR 코드로 Expo Go 에서 열기
npm run web        # 브라우저에서 열기
npm run ios        # iOS 시뮬레이터 (macOS)
npm run android    # Android 에뮬레이터
```

설치 직후에는 **샘플 데이터 모드**로 동작하므로 서버 없이 모든 화면을 바로 볼 수 있습니다.
관리자 화면을 보려면 더보기 → 로그인 → 이름 입력 후 **관리자로 시작**을 누르세요.
주보는 관리자 화면에서 매주 등록할 수 있습니다. 예배 순서와 광고는 줄 단위로 추가·삭제되며,
가장 최근 예배 날짜의 주보가 홈 화면에 표시됩니다.
교회가 주보를 이미지(JPG)나 PDF로 만들어 홈페이지에 올린다면, 그 주소를 '주보 원본' 에 넣으면
앱에서 원본을 그대로 볼 수 있습니다 (이미지는 앱 안에서 바로, PDF 는 열기 버튼으로).
샘플 모드에서 추가·수정한 내용은 그 기기에만 저장됩니다(더보기 → 샘플 데이터 초기화로 되돌릴 수 있습니다).

## 실제 데이터 연결하기 (Supabase)

1. [supabase.com](https://supabase.com) 에서 프로젝트를 만듭니다.
2. SQL Editor 에 `supabase/schema.sql` 전체를 붙여넣고 실행합니다. 이어서 `supabase/seed.sql` 을 실행하면 예시 데이터가 들어갑니다.
3. `.env.example` 을 `.env` 로 복사하고 값을 채웁니다.

   ```bash
   cp .env.example .env
   # EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   # EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

4. 개발 서버를 다시 시작하면 앱이 자동으로 Supabase 모드로 전환됩니다.
   (더보기 → 앱 정보에서 현재 모드를 확인할 수 있습니다.)
5. 관리자 지정: 해당 계정으로 가입한 뒤 SQL Editor 에서 실행합니다.

   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'admin@example.com');
   ```

RLS 정책은 &lsquo;읽기는 누구나, 쓰기는 로그인 사용자, 공지·설교 관리는 관리자&rsquo; 로 설정되어 있습니다.

## 배포

**웹** — 정적 파일로 내보낸 뒤 아무 정적 호스팅(Vercel, Netlify, Cloudflare Pages 등)에 올리면 됩니다.

```bash
npm run build:web   # dist/ 생성 (PWA 태그·404.html·.nojekyll 포함)
```

휴대폰 브라우저에서 열고 '홈 화면에 추가' 하면 아이콘이 생기고 주소창 없이 앱처럼 실행됩니다.

`app.json` 의 `web.output` 은 `single`(SPA)입니다. 모든 경로를 `index.html` 로 보내는
SPA 리라이트 설정이 필요하며, 대부분의 호스팅은 기본으로 지원합니다.
공지 페이지의 검색 노출(SEO)이 필요하면 `static` 으로 바꿔 사전 렌더링할 수 있습니다.

**GitHub Pages 로 올리기** — 하위 경로(`/first-repository`)로 서비스되므로 baseUrl 을 붙여 빌드합니다.

`npm run build:pages` 는 빌드 후 `scripts/finish-web-build.js` 를 실행해
PWA 태그(홈 화면 추가 시 앱처럼 실행), `404.html`(새로고침·딥링크 폴백),
`.nojekyll` 까지 자동으로 만들어 줍니다.

```bash
npm run build:pages                 # dist-pages/ 생성

# gh-pages 브랜치에 결과물만 올립니다 (소스는 개발 브랜치에 그대로 둡니다)
git worktree add --detach /tmp/ghpages
cd /tmp/ghpages && git checkout gh-pages && git rm -rf . -q
cp -a /경로/first-repository/dist-pages/. .
git add -A && git commit -m "웹 빌드 갱신" && git push origin gh-pages
```

저장소 Settings → Pages 에서 Source 를 `gh-pages` 브랜치 `/ (root)` 로 지정하면
`https://<계정>.github.io/first-repository/` 에서 열립니다.

**앱스토어 / 플레이스토어** — [EAS Build](https://docs.expo.dev/build/introduction/) 를 사용합니다.

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios       # 앱스토어용
eas build --platform android   # 플레이스토어용
eas submit --platform ios
```

`app.json` 의 `ios.bundleIdentifier` / `android.package` 값을 실제 교회 도메인 기준으로 바꾼 뒤 빌드하세요.

## 교회에 맞게 바꾸기

- `src/constants/church.ts` — 교회 이름, 표어, 담임목사, 주소, 연락처, 헌금 계좌
- `src/constants/theme.ts` — 교회 CI 색상(`Brand`)과 라이트/다크 팔레트
- `src/constants/logo.ts` — 공식 CI 연결 지점. `assets/images/목양교회 CI.png` 에서 잘라낸
  `logo-mark.png`(심볼)와 `logo-white.png`(심볼+흰색 교회명)를 씁니다.
  더 큰 원본을 받으면 같은 이름으로 교체하면 앱 전체에 반영됩니다.
- `src/components/church-logo.tsx` — 로고 심볼과 로고+교회명 조합
- `src/lib/data/sample-data.ts` — 샘플 모드에서 보이는 주보·공지·설교·기도제목·소그룹
- `app.json` — 앱 이름, 아이콘, 스플래시 색상(CI 남색 `#14496B`)
- `assets/images/` — 아이콘·스플래시 이미지

## 폴더 구조

```
src/
├─ app/                     화면 (expo-router 파일 기반 라우팅)
│  ├─ (tabs)/               홈 · 소식 · 설교 · 기도 · 소그룹 탭
│  ├─ services.tsx          예배 안내 (예배 · 교육부서)
│  ├─ admin/                관리자 화면 (주보·공지·설교 편집)
│  ├─ bulletin/[id].tsx     주보 상세
│  ├─ news/[id].tsx         공지 상세
│  ├─ sermons/[id].tsx      설교 상세
│  ├─ groups/[id].tsx       소그룹 소통방
│  ├─ prayer/new.tsx        기도제목 나누기
│  ├─ settings.tsx          더보기
│  └─ sign-in.tsx           로그인
├─ components/              화면 틀(Screen)과 공용 UI 조각
├─ constants/               교회 정보 · 디자인 토큰
├─ hooks/                   색상 모드 · 테마
└─ lib/
   ├─ auth.tsx              로그인 상태 (샘플 / Supabase 공용)
   ├─ prayer-log.ts         개인 기도시간 기록 (기기 저장)
   ├─ supabase.ts           Supabase 클라이언트
   └─ data/                 도메인 타입 + 샘플/Supabase 저장소
supabase/
├─ schema.sql               테이블 · RLS 정책 · 트리거
└─ seed.sql                 예시 데이터
```

화면 코드는 `ChurchRepository` 인터페이스만 사용합니다. 샘플 저장소와 Supabase 저장소가
같은 인터페이스를 구현하므로, 환경변수만으로 백엔드를 갈아 끼울 수 있습니다.

## 다음에 붙이면 좋은 것들

- 푸시 알림(`expo-notifications`)으로 새 공지·주보 알림
- 소그룹 대화 실시간 반영(Supabase Realtime, 지금은 5초마다 새로고침)
- 온라인 헌금 연동, 출석 체크, 성경 읽기표

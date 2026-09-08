# 사용설명서(스크린샷) 편집용 소스

`docs/pdf/구리목양교회_앱_사용설명서_스크린샷.pdf` 를 만드는 소스입니다.

## 구성
- `capture.js` — 앱을 실제로 띄워 화면별 스크린샷을 `shots/*.png` 로 저장 (Playwright + Chromium)
- `build_manual.js` — `shots/` 의 스크린샷과 설명 텍스트로 `shots/manual.html` 을 만들고 A4 PDF로 렌더링
- `shots/*.png` — 캡처된 앱 화면 (welcome, home, prayer_personal … reminders)
- `shots/manual.html` — 생성된 매뉴얼 HTML

## 다시 만들기 (화면이 바뀌었을 때)

```bash
# 1) 스크린샷 새로 촬영
#    - 일반 화면은 샘플 모드 빌드(dist), 기도 알림 화면은 Supabase 설정 빌드(dist-rem)가 필요합니다.
#    - .env 를 잠시 비활성화하면 샘플 모드로 빌드됩니다.
mv .env .env.bak && npx expo export --platform web --clear && node scripts/finish-web-build.js dist && mv .env.bak .env
EXPO_PUBLIC_SUPABASE_URL=https://demo.supabase.co EXPO_PUBLIC_SUPABASE_ANON_KEY=demo \
  npx expo export --platform web --output-dir dist-rem && node scripts/finish-web-build.js dist-rem
node docs/manual-src/capture.js /경로/dist /경로/dist-rem   # shots/*.png 생성

# 2) PDF 생성
node docs/manual-src/build_manual.js                        # docs/pdf/…스크린샷.pdf 갱신
```

> 텍스트만 고칠 때는 `build_manual.js` 안의 `sections` 내용을 수정하고 2)만 다시 실행하면 됩니다.
> 한글 폰트는 시스템의 WenQuanYi Zen Hei 를 사용합니다.

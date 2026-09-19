/**
 * 교회 기본 정보. 실제 교회에 맞게 이 파일만 고치면 앱 전체에 반영됩니다.
 * (Supabase 모드에서는 `church_profile` 테이블 값이 우선합니다.)
 *
 * 값이 빈 문자열이면 해당 항목은 화면에 표시되지 않습니다.
 */
export const ChurchInfo = {
  name: '구리 목양교회',
  slogan: '두려워하지 말라, 강하고 담대하라',
  sloganVerse: '신 31:6, 수 1:9',
  pastor: '공진수 담임목사',
  address: '경기도 구리시 장자호수길 67',
  phone: '031-551-1004',
  email: 'stewardk@hanmail.net',
  offeringAccount: '농협 382-01-017978',
  youtubeUrl: 'https://www.youtube.com/@mychmedia',
  // 온라인 헌금 주소(체리·카카오페이 송금 링크 등)를 넣으면 헌금 화면에 버튼이 생깁니다.
  givingUrl: '',
  // 네이버 플레이스(정확한 위치) 링크
  mapUrl: 'https://naver.me/5CCocDC6',
} as const;

/**
 * 교회 비전. 실제 교회의 비전/사명에 맞게 이 내용을 고쳐 주세요.
 * (아래는 표어를 바탕으로 한 예시입니다.)
 */
export const ChurchVision = {
  headline: '두려워하지 말라, 강하고 담대하라',
  verse: '신명기 31:6 · 여호수아 1:9',
  intro:
    '구리 목양교회는 하나님의 말씀 위에 굳게 서서, 강하고 담대하게 이 시대를 섬기는 교회입니다. 예배로 하나님을 높이고, 말씀으로 성장하며, 사랑으로 이웃을 섬깁니다.',
  points: [
    { icon: 'book-outline', title: '말씀 중심', desc: '날마다 말씀을 읽고 순종하며 살아가는 성도' },
    { icon: 'flame-outline', title: '예배와 기도', desc: '살아 있는 예배와 뜨거운 기도의 공동체' },
    { icon: 'people-outline', title: '사랑의 교제', desc: '서로 돌아보며 함께 자라가는 지체들' },
    { icon: 'heart-outline', title: '섬김과 전도', desc: '이웃을 섬기고 복음을 전하는 삶' },
  ],
} as const;

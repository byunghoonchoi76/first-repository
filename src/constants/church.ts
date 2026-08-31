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
} as const;

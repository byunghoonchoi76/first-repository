/**
 * 교회 기본 정보. 실제 교회에 맞게 이 파일만 고치면 앱 전체에 반영됩니다.
 * (Supabase 모드에서는 `church_profile` 테이블 값이 우선합니다.)
 *
 * 값이 빈 문자열이면 해당 항목은 화면에 표시되지 않습니다.
 * slogan 은 아직 확인되지 않은 임시 문구이니 실제 표어로 바꿔 주세요.
 */
export const ChurchInfo = {
  name: '구리 목양교회',
  slogan: '말씀으로 목양하고 사랑으로 세우는 공동체',
  pastor: '공진수 담임목사',
  address: '경기도 구리시 장자호수길 67',
  phone: '031-551-1004',
  email: 'stewardk@hanmail.net',
  offeringAccount: '',
  youtubeUrl: 'https://www.youtube.com/@mychmedia',
} as const;

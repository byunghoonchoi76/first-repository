/**
 * 교회 기본 정보. 실제 교회에 맞게 이 파일만 고치면 앱 전체에 반영됩니다.
 * 연락처·주소·계좌는 화면 확인용 예시 값이므로 실제 정보로 바꿔 주세요.
 * (Supabase 모드에서는 `church_profile` 테이블 값이 우선합니다.)
 */
export const ChurchInfo = {
  name: '구리 목양교회',
  slogan: '말씀으로 목양하고 사랑으로 세우는 공동체',
  pastor: '담임목사',
  address: '경기도 구리시 인창동 (주소를 입력해 주세요)',
  phone: '031-123-4567',
  email: 'hello@mokyang.church',
  offeringAccount: '농협 123456-78-901234 (예금주: 구리 목양교회)',
} as const;

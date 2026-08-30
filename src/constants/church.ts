/**
 * 교회 기본 정보. 실제 교회에 맞게 이 파일만 고치면 앱 전체에 반영됩니다.
 * (Supabase 모드에서는 `church_profile` 테이블 값이 우선합니다.)
 */
export const ChurchInfo = {
  name: '은혜로교회',
  slogan: '말씀 위에 함께 세워지는 공동체',
  pastor: '김은혜 담임목사',
  address: '서울특별시 마포구 성지길 12',
  phone: '02-123-4567',
  email: 'hello@graceway.church',
  offeringAccount: '국민은행 123456-78-901234 (예금주: 은혜로교회)',
} as const;

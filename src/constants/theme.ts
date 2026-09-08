/**
 * 앱 전역 색상 · 간격 · 폰트 토큰.
 * 라이트/다크 모드 값을 같은 키로 정의해 두고 `useTheme()` 으로 꺼내 씁니다.
 * 주요 색은 교회 CI(남색 + 청록)에서 가져왔습니다.
 */

import '@/global.css';

import { Platform } from 'react-native';

/** 교회 CI 색상. 로고와 앱 전체가 같은 색을 씁니다. */
export const Brand = {
  /** CI 원본에서 추출한 색입니다. */
  navy: '#104C6E',
  navyDark: '#0B3752',
  teal: '#1DAFC2',
  tealLight: '#63CAD8',
} as const;

export const Colors = {
  light: {
    text: '#2A2620',
    textSecondary: '#6C6355',
    textMuted: '#9C9384',
    background: '#F7F1E7',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#F0E7D6',
    card: '#FFFFFF',
    border: '#E9E0CF',
    primary: Brand.navy,
    onPrimary: '#FFFFFF',
    accent: '#C0894A',
    danger: '#C4453B',
    success: '#4F8A6B',
  },
  dark: {
    text: '#F3ECDF',
    textSecondary: '#B4AB99',
    textMuted: '#847B6B',
    background: '#17140F',
    backgroundElement: '#221E17',
    backgroundSelected: '#2E281E',
    card: '#221E17',
    border: '#332C22',
    primary: Brand.tealLight,
    onPrimary: '#17140F',
    accent: '#D8AE72',
    danger: '#E4776C',
    success: '#5CB98F',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** 히어로/배너에 쓰는 따뜻한 그라데이션과 사진 위 스크림 */
export const Gradients = {
  // 따뜻한 베이지→세이지 (사진이 없을 때 히어로 배경)
  warm: ['#8FA68E', '#6E8A79'] as const,
  // 사진 위에 얹어 글씨가 잘 보이게 하는 어두운 스크림
  scrim: ['transparent', 'rgba(20,16,10,0.72)'] as const,
  // CI 남색 카드용
  navy: ['#1B5A80', '#0E3F5C'] as const,
} as const;

export const Radius = {
  small: 8,
  medium: 14,
  large: 20,
  pill: 999,
} as const;

export const MaxContentWidth = 720;

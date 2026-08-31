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
    text: '#15181D',
    textSecondary: '#5C636E',
    textMuted: '#8A919C',
    background: '#F7F8FB',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E7F4F7',
    card: '#FFFFFF',
    border: '#E3E7EE',
    primary: Brand.navy,
    onPrimary: '#FFFFFF',
    accent: '#0E8FA0',
    danger: '#C4453B',
    success: '#2E7D5B',
  },
  dark: {
    text: '#F2F4F8',
    textSecondary: '#A9B0BC',
    textMuted: '#7C8494',
    background: '#0E1116',
    backgroundElement: '#171B22',
    backgroundSelected: '#17303C',
    card: '#171B22',
    border: '#2A303B',
    primary: Brand.tealLight,
    onPrimary: '#0E1116',
    accent: Brand.teal,
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

export const Radius = {
  small: 8,
  medium: 14,
  large: 20,
  pill: 999,
} as const;

export const MaxContentWidth = 720;

/**
 * 앱 전역 색상 · 간격 · 폰트 토큰.
 * 라이트/다크 모드 값을 같은 키로 정의해 두고 `useTheme()` 으로 꺼내 씁니다.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#15181D',
    textSecondary: '#5C636E',
    textMuted: '#8A919C',
    background: '#F7F8FB',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EDF1FB',
    card: '#FFFFFF',
    border: '#E3E7EE',
    primary: '#3B5BA5',
    onPrimary: '#FFFFFF',
    accent: '#C08A2E',
    danger: '#C4453B',
    success: '#2E7D5B',
  },
  dark: {
    text: '#F2F4F8',
    textSecondary: '#A9B0BC',
    textMuted: '#7C8494',
    background: '#0E1116',
    backgroundElement: '#171B22',
    backgroundSelected: '#20283A',
    card: '#171B22',
    border: '#2A303B',
    primary: '#8AA8F0',
    onPrimary: '#0E1116',
    accent: '#DDB86A',
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

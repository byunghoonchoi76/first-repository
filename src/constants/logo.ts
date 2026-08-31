import type { ImageSourcePropType } from 'react-native';

/**
 * 교회 공식 CI. `assets/images/목양교회 CI.png` 에서 잘라낸 이미지들입니다.
 *
 * - LogoMark  : 심볼만. 남색·청록이라 밝은 배경에서도 잘 보입니다.
 * - LogoWhite : 심볼 + 흰색 교회명. 남색 카드처럼 어두운 배경에서만 씁니다.
 *
 * 더 큰 원본(또는 벡터) 파일을 받으면 같은 이름으로 교체하면 됩니다.
 */
export const LogoMark: ImageSourcePropType = require('@/assets/images/logo-mark.png');
export const LogoWhite: ImageSourcePropType = require('@/assets/images/logo-white.png');

/** 심볼 원본 비율 (가로 / 세로) */
export const LogoMarkRatio = 36 / 42;
/** 가로형 로고 원본 비율 */
export const LogoWhiteRatio = 169 / 48;

/** ChurchMark 가 사용하는 이미지. null 이면 CI 색으로 그린 임시 도형을 씁니다. */
export const LogoSource: ImageSourcePropType | null = LogoMark;

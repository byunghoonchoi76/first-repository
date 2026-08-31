/**
 * 교회 공식 로고 파일 연결 지점.
 *
 * 사용법
 * 1. 로고 이미지를 `assets/images/logo.png` 로 저장합니다.
 *    (배경이 투명한 PNG 권장, 가로세로 512px 이상)
 * 2. 아래 `LogoSource` 의 주석을 바꿔 파일을 가리키게 합니다.
 *
 *      export const LogoSource: ImageSourcePropType | null = require('@/assets/images/logo.png');
 *
 * 그러면 홈 헤더 · 홈 화면 · 로그인 · 더보기의 심볼이 한 번에 실제 로고로 바뀝니다.
 * (파일을 넣기 전까지는 CI 색으로 그린 임시 심볼이 표시됩니다.)
 */
import type { ImageSourcePropType } from 'react-native';

export const LogoSource: ImageSourcePropType | null = null;

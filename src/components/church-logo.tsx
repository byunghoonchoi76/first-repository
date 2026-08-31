import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ChurchInfo } from '@/constants/church';
import { Brand, Spacing } from '@/constants/theme';

/**
 * 교회 CI. 지금은 CI 색(남색·청록)으로 그린 임시 심볼이며,
 * 공식 로고 파일을 받으면 `assets/images/logo.png` 로 넣고 아래 Mark 를
 * <Image source={require('@/assets/images/logo.png')} style={{ width: size, height: size }} />
 * 한 줄로 바꾸면 앱 전체(홈·로그인·더보기)에 한 번에 반영됩니다.
 */
export function ChurchMark({ size = 36, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  const u = size / 36;

  return (
    <View style={[styles.mark, { width: size, height: size }, style]}>
      {/* 왼쪽 기둥 (남색) */}
      <View
        style={{
          width: 7 * u,
          height: 17 * u,
          backgroundColor: Brand.navy,
          borderTopLeftRadius: 3 * u,
          borderTopRightRadius: 3 * u,
        }}
      />
      {/* 가운데 본당 : 지붕 + 몸통 (청록) */}
      <View style={styles.spire}>
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: 9 * u,
            borderRightWidth: 9 * u,
            borderBottomWidth: 10 * u,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: Brand.teal,
          }}
        />
        <View style={{ width: 13 * u, height: 16 * u, backgroundColor: Brand.teal }} />
      </View>
      {/* 오른쪽 기둥 (밝은 청록) */}
      <View
        style={{
          width: 7 * u,
          height: 13 * u,
          backgroundColor: Brand.tealLight,
          borderTopLeftRadius: 3 * u,
          borderTopRightRadius: 3 * u,
        }}
      />
    </View>
  );
}

/** 심볼 + 교회 이름을 함께 보여 주는 로고 잠금 형태 */
export function ChurchLogo({
  size = 32,
  color,
  subtitle,
}: {
  size?: number;
  color?: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.logoRow}>
      <ChurchMark size={size} />
      <View>
        <ThemedText type="heading" style={color ? { color } : undefined}>
          {ChurchInfo.name}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="caption" style={color ? { color, opacity: 0.85 } : undefined} themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 1 },
  spire: { alignItems: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});

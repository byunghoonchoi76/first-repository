import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Gradients, Radius } from '@/constants/theme';

/**
 * 사진 위에 글씨를 얹는 히어로/배너 카드.
 * - 사진 주소가 있으면 사진을 깔고, 못 불러오면 따뜻한 그라데이션이 그대로 보입니다.
 * - 글씨가 항상 잘 보이도록 아래쪽에 어두운 스크림을 얹습니다.
 */
export function HeroBanner({
  imageUrl,
  height = 180,
  base = 'warm',
  children,
  style,
}: {
  imageUrl?: string;
  height?: number;
  /** 사진이 없을 때 깔리는 바탕 그라데이션 */
  base?: keyof typeof Gradients;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const [imageOk, setImageOk] = useState(true);
  const showImage = Boolean(imageUrl) && imageOk;

  return (
    <View style={[styles.wrap, { height }, style]}>
      {/* 바탕: 따뜻한 그라데이션 (사진이 없거나 실패해도 예쁩니다) */}
      <LinearGradient colors={Gradients[base]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

      {showImage ? (
        <Image
          source={{ uri: imageUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setImageOk(false)}
        />
      ) : null}

      {/* 글씨 가독성을 위한 어두운 스크림 */}
      <LinearGradient colors={Gradients.scrim} style={StyleSheet.absoluteFill} />

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: Radius.large, overflow: 'hidden' },
  content: { flex: 1, justifyContent: 'flex-end', padding: 20 },
});

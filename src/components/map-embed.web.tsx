import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** 웹: 구글 지도 임베드(iframe). API 키가 필요 없습니다. */
export function MapEmbed({ query, height = 200 }: { query: string; height?: number }) {
  const theme = useTheme();
  const src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=16&hl=ko&output=embed`;

  return (
    <View style={[styles.frame, { height, backgroundColor: theme.backgroundSelected }]}>
      {createElement('iframe', {
        src,
        title: '교회 위치',
        loading: 'lazy',
        style: { border: 0, width: '100%', height: '100%' },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: Radius.medium, overflow: 'hidden' },
});

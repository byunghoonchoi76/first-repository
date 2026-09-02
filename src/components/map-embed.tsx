import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** iOS·안드로이드: WebView 로 구글 지도를 띄웁니다. */
export function MapEmbed({ query, height = 200 }: { query: string; height?: number }) {
  const theme = useTheme();
  const src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=16&hl=ko&output=embed`;

  return (
    <View style={[styles.frame, { height, backgroundColor: theme.backgroundSelected }]}>
      <WebView source={{ uri: src }} style={styles.webview} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: Radius.medium, overflow: 'hidden' },
  webview: { flex: 1, backgroundColor: 'transparent' },
});

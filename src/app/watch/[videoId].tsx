import * as WebBrowser from 'expo-web-browser';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Linking, Platform, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SermonPlayer } from '@/components/sermon-player';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, EmptyState } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { parseYouTubeUrl } from '@/lib/youtube';
import { useYouTubeTitle } from '@/lib/use-youtube-title';

/** 교회 유튜브 채널의 영상을 앱 안에서 바로 재생합니다. (설교로 등록되지 않은 최신 영상용) */
export default function WatchScreen() {
  const router = useRouter();
  const { videoId, title: titleParam } = useLocalSearchParams<{ videoId: string; title?: string }>();
  const { isAdmin } = useAuth();

  const watchUrl = `https://www.youtube.com/watch?v=${String(videoId)}`;
  const video = parseYouTubeUrl(watchUrl);
  const title = useYouTubeTitle(watchUrl, typeof titleParam === 'string' ? titleParam : '', '설교 영상');

  const openExternally = async () => {
    try {
      if (Platform.OS === 'web') await Linking.openURL(watchUrl);
      else await WebBrowser.openBrowserAsync(watchUrl);
    } catch {
      Alert.alert('재생할 수 없습니다', '주소를 다시 확인해 주세요.');
    }
  };

  if (!video) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '설교 영상' }} />
        <Card>
          <EmptyState icon="play-circle-outline" message="영상을 찾을 수 없습니다." />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: '설교 영상' }} />
      <SermonPlayer video={video} />
      <View style={styles.header}>
        <ThemedText type="title">{title}</ThemedText>
        <ThemedText type="caption" themeColor="textMuted">
          교회 유튜브 채널 최신 영상
        </ThemedText>
      </View>
      <Button label="유튜브에서 보기" icon="logo-youtube" variant="ghost" onPress={() => void openExternally()} />
      {isAdmin ? (
        <Button
          label="설교로 등록하기"
          icon="add-circle-outline"
          variant="secondary"
          onPress={() => router.push(`/admin/sermon/new?videoId=${String(videoId)}`)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.one },
});

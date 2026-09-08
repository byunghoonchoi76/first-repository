import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Linking, Platform, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { SermonPlayer } from '@/components/sermon-player';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, ErrorState, LoadingState } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { repository, useAsyncData, type Sermon } from '@/lib/data';
import { formatFullDate } from '@/lib/format';
import { useYouTubeTitle } from '@/lib/use-youtube-title';
import { isYouTubeChannelUrl, parseYouTubeUrl } from '@/lib/youtube';

export default function SermonDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const sermon = useAsyncData(() => repository.getSermon(String(id)), [id]);

  if (sermon.loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (sermon.error || !sermon.data) {
    return (
      <Screen>
        <ErrorState message={sermon.error ?? '설교를 찾을 수 없습니다.'} onRetry={sermon.reload} />
      </Screen>
    );
  }

  const item = sermon.data;

  // 유튜브 영상(쇼츠·라이브 포함)이면 화면 안에서 바로 재생합니다.
  const video = parseYouTubeUrl(item.mediaUrl);
  const isChannelOnly = isYouTubeChannelUrl(item.mediaUrl);

  const openExternally = async (url: string) => {
    try {
      if (Platform.OS === 'web') {
        await Linking.openURL(url);
      } else {
        await WebBrowser.openBrowserAsync(url);
      }
    } catch {
      Alert.alert('재생할 수 없습니다', '주소를 다시 확인해 주세요.');
    }
  };

  const confirmDelete = () => {
    const remove = async () => {
      await repository.deleteSermon(item.id);
      router.back();
    };
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (window.confirm('이 설교를 삭제할까요?')) void remove();
      return;
    }
    Alert.alert('설교 삭제', '이 설교를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => void remove() },
    ]);
  };

  return (
    <Screen>
      {video ? (
        <SermonPlayer video={video} />
      ) : (
        <View style={[styles.player, { backgroundColor: theme.backgroundSelected }]}>
          <Ionicons
            name={item.mediaType === 'video' ? 'play-circle' : 'musical-notes'}
            size={56}
            color={theme.primary}
          />
          <ThemedText type="caption" themeColor="textSecondary">
            {isChannelOnly
              ? '이 설교의 영상 주소가 아직 등록되지 않았습니다.'
              : item.mediaType === 'video'
                ? '설교 영상'
                : '설교 음성'}
          </ThemedText>
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.metaRow}>
          <Badge
            label={video?.kind === 'shorts' ? '쇼츠' : item.mediaType === 'video' ? '영상' : '음성'}
            tone={item.mediaType === 'video' ? 'primary' : 'success'}
          />
          {item.series ? <Badge label={item.series} tone="accent" /> : null}
        </View>
        <SermonTitle sermon={item} />
        <ThemedText type="small" themeColor="textSecondary">
          {formatFullDate(item.date)} · {item.preacher}
        </ThemedText>
        {item.scripture ? (
          <ThemedText type="smallBold" themeColor="primary">
            {item.scripture}
          </ThemedText>
        ) : null}
      </View>

      {video ? (
        <Button
          label="유튜브에서 보기"
          icon="logo-youtube"
          variant="ghost"
          onPress={() => void openExternally(video.watchUrl)}
        />
      ) : (
        <Button
          label={isChannelOnly ? '교회 유튜브 채널 열기' : item.mediaType === 'video' ? '영상 보기' : '음성 듣기'}
          icon={isChannelOnly ? 'logo-youtube' : 'play'}
          onPress={() => void openExternally(item.mediaUrl)}
        />
      )}

      {item.summary ? (
        <Card>
          <ThemedText type="smallBold" themeColor="textSecondary">
            설교 요약
          </ThemedText>
          <ThemedText type="body">{item.summary}</ThemedText>
        </Card>
      ) : null}

      {isAdmin ? (
        <View style={styles.adminRow}>
          <Button
            label="수정"
            icon="create-outline"
            variant="secondary"
            style={styles.flex}
            onPress={() => router.push(`/admin/sermon/${item.id}`)}
          />
          <Button label="삭제" icon="trash-outline" variant="danger" style={styles.flex} onPress={confirmDelete} />
        </View>
      ) : null}
    </Screen>
  );
}

/** 제목이 비어 있으면 유튜브에서 실제 제목을 가져와 보여 줍니다. */
function SermonTitle({ sermon }: { sermon: Sermon }) {
  const video = parseYouTubeUrl(sermon.mediaUrl);
  const title = useYouTubeTitle(
    sermon.mediaUrl,
    sermon.title,
    video?.kind === 'shorts' ? '쇼츠 영상' : '설교 영상',
  );
  return <ThemedText type="title">{title}</ThemedText>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  player: {
    height: 180,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  header: { gap: Spacing.two },
  metaRow: { flexDirection: 'row', gap: Spacing.two },
  adminRow: { flexDirection: 'row', gap: Spacing.two },
});

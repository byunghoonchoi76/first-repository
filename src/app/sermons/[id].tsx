import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Linking, Platform, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, ErrorState, LoadingState } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { repository, useAsyncData } from '@/lib/data';
import { formatFullDate } from '@/lib/format';

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

  const play = async () => {
    try {
      // 유튜브 등 외부 링크는 앱 내 브라우저(웹에서는 새 탭)로 엽니다.
      if (Platform.OS === 'web') {
        await Linking.openURL(item.mediaUrl);
      } else {
        await WebBrowser.openBrowserAsync(item.mediaUrl);
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
      <View style={[styles.player, { backgroundColor: theme.backgroundSelected }]}>
        <Ionicons
          name={item.mediaType === 'video' ? 'play-circle' : 'musical-notes'}
          size={56}
          color={theme.primary}
        />
        <ThemedText type="caption" themeColor="textSecondary">
          {item.mediaType === 'video' ? '설교 영상' : '설교 음성'}
        </ThemedText>
      </View>

      <View style={styles.header}>
        <View style={styles.metaRow}>
          <Badge
            label={item.mediaType === 'video' ? '영상' : '음성'}
            tone={item.mediaType === 'video' ? 'primary' : 'success'}
          />
          {item.series ? <Badge label={item.series} tone="accent" /> : null}
        </View>
        <ThemedText type="title">{item.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatFullDate(item.date)} · {item.preacher}
        </ThemedText>
        <ThemedText type="smallBold" themeColor="primary">
          {item.scripture}
        </ThemedText>
      </View>

      <Button label={item.mediaType === 'video' ? '영상 보기' : '음성 듣기'} icon="play" onPress={play} />

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

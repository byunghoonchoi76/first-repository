import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, ErrorState, LoadingState } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { repository, useAsyncData } from '@/lib/data';
import { formatRelative } from '@/lib/format';

export default function AnnouncementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const announcement = useAsyncData(() => repository.getAnnouncement(String(id)), [id]);

  if (announcement.loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (announcement.error || !announcement.data) {
    return (
      <Screen>
        <ErrorState
          message={announcement.error ?? '공지사항을 찾을 수 없습니다.'}
          onRetry={announcement.reload}
        />
      </Screen>
    );
  }

  const item = announcement.data;

  const confirmDelete = () => {
    const remove = async () => {
      await repository.deleteAnnouncement(item.id);
      router.back();
    };

    // web 의 Alert 은 버튼 콜백을 지원하지 않아 confirm 을 씁니다.
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (window.confirm('이 공지를 삭제할까요?')) void remove();
      return;
    }
    Alert.alert('공지 삭제', '이 공지를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => void remove() },
    ]);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Badge label={item.category} tone={item.category === '행사' ? 'accent' : 'primary'} />
        <ThemedText type="title">{item.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {item.author} · {formatRelative(item.publishedAt)}
        </ThemedText>
      </View>

      <Card>
        <ThemedText type="body">{item.body}</ThemedText>
      </Card>

      {isAdmin ? (
        <View style={styles.adminRow}>
          <Button
            label="수정"
            icon="create-outline"
            variant="secondary"
            style={styles.flex}
            onPress={() => router.push(`/admin/announcement/${item.id}`)}
          />
          <Button label="삭제" icon="trash-outline" variant="danger" style={styles.flex} onPress={confirmDelete} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: Spacing.two },
  adminRow: { flexDirection: 'row', gap: Spacing.two },
  flex: { flex: 1 },
});

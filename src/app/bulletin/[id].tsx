import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, ErrorState, LoadingState, SectionHeader } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { repository, useAsyncData } from '@/lib/data';
import { formatFullDate } from '@/lib/format';

export default function BulletinScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const bulletin = useAsyncData(() => repository.getBulletin(String(id)), [id]);

  if (bulletin.loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (bulletin.error || !bulletin.data) {
    return (
      <Screen>
        <ErrorState message={bulletin.error ?? '주보를 찾을 수 없습니다.'} onRetry={bulletin.reload} />
      </Screen>
    );
  }

  const item = bulletin.data;

  const confirmDelete = () => {
    const remove = async () => {
      await repository.deleteBulletin(item.id);
      router.back();
    };
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (window.confirm('이 주보를 삭제할까요?')) void remove();
      return;
    }
    Alert.alert('주보 삭제', '이 주보를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => void remove() },
    ]);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Badge label={formatFullDate(item.serviceDate)} tone="accent" />
        <ThemedText type="title">{item.sermonTitle}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {item.scripture} · {item.preacher}
        </ThemedText>
      </View>

      {item.weeklyVerse ? (
        <Card style={{ borderLeftWidth: 3, borderLeftColor: theme.accent }}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            이 주의 말씀
          </ThemedText>
          <ThemedText type="body">{item.weeklyVerse}</ThemedText>
        </Card>
      ) : null}

      <View>
        <SectionHeader title="예배 순서" />
        <Card>
          {item.order.map((line, index) => (
            <View key={`${line.title}-${index}`}>
              {index > 0 ? <View style={[styles.divider, { backgroundColor: theme.border }]} /> : null}
              <View style={styles.orderRow}>
                <ThemedText type="smallBold" style={styles.orderTitle}>
                  {line.title}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
                  {line.detail}
                </ThemedText>
              </View>
            </View>
          ))}
        </Card>
      </View>

      {item.notices.length > 0 ? (
        <View>
          <SectionHeader title="광고" />
          <Card>
            {item.notices.map((notice, index) => (
              <View key={index} style={styles.noticeRow}>
                <ThemedText type="small" themeColor="primary">
                  ·
                </ThemedText>
                <ThemedText type="small" style={styles.flex}>
                  {notice}
                </ThemedText>
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      {isAdmin ? (
        <View style={styles.adminRow}>
          <Button
            label="수정"
            icon="create-outline"
            variant="secondary"
            style={styles.flex}
            onPress={() => router.push(`/admin/bulletin/${item.id}`)}
          />
          <Button label="삭제" icon="trash-outline" variant="danger" style={styles.flex} onPress={confirmDelete} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: Spacing.two },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.two },
  orderRow: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  orderTitle: { width: 92 },
  noticeRow: { flexDirection: 'row', gap: Spacing.two },
  adminRow: { flexDirection: 'row', gap: Spacing.two },
});

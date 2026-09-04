import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { dataMode, repository, useAsyncData } from '@/lib/data';
import { formatRelative } from '@/lib/format';

/** 기도 요청 — 성도들이 함께 기도하도록 공개된 기도제목 목록. */
export default function PrayerRequestsScreen() {
  const theme = useTheme();
  const { user, isAdmin } = useAuth();
  const needsSignIn = dataMode === 'supabase' && !user;

  const sharedRequests = useAsyncData(
    () => (needsSignIn ? Promise.resolve([]) : repository.listSharedPrayerRequests()),
    [needsSignIn],
  );
  const reloadShared = sharedRequests.reload;
  useFocusEffect(reloadShared);

  const toggleAnswered = async (id: string, answered: boolean) => {
    sharedRequests.setData((cur) => cur?.map((item) => (item.id === id ? { ...item, answered } : item)));
    try {
      await repository.markPrayerAnswered(id, answered);
    } catch {
      reloadShared();
    }
  };

  const pray = async (id: string) => {
    sharedRequests.setData((cur) =>
      cur?.map((item) => (item.id === id ? { ...item, prayCount: item.prayCount + 1 } : item)),
    );
    try {
      const updated = await repository.prayForRequest(id);
      sharedRequests.setData((cur) => cur?.map((item) => (item.id === id ? updated : item)));
    } catch {
      reloadShared();
    }
  };

  const sharedItems = sharedRequests.data ?? [];

  return (
    <Screen onRefresh={reloadShared}>
      {needsSignIn ? (
        <Card>
          <EmptyState icon="lock-closed-outline" message="기도 요청은 로그인한 성도만 볼 수 있습니다." />
        </Card>
      ) : sharedRequests.loading && !sharedRequests.data ? (
        <LoadingState />
      ) : sharedRequests.error ? (
        <ErrorState message={sharedRequests.error} onRetry={sharedRequests.reload} />
      ) : sharedItems.length === 0 ? (
        <EmptyState icon="hand-right-outline" message="아직 올라온 기도 요청이 없습니다." />
      ) : (
        <View style={styles.stack}>
          {sharedItems.map((item) => (
            <Card key={item.id}>
              <View style={styles.rowBetween}>
                {item.answered ? <Badge label="응답됨" tone="success" /> : <Badge label="기도 중" tone="primary" />}
                <ThemedText type="caption" themeColor="textMuted">
                  {formatRelative(item.createdAt)}
                </ThemedText>
              </View>
              <ThemedText type="smallBold">{item.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {item.body}
              </ThemedText>
              <View style={styles.rowBetween}>
                <ThemedText type="caption" themeColor="textMuted">
                  {item.author}
                </ThemedText>
                <Pressable
                  onPress={() => void pray(item.id)}
                  style={({ pressed }) => [
                    styles.prayButton,
                    { borderColor: theme.border, opacity: pressed ? 0.6 : 1 },
                  ]}>
                  <Ionicons name="hand-right-outline" size={14} color={theme.primary} />
                  <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '700' }}>
                    함께 기도 {item.prayCount}
                  </ThemedText>
                </Pressable>
              </View>

              {isAdmin || (user && item.authorId && item.authorId === user.id) ? (
                <Button
                  label={item.answered ? '다시 기도 중으로' : '기도 응답되었어요'}
                  icon={item.answered ? 'refresh-outline' : 'checkmark-circle-outline'}
                  variant="ghost"
                  onPress={() => void toggleAnswered(item.id, !item.answered)}
                />
              ) : null}
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: Spacing.two },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  prayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

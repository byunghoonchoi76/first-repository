import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { repository, useAsyncData } from '@/lib/data';
import type { CommunalPrayer } from '@/lib/data/types';

/** 공동 기도 — 온 성도가 함께 기도하는 제목 목록입니다. (기도제목 하위 화면) */
export default function CommunalPrayerScreen() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const communal = useAsyncData(() => repository.listCommunalPrayers());
  const items = communal.data ?? [];

  return (
    <Screen onRefresh={communal.reload}>
      <Stack.Screen options={{ title: '공동 기도' }} />

      <ThemedText type="small" themeColor="textSecondary" style={styles.intro}>
        온 성도가 함께 마음을 모아 기도하는 제목입니다.
      </ThemedText>

      {isAdmin ? (
        <Button
          label="공동 기도제목 추가"
          icon="add-circle-outline"
          variant="secondary"
          onPress={() => router.push('/admin/communal/new')}
        />
      ) : null}

      {communal.loading && !communal.data ? (
        <LoadingState />
      ) : communal.error ? (
        <ErrorState message={communal.error} onRetry={communal.reload} />
      ) : items.length === 0 ? (
        <EmptyState icon="people-outline" message="등록된 공동 기도제목이 없습니다." />
      ) : (
        <View style={styles.stack}>
          {items.map((item) => (
            <CommunalCard key={item.id} item={item} isAdmin={isAdmin} onEdit={() => router.push(`/admin/communal/${item.id}`)} />
          ))}
        </View>
      )}
    </Screen>
  );
}

/** 공동 기도제목 카드 — 제목과 내용만 보여 줍니다. */
function CommunalCard({ item, isAdmin, onEdit }: { item: CommunalPrayer; isAdmin: boolean; onEdit: () => void }) {
  const theme = useTheme();
  return (
    <Card>
      <View style={styles.rowBetween}>
        <ThemedText type="smallBold" style={styles.flex}>
          {item.title}
        </ThemedText>
        {isAdmin ? (
          <Pressable onPress={onEdit} hitSlop={8}>
            <Ionicons name="create-outline" size={18} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {item.body ? (
        <ThemedText type="small" themeColor="textSecondary">
          {item.body}
        </ThemedText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  intro: { marginBottom: Spacing.one },
  stack: { gap: Spacing.two },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});

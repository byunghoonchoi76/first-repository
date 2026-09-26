import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { repository, useAsyncData } from '@/lib/data';
import type { CommunalPrayer } from '@/lib/data/types';
import { durationLabel } from '@/lib/format';
import { usePrayerTime } from '@/lib/prayer-log';

/** 공동 기도 — 온 성도가 함께 기도제목을 놓고 시간을 쌓아 갑니다. (기도제목 하위 화면) */
export default function CommunalPrayerScreen() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const communalTime = usePrayerTime('communal');
  const communal = useAsyncData(() => repository.listCommunalPrayers());

  const prayCommunal = async (id: string, seconds: number) => {
    communal.setData((cur) =>
      cur?.map((item) => (item.id === id ? { ...item, totalMinutes: item.totalMinutes + seconds } : item)),
    );
    await communalTime.addMinutes(seconds); // 나의 통합 기도 시간에도 함께 반영됩니다.
    try {
      const updated = await repository.prayCommunal(id, seconds);
      communal.setData((cur) => cur?.map((item) => (item.id === id ? updated : item)));
    } catch {
      communal.reload();
    }
  };

  const items = communal.data ?? [];
  const totalAll = items.reduce((s, it) => s + it.totalMinutes, 0);

  return (
    <Screen onRefresh={communal.reload}>
      <Stack.Screen options={{ title: '공동 기도' }} />

      <Card style={styles.hero}>
        <ThemedText type="caption" themeColor="textSecondary">
          온 성도가 함께 기도한 시간
        </ThemedText>
        <ThemedText type="title" themeColor="primary">
          {durationLabel(totalAll)}
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted">
          이 중 나의 참여 {communalTime.totalMinutes > 0 ? durationLabel(communalTime.totalMinutes) : '0분'}
        </ThemedText>
      </Card>

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
            <CommunalCard
              key={item.id}
              item={item}
              isAdmin={isAdmin}
              onPray={(s) => prayCommunal(item.id, s)}
              onEdit={() => router.push(`/admin/communal/${item.id}`)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

/** 공동 기도제목 카드 — 전체 누적 시간 표시 + 함께 기도 타이머 */
function CommunalCard({
  item,
  isAdmin,
  onPray,
  onEdit,
}: {
  item: CommunalPrayer;
  isAdmin: boolean;
  onPray: (seconds: number) => void;
  onEdit: () => void;
}) {
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
      <View style={[styles.communalTotal, { backgroundColor: theme.backgroundSelected }]}>
        <Ionicons name="time-outline" size={15} color={theme.primary} />
        <ThemedText type="caption" themeColor="textSecondary">
          함께 기도한 시간
        </ThemedText>
        <ThemedText type="smallBold" themeColor="primary" style={styles.flexEnd}>
          {durationLabel(item.totalMinutes)}
        </ThemedText>
      </View>
      <CommunalTimer onSave={async (seconds) => onPray(seconds)} startLabel="이 제목으로 기도" />
    </Card>
  );
}

/** 기도 시작 → 정지 시 경과 시간을 '초' 단위로 기록합니다. */
function CommunalTimer({ onSave, startLabel = '기도 시작' }: { onSave: (seconds: number) => Promise<void> | void; startLabel?: string }) {
  const theme = useTheme();
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (startedAt === null) return;
    intervalRef.current = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startedAt]);

  const stop = async () => {
    const secs = Math.round(elapsed / 1000);
    setStartedAt(null);
    setElapsed(0);
    if (secs > 0) await onSave(secs);
  };

  const seconds = Math.floor(elapsed / 1000);
  const display = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  if (startedAt === null) {
    return <Button label={startLabel} icon="play" onPress={() => setStartedAt(Date.now())} />;
  }
  return (
    <View style={[styles.timerBox, { backgroundColor: theme.backgroundSelected }]}>
      <ThemedText type="title">{display}</ThemedText>
      <Button label="마치고 기록하기" icon="stop" onPress={() => void stop()} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexEnd: { flex: 1, textAlign: 'right' },
  stack: { gap: Spacing.two },
  hero: { alignItems: 'center', gap: 2 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  communalTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.medium,
    marginVertical: Spacing.one,
  },
  timerBox: { borderRadius: Radius.medium, padding: Spacing.three, alignItems: 'center', gap: Spacing.two },
});

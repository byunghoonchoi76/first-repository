import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, SectionHeader } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { repository, useAsyncData } from '@/lib/data';
import { formatRelative, minutesLabel } from '@/lib/format';
import { usePrayerLog } from '@/lib/prayer-log';

const WEEKDAY_LABEL = ['일', '월', '화', '수', '목', '금', '토'];
const QUICK_MINUTES = [5, 10, 30];

export default function PrayerScreen() {
  const theme = useTheme();
  const router = useRouter();
  const prayerLog = usePrayerLog();
  const requests = useAsyncData(() => repository.listPrayerRequests());
  const { reload, setData } = requests;

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const pray = async (id: string) => {
    // 먼저 화면을 올려두고, 저장 결과로 값을 맞춥니다.
    setData((current) =>
      current?.map((item) => (item.id === id ? { ...item, prayCount: item.prayCount + 1 } : item)),
    );
    try {
      const updated = await repository.prayForRequest(id);
      setData((current) => current?.map((item) => (item.id === id ? updated : item)));
    } catch {
      reload();
    }
  };

  const maxMinutes = Math.max(30, ...prayerLog.week.map((d) => d.minutes));

  return (
    <Screen onRefresh={reload}>
      {/* 개인 기도시간 */}
      <View>
        <SectionHeader title="나의 기도시간" />
        <Card>
          <View style={styles.statRow}>
            <Stat label="오늘" value={prayerLog.todayMinutes > 0 ? minutesLabel(prayerLog.todayMinutes) : '-'} />
            <Stat label="연속" value={`${prayerLog.streak}일`} />
            <Stat label="누적" value={minutesLabel(prayerLog.totalMinutes)} />
          </View>

          <View style={styles.chart}>
            {prayerLog.week.map((day) => {
              const height = Math.max(4, Math.round((day.minutes / maxMinutes) * 64));
              const weekday = WEEKDAY_LABEL[new Date(`${day.date}T00:00:00`).getDay()];
              return (
                <View key={day.date} style={styles.chartColumn}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height,
                        backgroundColor: day.minutes > 0 ? theme.primary : theme.border,
                      },
                    ]}
                  />
                  <ThemedText type="caption" themeColor="textMuted">
                    {weekday}
                  </ThemedText>
                </View>
              );
            })}
          </View>

          <PrayerTimer onSave={prayerLog.addMinutes} />

          <View style={styles.quickRow}>
            {QUICK_MINUTES.map((minutes) => (
              <Button
                key={minutes}
                label={`+${minutes}분`}
                variant="ghost"
                style={styles.flex}
                onPress={() => void prayerLog.addMinutes(minutes)}
              />
            ))}
          </View>

          {prayerLog.todayMinutes > 0 ? (
            <Pressable onPress={() => void prayerLog.clearToday()} hitSlop={6}>
              <ThemedText type="caption" themeColor="textMuted" style={styles.center}>
                오늘 기록 지우기
              </ThemedText>
            </Pressable>
          ) : null}
        </Card>
      </View>

      {/* 기도제목 나눔 */}
      <View>
        <SectionHeader title="기도제목 나눔" />
        <Button
          label="기도제목 나누기"
          icon="add"
          variant="secondary"
          onPress={() => router.push('/prayer/new')}
        />
      </View>

      {requests.loading && !requests.data ? (
        <LoadingState />
      ) : requests.error ? (
        <ErrorState message={requests.error} onRetry={reload} />
      ) : (requests.data ?? []).length === 0 ? (
        <EmptyState icon="flower-outline" message="첫 기도제목을 나눠 주세요." />
      ) : (
        <View style={styles.stack}>
          {(requests.data ?? []).map((item) => (
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
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="heading">{value}</ThemedText>
    </View>
  );
}

/** 기도 시작 → 정지 시 경과 시간을 분 단위로 기록합니다. */
function PrayerTimer({ onSave }: { onSave: (minutes: number) => Promise<void> }) {
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
    const minutes = Math.max(1, Math.round(elapsed / 60000));
    setStartedAt(null);
    setElapsed(0);
    await onSave(minutes);
  };

  const seconds = Math.floor(elapsed / 1000);
  const display = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  if (startedAt === null) {
    return <Button label="기도 시작" icon="play" onPress={() => setStartedAt(Date.now())} />;
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
  stack: { gap: Spacing.two },
  center: { textAlign: 'center' },
  statRow: { flexDirection: 'row', gap: Spacing.two },
  stat: { flex: 1, gap: 2 },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
  },
  chartColumn: { flex: 1, alignItems: 'center', gap: Spacing.one },
  bar: { width: '70%', borderRadius: Radius.small },
  quickRow: { flexDirection: 'row', gap: Spacing.two },
  timerBox: { borderRadius: Radius.medium, padding: Spacing.three, alignItems: 'center', gap: Spacing.two },
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

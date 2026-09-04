import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, SectionHeader } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { dataMode, repository, useAsyncData } from '@/lib/data';
import type { CommunalPrayer } from '@/lib/data/types';
import { formatRelative, minutesLabel } from '@/lib/format';
import { COMMUNAL_PRAYER_KEY, usePrayerLog } from '@/lib/prayer-log';

const WEEKDAY_LABEL = ['일', '월', '화', '수', '목', '금', '토'];
const QUICK_MINUTES = [5, 10, 30];

export default function PrayerScreen() {
  const theme = useTheme();
  const router = useRouter();
  const personalTime = usePrayerLog();
  const communalTime = usePrayerLog(COMMUNAL_PRAYER_KEY);
  const { user, isAdmin } = useAuth();
  // Supabase 모드에서는 로그인한 성도만 개인 기도제목을 볼 수 있습니다.
  const needsSignIn = dataMode === 'supabase' && !user;

  const communal = useAsyncData(() => repository.listCommunalPrayers());
  const requests = useAsyncData(
    () => (needsSignIn ? Promise.resolve([]) : repository.listPrayerRequests()),
    [needsSignIn],
  );
  const reloadCommunal = communal.reload;
  const reloadRequests = requests.reload;

  useFocusEffect(
    useCallback(() => {
      reloadCommunal();
      reloadRequests();
    }, [reloadCommunal, reloadRequests]),
  );

  const toggleAnswered = async (id: string, answered: boolean) => {
    requests.setData((current) => current?.map((item) => (item.id === id ? { ...item, answered } : item)));
    try {
      const updated = await repository.markPrayerAnswered(id, answered);
      requests.setData((current) => current?.map((item) => (item.id === id ? updated : item)));
    } catch {
      reloadRequests();
    }
  };

  const pray = async (id: string) => {
    requests.setData((current) =>
      current?.map((item) => (item.id === id ? { ...item, prayCount: item.prayCount + 1 } : item)),
    );
    try {
      const updated = await repository.prayForRequest(id);
      requests.setData((current) => current?.map((item) => (item.id === id ? updated : item)));
    } catch {
      reloadRequests();
    }
  };

  /** 공동 기도제목으로 기도를 마치면: 전체 누적(서버) + 나의 공동 기도시간(기기)에 더합니다. */
  const prayCommunal = async (id: string, minutes: number) => {
    communal.setData((current) =>
      current?.map((item) =>
        item.id === id ? { ...item, totalMinutes: item.totalMinutes + minutes } : item,
      ),
    );
    await communalTime.addMinutes(minutes);
    try {
      const updated = await repository.prayCommunal(id, minutes);
      communal.setData((current) => current?.map((item) => (item.id === id ? updated : item)));
    } catch {
      reloadCommunal();
    }
  };

  // 나의 기도시간 = 공동 + 개인
  const myCommunal = communalTime.totalMinutes;
  const myPersonal = personalTime.totalMinutes;
  const myTotal = myCommunal + myPersonal;

  // 최근 7일 합산(공동 + 개인) 막대그래프
  const week = personalTime.week.map((day, i) => ({
    date: day.date,
    minutes: day.minutes + (communalTime.week[i]?.minutes ?? 0),
  }));
  const maxMinutes = Math.max(30, ...week.map((d) => d.minutes));

  const communalItems = communal.data ?? [];
  const communalTotalAll = communalItems.reduce((sum, item) => sum + item.totalMinutes, 0);

  return (
    <Screen
      onRefresh={() => {
        reloadCommunal();
        reloadRequests();
      }}>
      {/* 나의 기도시간 (공동 + 개인) */}
      <View>
        <SectionHeader title="나의 기도시간" />
        <Card>
          <View style={styles.statRow}>
            <Stat label="공동 기도" value={myCommunal > 0 ? minutesLabel(myCommunal) : '-'} />
            <Stat label="개인 기도" value={myPersonal > 0 ? minutesLabel(myPersonal) : '-'} />
            <Stat label="합계" value={myTotal > 0 ? minutesLabel(myTotal) : '-'} highlight />
          </View>

          <View style={styles.chart}>
            {week.map((day) => {
              const height = Math.max(4, Math.round((day.minutes / maxMinutes) * 60));
              const weekday = WEEKDAY_LABEL[new Date(`${day.date}T00:00:00`).getDay()];
              return (
                <View key={day.date} style={styles.chartColumn}>
                  <View
                    style={[
                      styles.bar,
                      { height, backgroundColor: day.minutes > 0 ? theme.primary : theme.border },
                    ]}
                  />
                  <ThemedText type="caption" themeColor="textMuted">
                    {weekday}
                  </ThemedText>
                </View>
              );
            })}
          </View>

          <ThemedText type="caption" themeColor="textMuted" style={styles.chartHint}>
            최근 7일 · 공동 기도와 개인 기도를 합한 시간이에요.
          </ThemedText>

          <View style={styles.divider} />
          <ThemedText type="smallBold">개인 기도 기록</ThemedText>
          <PrayerTimer onSave={personalTime.addMinutes} />
          <View style={styles.quickRow}>
            {QUICK_MINUTES.map((minutes) => (
              <Button
                key={minutes}
                label={`+${minutes}분`}
                variant="ghost"
                style={styles.flex}
                onPress={() => void personalTime.addMinutes(minutes)}
              />
            ))}
          </View>
          {personalTime.todayMinutes > 0 ? (
            <Pressable onPress={() => void personalTime.clearToday()} hitSlop={6}>
              <ThemedText type="caption" themeColor="textMuted" style={styles.center}>
                오늘 개인 기도 기록 지우기
              </ThemedText>
            </Pressable>
          ) : null}
        </Card>
      </View>

      {/* 공동 기도제목 나눔 */}
      <View>
        <SectionHeader title="공동 기도제목 나눔" />
        <Card style={styles.communalHero}>
          <ThemedText type="caption" themeColor="textSecondary">
            온 성도가 함께 기도한 시간
          </ThemedText>
          <ThemedText type="title" themeColor="primary">
            {minutesLabel(communalTotalAll)}
          </ThemedText>
          <ThemedText type="caption" themeColor="textMuted">
            이 중 나의 공동 기도 {myCommunal > 0 ? minutesLabel(myCommunal) : '0분'}
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
          <ErrorState message={communal.error} onRetry={reloadCommunal} />
        ) : communalItems.length === 0 ? (
          <EmptyState icon="people-outline" message="등록된 공동 기도제목이 없습니다." />
        ) : (
          <View style={styles.stack}>
            {communalItems.map((item) => (
              <CommunalCard
                key={item.id}
                item={item}
                isAdmin={isAdmin}
                onPray={(minutes) => prayCommunal(item.id, minutes)}
                onEdit={() => router.push(`/admin/communal/${item.id}`)}
              />
            ))}
          </View>
        )}
      </View>

      {/* 개인 기도제목 나눔 */}
      <View>
        <SectionHeader title="개인 기도제목 나눔" />
        {requests.data && requests.data.length > 0 ? (
          <Card style={styles.statsCard}>
            <View style={styles.statRow}>
              <Stat label="나눈 기도제목" value={`${requests.data.length}개`} />
              <Stat label="응답됨" value={`${requests.data.filter((item) => item.answered).length}개`} />
              <Stat
                label="함께 기도"
                value={`${requests.data.reduce((sum, item) => sum + item.prayCount, 0)}번`}
              />
            </View>
          </Card>
        ) : null}
        {!needsSignIn ? (
          <Button
            label="기도제목 나누기"
            icon="add"
            variant="secondary"
            onPress={() => router.push('/prayer/new')}
          />
        ) : null}
      </View>

      {needsSignIn ? (
        <Card>
          <EmptyState icon="lock-closed-outline" message="개인 기도제목은 로그인한 성도만 볼 수 있습니다." />
          <Button label="로그인하기" icon="log-in-outline" onPress={() => router.push('/sign-in')} />
        </Card>
      ) : requests.loading && !requests.data ? (
        <LoadingState />
      ) : requests.error ? (
        <ErrorState message={requests.error} onRetry={reloadRequests} />
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

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="heading" themeColor={highlight ? 'primary' : undefined}>
        {value}
      </ThemedText>
    </View>
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
  onPray: (minutes: number) => void;
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
          {minutesLabel(item.totalMinutes)}
        </ThemedText>
      </View>
      <PrayerTimer onSave={async (minutes) => onPray(minutes)} startLabel="이 제목으로 기도" />
    </Card>
  );
}

/** 기도 시작 → 정지 시 경과 시간을 분 단위로 기록합니다. */
function PrayerTimer({
  onSave,
  startLabel = '기도 시작',
}: {
  onSave: (minutes: number) => Promise<void> | void;
  startLabel?: string;
}) {
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
  center: { textAlign: 'center' },
  statRow: { flexDirection: 'row', gap: Spacing.two },
  statsCard: { marginBottom: Spacing.two },
  stat: { flex: 1, gap: 2 },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
  },
  chartColumn: { flex: 1, alignItems: 'center', gap: Spacing.one },
  chartHint: { marginBottom: Spacing.two },
  bar: { width: '70%', borderRadius: Radius.small },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'transparent', marginVertical: Spacing.one },
  quickRow: { flexDirection: 'row', gap: Spacing.two },
  timerBox: { borderRadius: Radius.medium, padding: Spacing.three, alignItems: 'center', gap: Spacing.two },
  communalHero: { alignItems: 'center', gap: 2, marginBottom: Spacing.two },
  communalTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.medium,
    marginVertical: Spacing.one,
  },
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

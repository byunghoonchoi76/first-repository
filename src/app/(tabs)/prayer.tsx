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
import type { CommunalPrayer, PrayerRequest } from '@/lib/data/types';
import { formatRelative, minutesLabel } from '@/lib/format';
import { pendingLocalPrayerMinutes, syncLocalPrayerTimeToAccount, usePrayerTime } from '@/lib/prayer-log';

const WEEKDAY_LABEL = ['일', '월', '화', '수', '목', '금', '토'];
const QUICK_MINUTES = [5, 10, 30];

export default function PrayerScreen() {
  const theme = useTheme();
  const router = useRouter();
  const personalTime = usePrayerTime('personal');
  const communalTime = usePrayerTime('communal');
  const { user, isAdmin } = useAuth();
  // Supabase 모드에서는 로그인한 성도만 개인 기도제목·기도 요청을 볼 수 있습니다.
  const needsSignIn = dataMode === 'supabase' && !user;

  const communal = useAsyncData(() => repository.listCommunalPrayers());
  const myRequests = useAsyncData(
    () => (needsSignIn ? Promise.resolve([]) : repository.listMyPrayerRequests()),
    [needsSignIn],
  );
  const sharedRequests = useAsyncData(
    () => (needsSignIn ? Promise.resolve([]) : repository.listSharedPrayerRequests()),
    [needsSignIn],
  );
  // useAsyncData 의 reload 는 안정적인 함수라 이것만 의존성으로 씁니다.
  // (결과 객체 전체를 의존성에 넣으면 매 렌더마다 새로 만들어져 무한 새로고침이 됩니다.)
  const reloadCommunal = communal.reload;
  const reloadMy = myRequests.reload;
  const reloadShared = sharedRequests.reload;
  const reloadAll = useCallback(() => {
    reloadCommunal();
    reloadMy();
    reloadShared();
  }, [reloadCommunal, reloadMy, reloadShared]);

  useFocusEffect(reloadAll);

  // 이 기기에 저장된 기도시간을 계정으로 1회 가져오기
  const [pendingSync, setPendingSync] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const canSync = dataMode === 'supabase' && !!user;
  useEffect(() => {
    if (!canSync) {
      setPendingSync(0);
      return;
    }
    let active = true;
    pendingLocalPrayerMinutes().then((m) => active && setPendingSync(m));
    return () => {
      active = false;
    };
  }, [canSync]);

  const runSync = async () => {
    setSyncing(true);
    try {
      await syncLocalPrayerTimeToAccount();
      setPendingSync(0);
      personalTime.reload();
      communalTime.reload();
    } finally {
      setSyncing(false);
    }
  };

  const toggleAnswered = async (id: string, answered: boolean) => {
    const patch = (list: typeof myRequests) =>
      list.setData((cur) => cur?.map((item) => (item.id === id ? { ...item, answered } : item)));
    patch(myRequests);
    patch(sharedRequests);
    try {
      await repository.markPrayerAnswered(id, answered);
    } catch {
      /* 화면은 유지하고 다음 새로고침에서 맞춥니다. */
    }
  };

  const setShared = async (id: string, shared: boolean) => {
    myRequests.setData((cur) => cur?.map((item) => (item.id === id ? { ...item, shared } : item)));
    try {
      await repository.setPrayerShared(id, shared);
    } finally {
      sharedRequests.reload();
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
      sharedRequests.reload();
    }
  };

  const prayCommunal = async (id: string, minutes: number) => {
    communal.setData((cur) =>
      cur?.map((item) => (item.id === id ? { ...item, totalMinutes: item.totalMinutes + minutes } : item)),
    );
    await communalTime.addMinutes(minutes);
    try {
      const updated = await repository.prayCommunal(id, minutes);
      communal.setData((cur) => cur?.map((item) => (item.id === id ? updated : item)));
    } catch {
      communal.reload();
    }
  };

  const myCommunal = communalTime.totalMinutes;
  const myPersonal = personalTime.totalMinutes;
  const myTotal = myCommunal + myPersonal;

  const week = personalTime.week.map((day, i) => ({
    date: day.date,
    minutes: day.minutes + (communalTime.week[i]?.minutes ?? 0),
  }));
  const maxMinutes = Math.max(30, ...week.map((d) => d.minutes));

  const communalItems = communal.data ?? [];
  const communalTotalAll = communalItems.reduce((sum, item) => sum + item.totalMinutes, 0);
  const myItems = myRequests.data ?? [];
  const sharedItems = sharedRequests.data ?? [];

  return (
    <Screen onRefresh={reloadAll}>
      {/* 나의 기도시간 (공동 + 개인) */}
      <View>
        <SectionHeader title="나의 기도시간" />
        {pendingSync > 0 ? (
          <Card style={styles.syncCard}>
            <Ionicons name="cloud-upload-outline" size={20} color={theme.primary} />
            <View style={styles.flex}>
              <ThemedText type="smallBold">이 기기의 기도 기록을 계정으로 가져오기</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                로그인 전 이 기기에 쌓인 {minutesLabel(pendingSync)}을 내 계정으로 옮깁니다.
              </ThemedText>
            </View>
            <Button label="가져오기" variant="secondary" loading={syncing} onPress={() => void runSync()} />
          </Card>
        ) : null}
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

      {/* 공동 기도제목 */}
      <View>
        <SectionHeader title="공동 기도제목" />
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
          <ErrorState message={communal.error} onRetry={communal.reload} />
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

      {/* 개인 기도제목 (나만 보는 목록 + 기도 요청으로 올리기) */}
      <View>
        <SectionHeader title="개인 기도제목" />
        {needsSignIn ? (
          <Card>
            <EmptyState icon="lock-closed-outline" message="로그인하면 나만의 기도제목을 적을 수 있어요." />
            <Button label="로그인하기" icon="log-in-outline" onPress={() => router.push('/sign-in')} />
          </Card>
        ) : (
          <>
            <Button
              label="기도제목 추가"
              icon="add"
              variant="secondary"
              onPress={() => router.push('/prayer/new')}
            />
            {myRequests.loading && !myRequests.data ? (
              <LoadingState />
            ) : myRequests.error ? (
              <ErrorState message={myRequests.error} onRetry={myRequests.reload} />
            ) : myItems.length === 0 ? (
              <EmptyState icon="flower-outline" message="나만의 기도제목을 적어 보세요." />
            ) : (
              <View style={styles.stack}>
                {myItems.map((item) => (
                  <MyPrayerCard
                    key={item.id}
                    item={item}
                    onToggleAnswered={() => toggleAnswered(item.id, !item.answered)}
                    onShare={() => setShared(item.id, true)}
                    onUnshare={() => setShared(item.id, false)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </View>

      {/* 기도 요청 (성도들과 함께 기도) */}
      <View>
        <SectionHeader title="기도 요청" />
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
      </View>
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

/** 개인 기도제목 카드 — 나만 보이며, 원하면 '기도 요청'으로 공개할 수 있습니다. */
function MyPrayerCard({
  item,
  onToggleAnswered,
  onShare,
  onUnshare,
}: {
  item: PrayerRequest;
  onToggleAnswered: () => void;
  onShare: () => void;
  onUnshare: () => void;
}) {
  return (
    <Card>
      <View style={styles.rowBetween}>
        {item.shared ? (
          <Badge label="기도 요청 중" tone="primary" />
        ) : (
          <Badge label="나만 보기" tone="textSecondary" />
        )}
        <ThemedText type="caption" themeColor="textMuted">
          {formatRelative(item.createdAt)}
        </ThemedText>
      </View>
      <ThemedText type="smallBold">{item.title}</ThemedText>
      {item.body ? (
        <ThemedText type="small" themeColor="textSecondary">
          {item.body}
        </ThemedText>
      ) : null}
      {item.shared ? (
        <ThemedText type="caption" themeColor="textMuted">
          함께 기도 {item.prayCount}번 · 성도들이 함께 기도하고 있어요
        </ThemedText>
      ) : null}
      {item.shared ? (
        <Button label="기도 요청 내리기" icon="eye-off-outline" variant="ghost" onPress={onUnshare} />
      ) : (
        <Button label="기도 요청으로 올리기" icon="megaphone-outline" variant="secondary" onPress={onShare} />
      )}
      <Button
        label={item.answered ? '다시 기도 중으로' : '기도 응답되었어요'}
        icon={item.answered ? 'refresh-outline' : 'checkmark-circle-outline'}
        variant="ghost"
        onPress={onToggleAnswered}
      />
    </Card>
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
  quickRow: { flexDirection: 'row', gap: Spacing.two },
  timerBox: { borderRadius: Radius.medium, padding: Spacing.three, alignItems: 'center', gap: Spacing.two },
  syncCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.two },
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

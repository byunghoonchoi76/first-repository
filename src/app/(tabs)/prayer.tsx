import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, EmptyState, ErrorState, LoadingState, SectionHeader } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { repository, useAsyncData } from '@/lib/data';
import type { CommunalPrayer, PrayerKind, PrayerLogEntry } from '@/lib/data/types';
import { minutesLabel } from '@/lib/format';
import { toDateKey } from '@/lib/format';
import { GOAL_STEP, useWeeklyGoal } from '@/lib/prayer-goal';
import { recentDays, usePrayerTime } from '@/lib/prayer-log';

const WEEKDAY_LABEL = ['일', '월', '화', '수', '목', '금', '토'];
const QUICK_MINUTES = [5, 10, 30];

type PrayerTime = ReturnType<typeof usePrayerTime>;

export default function PrayerScreen() {
  const router = useRouter();
  const personalTime = usePrayerTime('personal');
  const communalTime = usePrayerTime('communal');
  const { isAdmin } = useAuth();

  const [kind, setKind] = useState<PrayerKind>('personal');
  const active = kind === 'personal' ? personalTime : communalTime;
  const { goal, setGoal } = useWeeklyGoal(kind);

  const communal = useAsyncData(() => repository.listCommunalPrayers());
  const reloadCommunal = communal.reload;

  useFocusEffect(reloadCommunal);

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

  const communalItems = communal.data ?? [];
  const communalTotalAll = communalItems.reduce((sum, item) => sum + item.totalMinutes, 0);

  return (
    <Screen onRefresh={reloadCommunal}>
      <KindToggle value={kind} onChange={setKind} />

      <GaugeCard active={active} kind={kind} goal={goal} onGoal={setGoal} />
      <GrassCard active={active} />
      <AverageCard active={active} />
      <InputCard active={active} kind={kind} />

      {kind === 'communal' ? (
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
              이 중 나의 공동 기도 {communalTime.totalMinutes > 0 ? minutesLabel(communalTime.totalMinutes) : '0분'}
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
      ) : null}
    </Screen>
  );
}

/** 개인 / 공동 전환 세그먼트 */
function KindToggle({ value, onChange }: { value: PrayerKind; onChange: (k: PrayerKind) => void }) {
  const theme = useTheme();
  const options: { key: PrayerKind; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    { key: 'personal', label: '개인 기도', icon: 'flower-outline' },
    { key: 'communal', label: '공동 기도', icon: 'people-outline' },
  ];
  return (
    <View style={[styles.toggle, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      {options.map((opt) => {
        const on = value === opt.key;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[styles.toggleItem, on && { backgroundColor: theme.primary }]}>
            <Ionicons name={opt.icon} size={16} color={on ? theme.onPrimary : theme.textSecondary} />
            <ThemedText type="smallBold" style={{ color: on ? theme.onPrimary : theme.textSecondary }}>
              {opt.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── 달성률 반원 게이지 ────────────────────────────────────────────
function polar(cx: number, cy: number, r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = polar(cx, cy, r, startDeg);
  const e = polar(cx, cy, r, endDeg);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

/** 이번 주(일요일부터 오늘까지) 합계 분 */
function thisWeekMinutes(entries: PrayerLogEntry[]): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  const startKey = toDateKey(start);
  return entries.reduce((sum, e) => (e.date >= startKey ? sum + e.minutes : sum), 0);
}

function GaugeCard({
  active,
  kind,
  goal,
  onGoal,
}: {
  active: PrayerTime;
  kind: PrayerKind;
  goal: number;
  onGoal: (n: number) => void;
}) {
  const theme = useTheme();
  const week = thisWeekMinutes(active.entries);
  const pct = goal > 0 ? Math.min(1, week / goal) : 0;
  const pct100 = Math.round(pct * 100);

  const W = 210;
  const cx = 105;
  const cy = 104;
  const r = 86;
  const endDeg = 180 + 180 * pct;

  return (
    <View>
      <SectionHeader title={`이번 주 ${kind === 'personal' ? '개인' : '공동'} 기도 시간 달성률`} />
      <Card style={styles.center}>
        <View style={{ width: W, height: 118 }}>
          <Svg width={W} height={118} viewBox={`0 0 ${W} 118`}>
            <Path d={arcPath(cx, cy, r, 180, 360)} stroke={theme.backgroundSelected} strokeWidth={16} strokeLinecap="round" fill="none" />
            {pct > 0.004 ? (
              <Path d={arcPath(cx, cy, r, 180, endDeg)} stroke={theme.accent} strokeWidth={16} strokeLinecap="round" fill="none" />
            ) : null}
          </Svg>
          <View style={styles.gaugeCenter}>
            <ThemedText type="title">{pct100}%</ThemedText>
          </View>
        </View>

        <View style={styles.goalRow}>
          <Pressable onPress={() => onGoal(goal - GOAL_STEP)} hitSlop={8} style={[styles.goalStep, { borderColor: theme.border }]}>
            <Ionicons name="remove" size={16} color={theme.textSecondary} />
          </Pressable>
          <ThemedText type="caption" themeColor="textMuted">
            목표: {minutesLabel(goal)}
          </ThemedText>
          <Pressable onPress={() => onGoal(goal + GOAL_STEP)} hitSlop={8} style={[styles.goalStep, { borderColor: theme.border }]}>
            <Ionicons name="add" size={16} color={theme.textSecondary} />
          </Pressable>
        </View>
        <ThemedText type="caption" themeColor="textMuted" style={styles.center}>
          이번 주 {minutesLabel(week)} 기도했어요.
        </ThemedText>
      </Card>
    </View>
  );
}

// ── 기도 잔디 ──────────────────────────────────────────────────
function grassColor(minutes: number, emptyColor: string): string {
  if (minutes <= 0) return emptyColor;
  if (minutes < 15) return '#BFE3B4';
  if (minutes < 30) return '#8AD07A';
  if (minutes < 60) return '#57B547';
  return '#2F8F2A';
}

function buildGrass(entries: PrayerLogEntry[], weeks = 5) {
  const map = new Map(entries.map((e) => [e.date, e.minutes]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endSat = new Date(today);
  endSat.setDate(endSat.getDate() + (6 - today.getDay())); // 이번 주 토요일
  const start = new Date(endSat);
  start.setDate(start.getDate() - (weeks * 7 - 1)); // 시작(일요일)

  const rows: { key: string; minutes: number; future: boolean }[][] = [];
  for (let w = 0; w < weeks; w += 1) {
    const row: { key: string; minutes: number; future: boolean }[] = [];
    for (let d = 0; d < 7; d += 1) {
      const cur = new Date(start);
      cur.setDate(start.getDate() + w * 7 + d);
      const key = toDateKey(cur);
      row.push({ key, minutes: map.get(key) ?? 0, future: cur > today });
    }
    rows.push(row);
  }
  return rows;
}

function GrassCard({ active }: { active: PrayerTime }) {
  const theme = useTheme();
  const rows = buildGrass(active.entries);

  return (
    <View>
      <View style={styles.grassHead}>
        <SectionHeader title="나의 기도 잔디 기록" />
        {active.streak > 0 ? (
          <View style={[styles.streakBadge, { backgroundColor: theme.backgroundSelected }]}>
            <Ionicons name="flame" size={13} color={theme.accent} />
            <ThemedText type="caption" themeColor="textSecondary">
              {active.streak}일 연속 기도 중
            </ThemedText>
          </View>
        ) : null}
      </View>
      <Card>
        <View style={styles.grassHeaderRow}>
          {WEEKDAY_LABEL.map((w) => (
            <ThemedText key={w} type="caption" themeColor="textMuted" style={styles.grassHeadCell}>
              {w}
            </ThemedText>
          ))}
        </View>
        <View style={styles.grassGrid}>
          {rows.map((row, ri) => (
            <View key={ri} style={styles.grassRow}>
              {row.map((cell) => (
                <View
                  key={cell.key}
                  style={[
                    styles.grassCell,
                    {
                      backgroundColor: cell.future ? 'transparent' : grassColor(cell.minutes, theme.backgroundSelected),
                      borderColor: theme.border,
                    },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
        <View style={styles.grassLegend}>
          <ThemedText type="caption" themeColor="textMuted">
            적음
          </ThemedText>
          {['#BFE3B4', '#8AD07A', '#57B547', '#2F8F2A'].map((c) => (
            <View key={c} style={[styles.legendCell, { backgroundColor: c }]} />
          ))}
          <ThemedText type="caption" themeColor="textMuted">
            많음
          </ThemedText>
        </View>
      </Card>
    </View>
  );
}

// ── 최근 10일 하루 평균 ──────────────────────────────────────────
function AverageCard({ active }: { active: PrayerTime }) {
  const theme = useTheme();
  const days = recentDays(active.entries, 10);
  const total = days.reduce((s, d) => s + d.minutes, 0);
  const avg = Math.round(total / days.length);
  const max = Math.max(30, ...days.map((d) => d.minutes));

  return (
    <View>
      <View style={styles.grassHead}>
        <SectionHeader title="최근 10일 하루 평균 기도 시간" />
        <ThemedText type="smallBold" themeColor="primary">
          평균 {minutesLabel(avg)}
        </ThemedText>
      </View>
      <Card>
        <View style={styles.barChart}>
          {days.map((d) => {
            const h = Math.max(4, Math.round((d.minutes / max) * 64));
            const label = `${Number(d.date.slice(5, 7))}/${Number(d.date.slice(8, 10))}`;
            return (
              <View key={d.date} style={styles.barCol}>
                <ThemedText type="caption" themeColor="textMuted" style={styles.barValue}>
                  {d.minutes > 0 ? d.minutes : ''}
                </ThemedText>
                <View style={[styles.bar, { height: h, backgroundColor: d.minutes > 0 ? theme.accent : theme.border }]} />
                <ThemedText type="caption" themeColor="textMuted" style={styles.barLabel}>
                  {label}
                </ThemedText>
              </View>
            );
          })}
        </View>
      </Card>
    </View>
  );
}

// ── 기도 시간 입력 ──────────────────────────────────────────────
function InputCard({ active, kind }: { active: PrayerTime; kind: PrayerKind }) {
  return (
    <View>
      <SectionHeader title="기도 시간 입력" />
      <Card>
        <PrayerTimer onSave={active.addMinutes} />
        <View style={styles.quickRow}>
          {QUICK_MINUTES.map((minutes) => (
            <Button
              key={minutes}
              label={`+${minutes}분`}
              variant="ghost"
              style={styles.flex}
              onPress={() => void active.addMinutes(minutes)}
            />
          ))}
        </View>
        {active.todayMinutes > 0 ? (
          <Pressable onPress={() => void active.clearToday()} hitSlop={6}>
            <ThemedText type="caption" themeColor="textMuted" style={styles.center}>
              오늘 {kind === 'personal' ? '개인' : '공동'} 기도 기록 지우기
            </ThemedText>
          </Pressable>
        ) : null}
      </Card>
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
  center: { alignItems: 'center', textAlign: 'center' },

  toggle: { flexDirection: 'row', padding: 4, borderRadius: Radius.pill, borderWidth: StyleSheet.hairlineWidth, gap: 4 },
  toggleItem: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.one,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },

  gaugeCenter: { position: 'absolute', left: 0, right: 0, bottom: 4, alignItems: 'center' },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginTop: Spacing.two },
  goalStep: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  grassHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  grassHeaderRow: { flexDirection: 'row', marginBottom: Spacing.one },
  grassHeadCell: { flex: 1, textAlign: 'center' },
  grassGrid: { gap: 5 },
  grassRow: { flexDirection: 'row', gap: 5 },
  grassCell: { flex: 1, aspectRatio: 1, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth },
  grassLegend: { flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'flex-end', marginTop: Spacing.two },
  legendCell: { width: 12, height: 12, borderRadius: 3 },

  barChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, paddingTop: Spacing.two },
  barCol: { flex: 1, alignItems: 'center', gap: 2 },
  bar: { width: '64%', borderRadius: Radius.small },
  barValue: { fontSize: 9 },
  barLabel: { fontSize: 9 },

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
});

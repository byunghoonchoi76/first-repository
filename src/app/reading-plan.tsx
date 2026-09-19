import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useMemo, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Card, SectionHeader } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { bskoreaUrl, mccheyneForDate, mccheyneIndex } from '@/constants/mccheyne';
import { formatFullDate } from '@/lib/format';
import { useReadingProgress } from '@/lib/reading-progress';
import { useTheme } from '@/hooks/use-theme';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function addDays(date: Date, delta: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return d;
}
function sameYMD(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function ReadingPlanScreen() {
  const theme = useTheme();
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'month'>('week');
  const { done, toggle, count } = useReadingProgress();

  const readings = useMemo(() => mccheyneForDate(date), [date]);
  const idx = mccheyneIndex(date);
  const dayNo = idx + 1;
  const today = new Date();
  const isToday = sameYMD(date, today);
  const isDone = done.has(idx);
  const percent = Math.round((count / 365) * 100);

  const openPassage = (ref: string) => {
    const url = bskoreaUrl(ref);
    if (Platform.OS === 'web') void Linking.openURL(url);
    else void WebBrowser.openBrowserAsync(url);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: '성경 읽기표' }} />

      {/* 날짜 이동 + 진도 */}
      <Card elevated>
        <View style={styles.navRow}>
          <Pressable onPress={() => setDate((d) => addDays(d, -1))} hitSlop={10} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={22} color={theme.primary} />
          </Pressable>
          <View style={styles.navCenter}>
            <ThemedText type="smallBold">{formatFullDate(date.toISOString().slice(0, 10))}</ThemedText>
            <ThemedText type="caption" themeColor="textMuted">
              맥체인 성경읽기표 · {dayNo}일차 / 365
            </ThemedText>
          </View>
          <Pressable onPress={() => setDate((d) => addDays(d, 1))} hitSlop={10} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={22} color={theme.primary} />
          </Pressable>
        </View>

        {/* 진도 막대 */}
        <View style={styles.progressWrap}>
          <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
            <View style={[styles.progressFill, { backgroundColor: theme.primary, width: `${percent}%` }]} />
          </View>
          <ThemedText type="caption" themeColor="textSecondary">
            {count} / 365 완료 · {percent}%
          </ThemedText>
        </View>

        {/* 읽기 완료 토글 */}
        <Pressable
          onPress={() => toggle(idx)}
          style={[
            styles.doneBtn,
            {
              backgroundColor: isDone ? theme.success : theme.backgroundElement,
              borderColor: isDone ? theme.success : theme.border,
            },
          ]}>
          <Ionicons
            name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
            size={18}
            color={isDone ? theme.onPrimary : theme.textSecondary}
          />
          <ThemedText type="smallBold" style={{ color: isDone ? theme.onPrimary : theme.text }}>
            {isDone ? '읽기 완료됨' : isToday ? '오늘 읽기 완료' : '이 날 읽기 완료'}
          </ThemedText>
        </Pressable>
        {!isToday ? (
          <Pressable onPress={() => setDate(new Date())} style={styles.todayBtn}>
            <Ionicons name="today-outline" size={14} color={theme.primary} />
            <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '700' }}>
              오늘로
            </ThemedText>
          </Pressable>
        ) : null}
      </Card>

      {/* 가정예배 */}
      <View>
        <SectionHeader title="가정예배" accent />
        <Card elevated>
          <PassageRow reference={readings[0]} onPress={() => openPassage(readings[0])} theme={theme} />
          <Divider color={theme.border} />
          <PassageRow reference={readings[1]} onPress={() => openPassage(readings[1])} theme={theme} />
        </Card>
      </View>

      {/* 개인묵상 */}
      <View>
        <SectionHeader title="개인묵상" accent />
        <Card elevated>
          <PassageRow reference={readings[2]} onPress={() => openPassage(readings[2])} theme={theme} />
          <Divider color={theme.border} />
          <PassageRow reference={readings[3]} onPress={() => openPassage(readings[3])} theme={theme} />
        </Card>
      </View>

      {/* 진도 체크 (주간/월별) */}
      <View>
        <View style={styles.viewToggleRow}>
          {(['week', 'month'] as const).map((v) => {
            const active = v === view;
            return (
              <Pressable
                key={v}
                onPress={() => setView(v)}
                style={[
                  styles.viewChip,
                  { backgroundColor: active ? theme.primary : theme.backgroundElement, borderColor: active ? theme.primary : theme.border },
                ]}>
                <ThemedText type="caption" style={{ color: active ? theme.onPrimary : theme.textSecondary, fontWeight: '700' }}>
                  {v === 'week' ? '이번 주' : '월별'}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
        <Card elevated>
          {view === 'week' ? (
            <WeekGrid date={date} today={today} done={done} onSelect={setDate} theme={theme} />
          ) : (
            <MonthGrid date={date} today={today} done={done} onSelect={setDate} theme={theme} />
          )}
          <ThemedText type="caption" themeColor="textMuted" style={styles.gridHint}>
            날짜를 누르면 그 날 본문이 위에 표시됩니다. 초록색은 읽기 완료한 날이에요.
          </ThemedText>
        </Card>
      </View>

      <ThemedText type="caption" themeColor="textMuted" style={styles.note}>
        맥체인(R.M. McCheyne, 1813-1843) 목사의 1년 성경통독표입니다. 하루 네 곳을 읽으면 1년 동안
        구약은 한 번, 신약과 시편은 두 번 통독하게 됩니다. 본문을 누르면 대한성서공회(개역개정) 성경이 열립니다.
      </ThemedText>
    </Screen>
  );
}

function PassageRow({ reference, onPress, theme }: { reference: string; onPress: () => void; theme: ReturnType<typeof useTheme> }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <View style={[styles.rowIcon, { backgroundColor: theme.backgroundSelected }]}>
        <Ionicons name="book-outline" size={18} color={theme.primary} />
      </View>
      <ThemedText type="heading" style={styles.flex}>
        {reference}
      </ThemedText>
      <Ionicons name="open-outline" size={16} color={theme.textMuted} />
    </Pressable>
  );
}

/** 이번 주(일~토) 7일 체크 */
function WeekGrid({
  date,
  today,
  done,
  onSelect,
  theme,
}: {
  date: Date;
  today: Date;
  done: Set<number>;
  onSelect: (d: Date) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const start = addDays(date, -date.getDay()); // 그 주 일요일
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <View style={styles.weekRow}>
      {days.map((d) => {
        const dIdx = mccheyneIndex(d);
        const isDone = done.has(dIdx);
        const selected = sameYMD(d, date);
        const isToday = sameYMD(d, today);
        return (
          <Pressable key={d.toISOString()} onPress={() => onSelect(d)} style={styles.weekCell}>
            <ThemedText type="caption" themeColor="textMuted">
              {WEEKDAYS[d.getDay()]}
            </ThemedText>
            <View
              style={[
                styles.dayDot,
                {
                  backgroundColor: isDone ? theme.success : selected ? theme.primary : theme.backgroundSelected,
                  borderColor: isToday ? theme.accent : 'transparent',
                  borderWidth: isToday ? 2 : 0,
                },
              ]}>
              <ThemedText
                type="smallBold"
                style={{ color: isDone || selected ? theme.onPrimary : theme.text }}>
                {d.getDate()}
              </ThemedText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 월별 달력 체크 */
function MonthGrid({
  date,
  today,
  done,
  onSelect,
  theme,
}: {
  date: Date;
  today: Date;
  done: Set<number>;
  onSelect: (d: Date) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = first.getDay(); // 1일의 요일(빈칸 수)
  const cells: (Date | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View>
      <View style={styles.monthHeadRow}>
        {WEEKDAYS.map((w) => (
          <ThemedText key={w} type="caption" themeColor="textMuted" style={styles.monthHeadCell}>
            {w}
          </ThemedText>
        ))}
      </View>
      <View style={styles.monthGrid}>
        {cells.map((d, i) => {
          if (!d) return <View key={`b${i}`} style={styles.monthCell} />;
          const dIdx = mccheyneIndex(d);
          const isDone = done.has(dIdx);
          const selected = sameYMD(d, date);
          const isToday = sameYMD(d, today);
          return (
            <Pressable key={d.toISOString()} onPress={() => onSelect(d)} style={styles.monthCell}>
              <View
                style={[
                  styles.dayDot,
                  {
                    backgroundColor: isDone ? theme.success : selected ? theme.primary : theme.backgroundSelected,
                    borderColor: isToday ? theme.accent : 'transparent',
                    borderWidth: isToday ? 2 : 0,
                  },
                ]}>
                <ThemedText type="caption" style={{ color: isDone || selected ? theme.onPrimary : theme.text, fontWeight: '700' }}>
                  {d.getDate()}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Divider({ color }: { color: string }) {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: color, marginVertical: Spacing.one }} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { padding: Spacing.one },
  navCenter: { alignItems: 'center', gap: 2 },
  progressWrap: { gap: Spacing.one, marginTop: Spacing.two },
  progressTrack: { height: 8, borderRadius: Radius.pill, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radius.pill },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.three,
  },
  todayBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two + 2 },
  rowIcon: { width: 34, height: 34, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' },
  viewToggleRow: { flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.two },
  viewChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekCell: { alignItems: 'center', gap: 4, flex: 1 },
  dayDot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  monthHeadRow: { flexDirection: 'row' },
  monthHeadCell: { width: `${100 / 7}%`, textAlign: 'center' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.one },
  monthCell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  gridHint: { marginTop: Spacing.two, lineHeight: 17 },
  note: { lineHeight: 18 },
});

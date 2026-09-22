import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { HeroBanner } from '@/components/hero-banner';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Card, SectionHeader } from '@/components/ui';
import { LocalPhotos } from '@/constants/photos';
import { Radius, Spacing } from '@/constants/theme';
import { bskoreaUrl, mccheyneForDate, mccheyneIndex } from '@/constants/mccheyne';
import { formatFullDate, toDateKey } from '@/lib/format';
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
  const { done, toggle, count, synced } = useReadingProgress();

  const today = new Date();
  const isToday = sameYMD(date, today);
  const percent = Math.round((count / 365) * 100);

  const openPassage = (ref: string) => {
    const url = bskoreaUrl(ref);
    if (Platform.OS === 'web') void Linking.openURL(url);
    else void WebBrowser.openBrowserAsync(url);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: '성경 읽기표' }} />

      {/* 상단 히어로 이미지 */}
      <HeroBanner imageSource={LocalPhotos.reading} base="warm" aspectRatio={1200 / 564} style={styles.hero}>
        <ThemedText type="caption" style={styles.heroTag}>
          오늘의 양식
        </ThemedText>
        <ThemedText type="subtitle" style={styles.heroTitle}>
          성경 읽기표
        </ThemedText>
        <ThemedText type="small" style={styles.heroVerse}>
          주의 말씀은 내 발의 등이요 내 길의 빛
        </ThemedText>
      </HeroBanner>

      {/* 전체 진도 */}
      <Card elevated>
        <View style={styles.progressMeta}>
          <ThemedText type="smallBold">1년 성경통독</ThemedText>
          <View style={styles.syncTag}>
            <Ionicons name={synced ? 'cloud-done-outline' : 'phone-portrait-outline'} size={12} color={theme.textMuted} />
            <ThemedText type="caption" themeColor="textMuted">
              {synced ? '여러 기기 공유' : '이 기기에 저장'}
            </ThemedText>
          </View>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
          <View style={[styles.progressFill, { backgroundColor: theme.primary, width: `${percent}%` }]} />
        </View>
        <ThemedText type="caption" themeColor="textSecondary">
          {count} / 365 완료 · {percent}%
        </ThemedText>
      </Card>

      {/* 이번 주 말씀 — 좌우로 넘기며 일자별 본문 보기 */}
      <View>
        <View style={styles.weekHead}>
          <SectionHeader title="이번 주 말씀" accent />
          {!isToday ? (
            <Pressable onPress={() => setDate(new Date())} style={styles.todayBtn} hitSlop={6}>
              <Ionicons name="today-outline" size={14} color={theme.primary} />
              <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '700' }}>
                오늘로
              </ThemedText>
            </Pressable>
          ) : null}
        </View>

        <WeekPager
          date={date}
          today={today}
          done={done}
          onSelect={setDate}
          onToggle={toggle}
          onOpen={openPassage}
          theme={theme}
        />

        {/* 요일 인디케이터 (초록 = 읽기 완료) */}
        <Card>
          <WeekGrid date={date} today={today} done={done} onSelect={setDate} theme={theme} />
        </Card>
        <ThemedText type="caption" themeColor="textMuted" style={styles.swipeHint}>
          카드를 좌우로 넘기면 그 주의 다른 요일 말씀을 볼 수 있어요.
        </ThemedText>
      </View>

      {/* 월별(연간) 진도 — 한 해 전체를 한눈에 */}
      <View>
        <SectionHeader title={`${date.getFullYear()}년 월별 진도`} accent />
        <Card elevated>
          <View style={styles.yearGrid}>
            {Array.from({ length: 12 }, (_, m) => (
              <MonthBlock
                key={m}
                monthDate={new Date(date.getFullYear(), m, 1)}
                selected={date}
                today={today}
                done={done}
                onSelect={setDate}
                theme={theme}
              />
            ))}
          </View>
          <ThemedText type="caption" themeColor="textMuted" style={styles.gridHint}>
            날짜를 누르면 그 날 본문이 위 카드에 표시됩니다. 초록색은 읽기 완료한 날이에요.
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

/** 이번 주(일~토)를 좌우로 넘기는 페이지 캐러셀. 넘기면 선택 날짜가 바뀝니다. */
function WeekPager({
  date,
  today,
  done,
  onSelect,
  onToggle,
  onOpen,
  theme,
}: {
  date: Date;
  today: Date;
  done: Set<number>;
  onSelect: (d: Date) => void;
  onToggle: (idx: number) => void;
  onOpen: (ref: string) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const start = addDays(date, -date.getDay()); // 그 주 일요일
  const startKey = toDateKey(start);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [startKey]);
  const selectedIndex = date.getDay();

  const [pageW, setPageW] = useState(0);
  const listRef = useRef<FlatList<Date>>(null);

  // 주가 바뀌거나(월별 이동) 폭이 정해지면 선택된 요일 카드로 맞춥니다.
  useEffect(() => {
    if (pageW > 0 && listRef.current) {
      try {
        listRef.current.scrollToOffset({ offset: selectedIndex * pageW, animated: false });
      } catch {
        /* 레이아웃 전이면 무시 */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startKey, pageW]);

  return (
    <View onLayout={(e) => setPageW(e.nativeEvent.layout.width)}>
      {pageW > 0 ? (
        <FlatList
          ref={listRef}
          data={days}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(d) => d.toISOString()}
          getItemLayout={(_, i) => ({ length: pageW, offset: pageW * i, index: i })}
          initialScrollIndex={selectedIndex}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / pageW);
            const d = days[i];
            if (d && !sameYMD(d, date)) onSelect(d);
          }}
          renderItem={({ item }) => (
            <DayMessageCard width={pageW} d={item} today={today} done={done} onToggle={onToggle} onOpen={onOpen} theme={theme} />
          )}
        />
      ) : null}
    </View>
  );
}

/** 하루치 말씀 카드 — 날짜·진도·본문 4곳·읽기 완료 */
function DayMessageCard({
  width,
  d,
  today,
  done,
  onToggle,
  onOpen,
  theme,
}: {
  width: number;
  d: Date;
  today: Date;
  done: Set<number>;
  onToggle: (idx: number) => void;
  onOpen: (ref: string) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const readings = mccheyneForDate(d);
  const idx = mccheyneIndex(d);
  const isDone = done.has(idx);
  const isToday = sameYMD(d, today);

  return (
    <View style={{ width }}>
      <Card elevated style={styles.dayCard}>
        <View style={styles.dayHead}>
          <View style={styles.flex}>
            <ThemedText type="smallBold">{formatFullDate(toDateKey(d))}</ThemedText>
            <ThemedText type="caption" themeColor="textMuted">
              맥체인 성경읽기표 · {idx + 1}일차 / 365
            </ThemedText>
          </View>
          {isToday ? (
            <View style={[styles.todayChip, { backgroundColor: theme.accent }]}>
              <ThemedText type="caption" style={styles.todayChipText}>
                오늘
              </ThemedText>
            </View>
          ) : null}
        </View>

        <ThemedText type="caption" themeColor="primary" style={styles.groupLabel}>
          가정예배
        </ThemedText>
        <PassageRow reference={readings[0]} onPress={() => onOpen(readings[0])} theme={theme} />
        <Divider color={theme.border} />
        <PassageRow reference={readings[1]} onPress={() => onOpen(readings[1])} theme={theme} />

        <ThemedText type="caption" themeColor="primary" style={styles.groupLabel}>
          개인묵상
        </ThemedText>
        <PassageRow reference={readings[2]} onPress={() => onOpen(readings[2])} theme={theme} />
        <Divider color={theme.border} />
        <PassageRow reference={readings[3]} onPress={() => onOpen(readings[3])} theme={theme} />

        <Pressable
          onPress={() => onToggle(idx)}
          style={[
            styles.doneBtn,
            {
              backgroundColor: isDone ? theme.success : theme.backgroundElement,
              borderColor: isDone ? theme.success : theme.border,
            },
          ]}>
          <Ionicons name={isDone ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={isDone ? theme.onPrimary : theme.textSecondary} />
          <ThemedText type="smallBold" style={{ color: isDone ? theme.onPrimary : theme.text }}>
            {isDone ? '읽기 완료됨' : '읽기 완료'}
          </ThemedText>
        </Pressable>
      </Card>
    </View>
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

function DayDot({
  d,
  selectedDate,
  today,
  done,
  onSelect,
  theme,
  size = 34,
  small = false,
}: {
  d: Date;
  selectedDate: Date;
  today: Date;
  done: Set<number>;
  onSelect: (d: Date) => void;
  theme: ReturnType<typeof useTheme>;
  size?: number;
  small?: boolean;
}) {
  const isDone = done.has(mccheyneIndex(d));
  const selected = sameYMD(d, selectedDate);
  const isToday = sameYMD(d, today);
  return (
    <Pressable onPress={() => onSelect(d)} hitSlop={2}>
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDone ? theme.success : selected ? theme.primary : theme.backgroundSelected,
            borderColor: isToday ? theme.accent : 'transparent',
            borderWidth: isToday ? 2 : 0,
          },
        ]}>
        <ThemedText type={small ? 'caption' : 'smallBold'} style={{ color: isDone || selected ? theme.onPrimary : theme.text, fontWeight: '700' }}>
          {d.getDate()}
        </ThemedText>
      </View>
    </Pressable>
  );
}

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
  const start = addDays(date, -date.getDay());
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <View style={styles.weekRow}>
      {days.map((d) => (
        <View key={d.toISOString()} style={styles.weekCell}>
          <ThemedText type="caption" themeColor="textMuted">
            {WEEKDAYS[d.getDay()]}
          </ThemedText>
          <DayDot d={d} selectedDate={date} today={today} done={done} onSelect={onSelect} theme={theme} />
        </View>
      ))}
    </View>
  );
}

/** 한 달 미니 달력 (연간 보기용) */
function MonthBlock({
  monthDate,
  selected,
  today,
  done,
  onSelect,
  theme,
}: {
  monthDate: Date;
  selected: Date;
  today: Date;
  done: Set<number>;
  onSelect: (d: Date) => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = new Date(year, month, 1).getDay();
  const cells: (Date | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={styles.monthBlock}>
      <ThemedText type="smallBold" style={styles.monthTitle}>
        {month + 1}월
      </ThemedText>
      <View style={styles.monthHeadRow}>
        {WEEKDAYS.map((w) => (
          <ThemedText key={w} type="caption" themeColor="textMuted" style={styles.miniCell}>
            {w}
          </ThemedText>
        ))}
      </View>
      <View style={styles.monthGrid}>
        {cells.map((d, i) =>
          d ? (
            <View key={d.toISOString()} style={styles.miniCell}>
              <DayDot d={d} selectedDate={selected} today={today} done={done} onSelect={onSelect} theme={theme} size={26} small />
            </View>
          ) : (
            <View key={`b${i}`} style={styles.miniCell} />
          ),
        )}
      </View>
    </View>
  );
}

function Divider({ color }: { color: string }) {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: color, marginVertical: Spacing.one }} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: {},
  heroTag: { color: '#fff', fontWeight: '700', letterSpacing: 0.5 },
  heroTitle: { color: '#fff', marginTop: Spacing.one },
  heroVerse: { color: 'rgba(255,255,255,0.92)', marginTop: Spacing.one, fontWeight: '600' },

  progressTrack: { height: 8, borderRadius: Radius.pill, overflow: 'hidden', marginVertical: Spacing.one },
  progressFill: { height: '100%', borderRadius: Radius.pill },
  progressMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  syncTag: { flexDirection: 'row', alignItems: 'center', gap: 3 },

  weekHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  todayBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingBottom: Spacing.one },
  swipeHint: { textAlign: 'center', marginTop: Spacing.one },

  dayCard: { gap: 2 },
  dayHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Spacing.one },
  todayChip: { paddingHorizontal: Spacing.two, paddingVertical: 3, borderRadius: Radius.pill },
  todayChipText: { color: '#fff', fontWeight: '800' },
  groupLabel: { fontWeight: '800', marginTop: Spacing.two },

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
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two + 2 },
  rowIcon: { width: 34, height: 34, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekCell: { alignItems: 'center', gap: 4, flex: 1 },
  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  monthBlock: { width: '48%', marginBottom: Spacing.three },
  monthTitle: { textAlign: 'center', marginBottom: 4 },
  monthHeadRow: { flexDirection: 'row' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 },
  miniCell: { width: `${100 / 7}%`, alignItems: 'center', justifyContent: 'center', paddingVertical: 2 },
  gridHint: { marginTop: Spacing.two, lineHeight: 17 },
  note: { lineHeight: 18 },
});

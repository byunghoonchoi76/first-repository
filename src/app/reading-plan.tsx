import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useMemo, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Card, SectionHeader } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { mccheyneForDate, mccheyneIndex } from '@/constants/mccheyne';
import { formatFullDate } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';

/** 하루를 더하거나 뺀 새 날짜 */
function addDays(date: Date, delta: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return d;
}

export default function ReadingPlanScreen() {
  const theme = useTheme();
  const [date, setDate] = useState(new Date());

  const readings = useMemo(() => mccheyneForDate(date), [date]);
  const dayNo = mccheyneIndex(date) + 1;
  const isToday = mccheyneIndex(date) === mccheyneIndex(new Date());

  const openPassage = (ref: string) => {
    const url = `https://www.google.com/search?q=${encodeURIComponent(`${ref} 개역개정 성경`)}`;
    if (Platform.OS === 'web') void Linking.openURL(url);
    else void WebBrowser.openBrowserAsync(url);
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: '성경 읽기표' }} />

      {/* 날짜 이동 */}
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
          <PassageRow icon="home-outline" reference={readings[0]} onPress={() => openPassage(readings[0])} theme={theme} />
          <Divider color={theme.border} />
          <PassageRow icon="home-outline" reference={readings[1]} onPress={() => openPassage(readings[1])} theme={theme} />
        </Card>
      </View>

      {/* 개인묵상 */}
      <View>
        <SectionHeader title="개인묵상" accent />
        <Card elevated>
          <PassageRow icon="person-outline" reference={readings[2]} onPress={() => openPassage(readings[2])} theme={theme} />
          <Divider color={theme.border} />
          <PassageRow icon="person-outline" reference={readings[3]} onPress={() => openPassage(readings[3])} theme={theme} />
        </Card>
      </View>

      <ThemedText type="caption" themeColor="textMuted" style={styles.note}>
        맥체인(R.M. McCheyne, 1813-1843) 목사가 만든 1년 성경통독표입니다. 하루 네 곳을 읽으면
        1년 동안 구약은 한 번, 신약과 시편은 두 번 통독하게 됩니다. 본문을 누르면 성경 내용을 찾아볼 수 있어요.
      </ThemedText>
    </Screen>
  );
}

function PassageRow({
  icon,
  reference,
  onPress,
  theme,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  reference: string;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <View style={[styles.rowIcon, { backgroundColor: theme.backgroundSelected }]}>
        <Ionicons name={icon} size={18} color={theme.primary} />
      </View>
      <ThemedText type="heading" style={styles.flex}>
        {reference}
      </ThemedText>
      <Ionicons name="open-outline" size={16} color={theme.textMuted} />
    </Pressable>
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
  todayBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two + 2 },
  rowIcon: { width: 34, height: 34, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' },
  note: { lineHeight: 18 },
});

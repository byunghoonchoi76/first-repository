import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, LoadingState, Toggle } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useReminders } from '@/lib/reminders';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function RemindersScreen() {
  const theme = useTheme();
  const { state, loading, busy, error, setDays, setTime, enable, save, disable } = useReminders();

  if (loading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '기도 알림' }} />
        <LoadingState />
      </Screen>
    );
  }

  if (!state.supported) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '기도 알림' }} />
        <Card style={styles.center}>
          <Ionicons name="notifications-off-outline" size={28} color={theme.textMuted} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
            {state.reason ?? '이 기기에서는 알림을 사용할 수 없습니다.'}
          </ThemedText>
          {Platform.OS === 'web' ? (
            <ThemedText type="caption" themeColor="textMuted" style={styles.centerText}>
              아이폰은 사파리에서 <ThemedText type="caption" themeColor="primary">공유 → 홈 화면에 추가</ThemedText> 로 앱을 설치한 뒤 열면 알림을 받을 수 있어요.
            </ThemedText>
          ) : null}
        </Card>
      </Screen>
    );
  }

  const toggleDay = (d: number) =>
    setDays(state.days.includes(d) ? state.days.filter((x) => x !== d) : [...state.days, d].sort((a, b) => a - b));

  const stepHour = (delta: number) => setTime((state.hour + delta + 24) % 24, state.minute);
  const stepMinute = (delta: number) => setTime(state.hour, (state.minute + delta + 60) % 60);

  return (
    <Screen>
      <Stack.Screen options={{ title: '기도 알림' }} />

      <Card>
        <View style={styles.rowBetween}>
          <View style={styles.flex}>
            <ThemedText type="smallBold">기도 알림 받기</ThemedText>
            <ThemedText type="caption" themeColor="textMuted">
              정한 요일·시간에 기도하라는 알림을 보내 드려요.
            </ThemedText>
          </View>
          <Toggle
            label=""
            value={state.enabled}
            onChange={(v) => (v ? void enable() : void disable())}
          />
        </View>
        {state.permission === 'denied' ? (
          <ThemedText type="caption" themeColor="danger" style={styles.mt}>
            브라우저에서 알림이 차단되어 있습니다. 사이트 설정에서 알림을 허용해 주세요.
          </ThemedText>
        ) : null}
      </Card>

      <View>
        <ThemedText type="smallBold" style={styles.label}>
          요일
        </ThemedText>
        <View style={styles.dayRow}>
          {WEEKDAYS.map((w, d) => {
            const on = state.days.includes(d);
            return (
              <Pressable
                key={w}
                onPress={() => toggleDay(d)}
                style={[
                  styles.dayChip,
                  { backgroundColor: on ? theme.primary : theme.backgroundElement, borderColor: on ? theme.primary : theme.border },
                ]}>
                <ThemedText type="smallBold" style={{ color: on ? theme.onPrimary : theme.textSecondary }}>
                  {w}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View>
        <ThemedText type="smallBold" style={styles.label}>
          시간
        </ThemedText>
        <Card>
          <View style={styles.timeRow}>
            <TimeStepper
              value={`${state.hour < 12 ? '오전' : '오후'} ${((state.hour + 11) % 12) + 1}시`}
              onMinus={() => stepHour(-1)}
              onPlus={() => stepHour(1)}
            />
            <TimeStepper value={`${String(state.minute).padStart(2, '0')}분`} onMinus={() => stepMinute(-5)} onPlus={() => stepMinute(5)} />
          </View>
        </Card>
      </View>

      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}

      {state.enabled ? (
        <Button label="이 설정으로 저장" icon="save-outline" loading={busy} onPress={() => void save()} />
      ) : (
        <Button label="알림 켜기" icon="notifications-outline" loading={busy} onPress={() => void enable()} />
      )}

      <Card style={styles.tip}>
        <ThemedText type="caption" themeColor="textSecondary">
          · 안드로이드/PC는 브라우저에서 바로 받을 수 있어요.{'\n'}· 아이폰은 사파리에서 <ThemedText type="caption" themeColor="primary">공유 → 홈 화면에 추가</ThemedText> 로 설치한 앱에서 열어야 알림이 옵니다.{'\n'}· 기기마다 따로 설정합니다(각 기기에서 한 번씩 켜 주세요).
        </ThemedText>
      </Card>
    </Screen>
  );
}

function TimeStepper({ value, onMinus, onPlus }: { value: string; onMinus: () => void; onPlus: () => void }) {
  const theme = useTheme();
  return (
    <View style={styles.stepper}>
      <Pressable onPress={onMinus} hitSlop={8} style={[styles.stepBtn, { borderColor: theme.border }]}>
        <Ionicons name="remove" size={18} color={theme.textSecondary} />
      </Pressable>
      <ThemedText type="heading" style={styles.stepValue}>
        {value}
      </ThemedText>
      <Pressable onPress={onPlus} hitSlop={8} style={[styles.stepBtn, { borderColor: theme.border }]}>
        <Ionicons name="add" size={18} color={theme.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', gap: Spacing.two },
  centerText: { textAlign: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  mt: { marginTop: Spacing.two },
  label: { marginBottom: Spacing.two },
  dayRow: { flexDirection: 'row', gap: Spacing.one, justifyContent: 'space-between' },
  dayChip: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeRow: { flexDirection: 'row', gap: Spacing.three },
  stepper: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  stepBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { flex: 1, textAlign: 'center' },
  tip: { marginTop: Spacing.two },
});

import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

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

  const meridiem: 'am' | 'pm' = state.hour < 12 ? 'am' : 'pm';
  const hour12 = ((state.hour + 11) % 12) + 1; // 1~12
  const setFromParts = (mer: 'am' | 'pm', h12: number, min: number) =>
    setTime((h12 % 12) + (mer === 'pm' ? 12 : 0), min);

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
          <View style={[styles.ampmRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            {(['am', 'pm'] as const).map((m) => {
              const on = meridiem === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => setFromParts(m, hour12, state.minute)}
                  style={[styles.ampmBtn, on && { backgroundColor: theme.primary }]}>
                  <ThemedText type="smallBold" style={{ color: on ? theme.onPrimary : theme.textSecondary }}>
                    {m === 'am' ? '오전' : '오후'}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.pickerRow}>
            <NumberPicker
              suffix="시"
              value={hour12}
              options={HOURS}
              format={(v) => `${v}`}
              onSelect={(v) => setFromParts(meridiem, v, state.minute)}
            />
            <NumberPicker
              suffix="분"
              value={state.minute}
              options={MINUTES}
              format={(v) => String(v).padStart(2, '0')}
              onSelect={(v) => setTime(state.hour, v)}
            />
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

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1~12
const MINUTES = Array.from({ length: 60 }, (_, i) => i); // 0~59

/** 숫자 선택 — 누르면 목록에서 고릅니다. (시 1~12 / 분 00~59) */
function NumberPicker({
  value,
  options,
  format,
  suffix,
  onSelect,
}: {
  value: number;
  options: number[];
  format: (v: number) => string;
  suffix: string;
  onSelect: (v: number) => void;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.pickerField, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <ThemedText type="heading">{format(value)}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {suffix}
        </ThemedText>
        <Ionicons name="chevron-down" size={16} color={theme.textMuted} style={styles.pickerCaret} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ScrollView>
              {options.map((o) => {
                const on = o === value;
                return (
                  <Pressable
                    key={o}
                    onPress={() => {
                      onSelect(o);
                      setOpen(false);
                    }}
                    style={[styles.optionRow, on && { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText type={on ? 'smallBold' : 'small'} themeColor={on ? 'primary' : undefined}>
                      {format(o)}
                      {suffix}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
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
  ampmRow: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 4,
    marginBottom: Spacing.three,
  },
  ampmBtn: { flex: 1, alignItems: 'center', paddingVertical: Spacing.two, borderRadius: Radius.pill },
  pickerRow: { flexDirection: 'row', gap: Spacing.three },
  pickerField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pickerCaret: { marginLeft: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: Spacing.five },
  sheet: {
    width: '70%',
    maxHeight: '60%',
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  optionRow: { paddingVertical: Spacing.three, paddingHorizontal: Spacing.four, alignItems: 'center' },
  tip: { marginTop: Spacing.two },
});

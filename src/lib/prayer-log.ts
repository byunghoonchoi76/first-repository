import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { toDateKey } from '@/lib/format';
import type { PrayerLogEntry } from '@/lib/data/types';

/** 개인(나의) 기도시간 저장 키 */
export const PERSONAL_PRAYER_KEY = 'church-app/prayer-log';
/** 공동 기도에 내가 참여한 시간 저장 키 (기기 로컬, 나의 몫) */
export const COMMUNAL_PRAYER_KEY = 'church-app/communal-prayer-log';

async function readLog(storageKey: string): Promise<PrayerLogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PrayerLogEntry[]) : [];
  } catch {
    return [];
  }
}

/** 오늘부터 거꾸로 세어 기도 기록이 이어진 날 수 */
export function calculateStreak(entries: PrayerLogEntry[]): number {
  const done = new Set(entries.filter((e) => e.minutes > 0).map((e) => e.date));
  let streak = 0;
  const cursor = new Date();

  // 오늘 기록이 아직 없으면 어제부터 세어 연속 기록이 끊긴 것처럼 보이지 않게 합니다.
  if (!done.has(toDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (done.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** 오늘 포함 최근 `days` 일의 기록을 과거→오늘 순서로 반환 */
export function recentDays(entries: PrayerLogEntry[], days = 7): PrayerLogEntry[] {
  const map = new Map(entries.map((e) => [e.date, e]));
  const result: PrayerLogEntry[] = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = toDateKey(d);
    result.push(map.get(key) ?? { date: key, minutes: 0 });
  }
  return result;
}

/** 기도시간 기록을 기기 로컬에 저장·조회하는 훅. 저장 키로 개인/공동을 구분합니다. */
export function usePrayerLog(storageKey: string = PERSONAL_PRAYER_KEY) {
  const [entries, setEntries] = useState<PrayerLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    readLog(storageKey).then((stored) => {
      if (!active) return;
      setEntries(stored);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [storageKey]);

  const persist = useCallback(
    async (next: PrayerLogEntry[]) => {
      setEntries(next);
      await AsyncStorage.setItem(storageKey, JSON.stringify(next));
    },
    [storageKey],
  );

  /** 같은 날 여러 번 기록하면 시간을 더합니다. */
  const addMinutes = useCallback(
    async (minutes: number, note?: string) => {
      if (minutes <= 0) return;
      const today = toDateKey();
      const existing = entries.find((e) => e.date === today);
      const merged: PrayerLogEntry = {
        date: today,
        minutes: (existing?.minutes ?? 0) + minutes,
        note: note?.trim() || existing?.note,
      };
      await persist([merged, ...entries.filter((e) => e.date !== today)]);
    },
    [entries, persist],
  );

  const clearToday = useCallback(async () => {
    await persist(entries.filter((e) => e.date !== toDateKey()));
  }, [entries, persist]);

  const today = entries.find((e) => e.date === toDateKey());
  const totalMinutes = entries.reduce((sum, e) => sum + e.minutes, 0);

  return {
    entries,
    loading,
    todayMinutes: today?.minutes ?? 0,
    streak: calculateStreak(entries),
    week: recentDays(entries, 7),
    totalMinutes,
    addMinutes,
    clearToday,
  };
}

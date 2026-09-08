import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/lib/auth';
import { dataMode, repository } from '@/lib/data';
import { toDateKey } from '@/lib/format';
import type { PrayerKind, PrayerLogEntry } from '@/lib/data/types';

/** 개인(나의) 기도시간 저장 키 */
export const PERSONAL_PRAYER_KEY = 'church-app/prayer-log';
/** 공동 기도에 내가 참여한 시간 저장 키 (기기 로컬, 나의 몫) */
export const COMMUNAL_PRAYER_KEY = 'church-app/communal-prayer-log';

const KEY_BY_KIND: Record<PrayerKind, string> = {
  personal: PERSONAL_PRAYER_KEY,
  communal: COMMUNAL_PRAYER_KEY,
};

/** 같은 날 기록을 합쳐 최신이 앞에 오도록 정리합니다. */
function mergeToday(entries: PrayerLogEntry[], date: string, minutes: number, note?: string): PrayerLogEntry[] {
  const existing = entries.find((e) => e.date === date);
  const merged: PrayerLogEntry = {
    date,
    minutes: (existing?.minutes ?? 0) + minutes,
    note: note?.trim() || existing?.note,
  };
  return [merged, ...entries.filter((e) => e.date !== date)];
}

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

/**
 * 계정 인식 기도시간 훅.
 * - 로그인한 성도(Supabase): 서버에 계정별로 저장되어 기기를 바꿔도 유지됩니다.
 * - 비로그인/샘플 모드: 지금처럼 이 기기에만 저장됩니다.
 */
export function usePrayerTime(kind: PrayerKind) {
  const { user } = useAuth();
  const server = dataMode === 'supabase' && !!user;
  const storageKey = KEY_BY_KIND[kind];

  const [entries, setEntries] = useState<PrayerLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const load = async (): Promise<PrayerLogEntry[]> => {
      if (server) {
        const rows = await repository.listMyPrayerTime();
        return rows
          .filter((r) => r.kind === kind)
          .map((r) => ({ date: r.date, minutes: r.minutes }));
      }
      return readLog(storageKey);
    };
    load()
      .then((loaded) => {
        if (active) {
          setEntries(loaded);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setEntries([]);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [server, kind, storageKey, nonce]);

  const addMinutes = useCallback(
    async (minutes: number, note?: string) => {
      if (minutes <= 0) return;
      const today = toDateKey();
      // 화면을 먼저 올려 두고, 저장은 뒤에서 처리합니다.
      setEntries((prev) => mergeToday(prev, today, minutes, note));
      if (server) {
        await repository.addMyPrayerTime(kind, today, minutes);
      } else {
        const next = mergeToday(entries, today, minutes, note);
        await AsyncStorage.setItem(storageKey, JSON.stringify(next));
      }
    },
    [server, kind, entries, storageKey],
  );

  const clearToday = useCallback(async () => {
    const today = toDateKey();
    setEntries((prev) => prev.filter((e) => e.date !== today));
    if (server) {
      await repository.clearMyPrayerTime(kind, today);
    } else {
      const next = entries.filter((e) => e.date !== today);
      await AsyncStorage.setItem(storageKey, JSON.stringify(next));
    }
  }, [server, kind, entries, storageKey]);

  const today = entries.find((e) => e.date === toDateKey());
  const totalMinutes = entries.reduce((sum, e) => sum + e.minutes, 0);

  return {
    entries,
    loading,
    server,
    reload,
    todayMinutes: today?.minutes ?? 0,
    streak: calculateStreak(entries),
    week: recentDays(entries, 7),
    totalMinutes,
    addMinutes,
    clearToday,
  };
}

/** 로그인 계정에 아직 옮기지 않은 이 기기의 기도시간(분) 합계. 0 이면 가져올 것이 없습니다. */
export async function pendingLocalPrayerMinutes(): Promise<number> {
  let total = 0;
  for (const kind of ['communal', 'personal'] as PrayerKind[]) {
    const synced = await AsyncStorage.getItem(syncedFlagKey(kind));
    if (synced === 'true') continue;
    const local = await readLog(KEY_BY_KIND[kind]);
    total += local.reduce((sum, e) => sum + e.minutes, 0);
  }
  return total;
}

/** 이 기기에 저장된 기도시간을 로그인 계정(서버)으로 1회 옮깁니다. 중복 반영되지 않도록 플래그를 남깁니다. */
export async function syncLocalPrayerTimeToAccount(): Promise<void> {
  for (const kind of ['communal', 'personal'] as PrayerKind[]) {
    const synced = await AsyncStorage.getItem(syncedFlagKey(kind));
    if (synced === 'true') continue;
    const local = await readLog(KEY_BY_KIND[kind]);
    for (const entry of local) {
      if (entry.minutes > 0) {
        await repository.addMyPrayerTime(kind, entry.date, entry.minutes);
      }
    }
    await AsyncStorage.setItem(syncedFlagKey(kind), 'true');
  }
}

function syncedFlagKey(kind: PrayerKind): string {
  return `church-app/prayer-synced/${kind}`;
}

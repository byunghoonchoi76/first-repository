import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import type { PrayerKind } from '@/lib/data/types';

/**
 * 주간 기도 목표(분). 달성률 게이지의 기준이 됩니다.
 * 이 기기에 저장되며, 종류(개인·공동)별로 따로 둡니다.
 */
const KEY = (kind: PrayerKind) => `church-app/prayer-goal/${kind}`;

/** 기본 목표: 개인 3시간 30분(210분), 공동 1시간(60분) */
const DEFAULT_GOAL: Record<PrayerKind, number> = { personal: 210, communal: 60 };

/** 목표 조절 단위(분)와 허용 범위 */
export const GOAL_STEP = 30;
export const GOAL_MIN = 30;
export const GOAL_MAX = 60 * 20; // 20시간

export function useWeeklyGoal(kind: PrayerKind) {
  const [goal, setGoalState] = useState<number>(DEFAULT_GOAL[kind]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    AsyncStorage.getItem(KEY(kind))
      .then((raw) => {
        if (!active) return;
        const parsed = raw ? parseInt(raw, 10) : NaN;
        setGoalState(Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_GOAL[kind]);
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [kind]);

  const setGoal = useCallback(
    (next: number) => {
      const clamped = Math.min(GOAL_MAX, Math.max(GOAL_MIN, next));
      setGoalState(clamped);
      void AsyncStorage.setItem(KEY(kind), String(clamped));
    },
    [kind],
  );

  return { goal, setGoal, loading };
}

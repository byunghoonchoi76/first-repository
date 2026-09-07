import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import type { PrayerKind } from '@/lib/data/types';

/**
 * 주간 기도 목표(분). 달성률 게이지의 기준이 됩니다.
 * 이 기기에 저장되며, 종류(개인·공동)별로 따로 둡니다.
 */
const KEY = (kind: PrayerKind) => `church-app/prayer-goal/${kind}`;

/** 종류별 목표 설정(모두 '분' 단위)
 *  - 개인: 나 한 사람의 주간 기도 목표 (최대 24시간)
 *  - 공동: 온 성도가 함께 채우는 목표. 전교인 규모를 고려해 아주 크게 잡을 수 있습니다.
 *          예) 2,000명 × 365일 × 1시간 = 730,000시간
 */
export interface GoalConfig {
  default: number; // 분
  min: number; // 분
  max: number; // 분
  step: number; // ± 버튼 단위(분)
}

export const GOAL_CONFIG: Record<PrayerKind, GoalConfig> = {
  personal: { default: 210, min: 30, max: 60 * 24, step: 30 },
  communal: { default: 60 * 100, min: 60, max: 60 * 730000, step: 60 * 10 }, // 최대 730,000시간, ±10시간
};

// 이전 코드 호환용(개인 기준). 새 코드는 GOAL_CONFIG[kind]를 쓰세요.
export const GOAL_STEP = GOAL_CONFIG.personal.step;
export const GOAL_MIN = GOAL_CONFIG.personal.min;
export const GOAL_MAX = GOAL_CONFIG.personal.max;

export function useWeeklyGoal(kind: PrayerKind) {
  const cfg = GOAL_CONFIG[kind];
  const [goal, setGoalState] = useState<number>(cfg.default);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    AsyncStorage.getItem(KEY(kind))
      .then((raw) => {
        if (!active) return;
        const parsed = raw ? parseInt(raw, 10) : NaN;
        setGoalState(Number.isFinite(parsed) && parsed > 0 ? parsed : cfg.default);
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [kind]);

  const setGoal = useCallback(
    (next: number) => {
      const clamped = Math.min(cfg.max, Math.max(cfg.min, Math.round(next)));
      setGoalState(clamped);
      void AsyncStorage.setItem(KEY(kind), String(clamped));
    },
    [kind, cfg.max, cfg.min],
  );

  return { goal, setGoal, loading };
}

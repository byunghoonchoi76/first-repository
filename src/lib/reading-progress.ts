import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/**
 * 맥체인 성경읽기표 '읽기 완료' 진도 저장 (이 기기에만 저장, 로그인 불필요).
 * 완료한 날은 표의 인덱스(0~364)로 기억합니다.
 */
const KEY = 'church-app/mccheyne-done';

export function useReadingProgress() {
  const [done, setDone] = useState<Set<number>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!active) return;
        try {
          if (raw) setDone(new Set(JSON.parse(raw) as number[]));
        } catch {
          /* 저장값 손상 시 무시 */
        }
        setReady(true);
      })
      .catch(() => active && setReady(true));
    return () => {
      active = false;
    };
  }, []);

  const toggle = useCallback((idx: number) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      AsyncStorage.setItem(KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  return { done, ready, toggle, count: done.size };
}

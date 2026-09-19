import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/lib/auth';
import { dataMode, repository } from '@/lib/data';

/**
 * 맥체인 성경읽기표 '읽기 완료' 진도.
 * - 로그인(계정) 상태면 서버에 저장해 여러 기기에서 공유됩니다.
 * - 로그인 전/샘플 모드면 이 기기(AsyncStorage)에만 저장합니다.
 * - 처음 로그인하면 기기에 있던 진도를 계정으로 한 번 합칩니다.
 * 완료한 날은 표의 인덱스(0~364)로 기억합니다.
 */
const KEY = 'church-app/mccheyne-done';

async function readLocal(): Promise<Set<number>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return new Set(JSON.parse(raw) as number[]);
  } catch {
    /* 무시 */
  }
  return new Set();
}

async function writeLocal(set: Set<number>): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify([...set]));
  } catch {
    /* 무시 */
  }
}

export function useReadingProgress() {
  const { user } = useAuth();
  const server = dataMode === 'supabase' && !!user;
  const [done, setDone] = useState<Set<number>>(new Set());
  const [ready, setReady] = useState(false);
  const serverRef = useRef(server);
  serverRef.current = server;

  useEffect(() => {
    let active = true;
    (async () => {
      const local = await readLocal();
      if (!server) {
        if (active) {
          setDone(local);
          setReady(true);
        }
        return;
      }
      // 계정 진도 + 기기 진도를 합쳐(한 번) 계정에 저장하고, 계정 값을 기준으로 씁니다.
      try {
        const account = new Set(await repository.getMyReadingProgress());
        const merged = new Set<number>([...account, ...local]);
        if (merged.size !== account.size) await repository.setMyReadingProgress([...merged]);
        if (active) setDone(merged);
      } catch {
        if (active) setDone(local); // 서버 실패 시 로컬로 표시
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [server, user?.id]);

  const toggle = useCallback((idx: number) => {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      if (serverRef.current) repository.setMyReadingProgress([...next]).catch(() => {});
      else void writeLocal(next);
      return next;
    });
  }, []);

  return { done, ready, toggle, count: done.size, synced: server };
}

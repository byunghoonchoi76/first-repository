import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { hasSupabaseConfig, supabase } from '@/lib/supabase';

/**
 * 실시간 예배 방송 여부 — Supabase 함수(live-status)에 물어봐서
 * 유튜브 채널이 "지금" 라이브 중인지 확인합니다.
 * 방송 중이면 그 라이브 영상 주소(watchUrl)까지 함께 돌려줍니다.
 */
export interface LiveStatus {
  live: boolean;
  watchUrl: string | null;
  title: string | null;
}

const IDLE: LiveStatus = { live: false, watchUrl: null, title: null };

// 화면에 있는 동안 이 간격으로 다시 확인합니다.
const POLL_MS = 60_000;

export function useLiveStatus(): LiveStatus {
  const [status, setStatus] = useState<LiveStatus>(IDLE);

  useEffect(() => {
    // Supabase(서버)가 없으면(샘플 모드) 확인할 방법이 없으니 조용히 넘어갑니다.
    if (!hasSupabaseConfig || !supabase) return;

    let active = true;

    const check = async () => {
      try {
        const { data, error } = await supabase!.functions.invoke('live-status');
        if (!active || error || !data) return;
        setStatus({
          live: Boolean(data.live),
          watchUrl: data.watchUrl ?? null,
          title: data.title ?? null,
        });
      } catch {
        // 확인 실패 시에는 배지를 켜지 않도록 그대로 둡니다.
      }
    };

    void check();
    const timer = setInterval(() => void check(), POLL_MS);
    // 앱을 다시 열었을 때 즉시 한 번 더 확인합니다.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });

    return () => {
      active = false;
      clearInterval(timer);
      sub.remove();
    };
  }, []);

  return status;
}

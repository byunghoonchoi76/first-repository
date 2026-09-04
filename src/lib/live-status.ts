import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { hasSupabaseConfig, supabase } from '@/lib/supabase';

/**
 * 실시간 예배 방송 표시.
 *  - 관리자 강제 스위치(app_settings.live_override): 'on' 강제 켜기 / 'off' 강제 끄기 / 'auto' 자동
 *  - 'auto' 일 때는 Supabase 함수(live-status)로 유튜브 라이브 여부를 자동 감지합니다.
 * 강제 'on' 은 함수 배포·유튜브 키가 없어도 바로 배지를 켤 수 있습니다.
 */
export type LiveOverride = 'auto' | 'on' | 'off';

export interface LiveStatus {
  live: boolean;
  watchUrl: string | null;
  title: string | null;
}

const IDLE: LiveStatus = { live: false, watchUrl: null, title: null };
const OVERRIDE_KEY = 'church-app/live-override';
const POLL_MS = 60_000;

function normalizeOverride(value: unknown): LiveOverride {
  return value === 'on' || value === 'off' ? value : 'auto';
}

/** 현재 강제 스위치 값을 읽습니다. (Supabase 설정이 없으면 이 기기에만 저장된 값) */
export async function getLiveOverride(): Promise<LiveOverride> {
  if (hasSupabaseConfig && supabase) {
    try {
      const { data } = await supabase.from('app_settings').select('live_override').eq('id', 1).maybeSingle();
      return normalizeOverride(data?.live_override);
    } catch {
      return 'auto';
    }
  }
  try {
    return normalizeOverride(await AsyncStorage.getItem(OVERRIDE_KEY));
  } catch {
    return 'auto';
  }
}

/** 강제 스위치 값을 저장합니다. (Supabase 모드에서는 관리자만 가능) */
export async function setLiveOverride(mode: LiveOverride): Promise<void> {
  if (hasSupabaseConfig && supabase) {
    const { error } = await supabase
      .from('app_settings')
      .update({ live_override: mode, updated_at: new Date().toISOString() })
      .eq('id', 1);
    if (error) throw new Error(error.message);
    return;
  }
  await AsyncStorage.setItem(OVERRIDE_KEY, mode);
}

/** 유튜브 자동 감지 결과 (Supabase 함수 호출). 설정이 없으면 감지하지 않습니다. */
async function detect(): Promise<LiveStatus> {
  if (!hasSupabaseConfig || !supabase) return IDLE;
  try {
    const { data, error } = await supabase.functions.invoke('live-status');
    if (error || !data) return IDLE;
    return { live: Boolean(data.live), watchUrl: data.watchUrl ?? null, title: data.title ?? null };
  } catch {
    return IDLE;
  }
}

export function useLiveStatus(): LiveStatus {
  const [status, setStatus] = useState<LiveStatus>(IDLE);

  const check = useCallback(async () => {
    const override = await getLiveOverride();
    if (override === 'off') {
      setStatus(IDLE);
      return;
    }
    if (override === 'on') {
      // 강제 켜기: 라이브 영상 링크가 있으면 함께 쓰되, 감지에 실패해도 배지는 켭니다.
      const detected = await detect();
      setStatus({ live: true, watchUrl: detected.watchUrl, title: detected.title });
      return;
    }
    // auto: 유튜브 자동 감지 결과를 그대로 사용
    setStatus(await detect());
  }, []);

  useEffect(() => {
    let active = true;
    const run = () => {
      if (active) void check();
    };
    const timer = setInterval(run, POLL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => {
      active = false;
      clearInterval(timer);
      sub.remove();
    };
  }, [check]);

  // 홈 탭으로 돌아올 때(관리자가 스위치를 바꾼 직후 등) 즉시 다시 확인합니다.
  useFocusEffect(
    useCallback(() => {
      void check();
    }, [check]),
  );

  return status;
}

/** 관리자 화면용 — 현재 강제 스위치 값과 변경 함수를 제공합니다. */
export function useLiveOverride() {
  const [mode, setMode] = useState<LiveOverride>('auto');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void getLiveOverride().then((m) => {
      if (active) {
        setMode(m);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const update = useCallback(
    async (next: LiveOverride) => {
      const prev = mode;
      setMode(next); // 먼저 화면에 반영
      setSaving(true);
      try {
        await setLiveOverride(next);
      } catch (e) {
        setMode(prev); // 실패하면 되돌립니다.
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [mode],
  );

  return { mode, setMode: update, loading, saving };
}

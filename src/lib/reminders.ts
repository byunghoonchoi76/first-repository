import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/lib/auth';
import { hasSupabaseConfig, supabase } from '@/lib/supabase';

/**
 * 기도 알림(웹 푸시).
 * - 사용자가 요일·시간을 정하면 이 기기의 구독 정보를 Supabase(push_subscriptions)에 저장합니다.
 * - 서버(send-reminders 함수)가 매분 확인해, 지정한 요일·시간에 이 기기로 푸시를 보냅니다.
 * - 웹에서만 동작합니다. (앱을 홈 화면에 추가하면 더 안정적으로 옵니다.)
 */

// VAPID 공개키 — 비밀이 아니며 앱에 넣어도 됩니다. (개인키는 Supabase 시크릿에만 둡니다.)
export const VAPID_PUBLIC_KEY = 'BPKaSQlaWOw4kO6oT5PMbWKeLK2AjYaA25wuA4t1O1asLehbbvvcAMI0auV9jy16VtOCV-31wb3QeUM43x_hRS0';

export interface ReminderState {
  supported: boolean;
  reason?: string;
  permission: NotificationPermission | 'unsupported';
  enabled: boolean;
  days: number[]; // 0(일)~6(토)
  hour: number;
  minute: number;
}

const DEFAULT_STATE: ReminderState = {
  supported: false,
  permission: 'unsupported',
  enabled: false,
  days: [0, 3], // 기본: 일·수
  hour: 21,
  minute: 0,
};

function basePath(): string {
  if (typeof location === 'undefined') return '';
  return location.pathname.startsWith('/first-repository') ? '/first-repository' : '';
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i);
  return arr;
}

function isSupported(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const url = `${basePath()}/sw.js`;
  const scope = `${basePath()}/`;
  const existing = await navigator.serviceWorker.getRegistration(scope);
  const reg = existing ?? (await navigator.serviceWorker.register(url, { scope }));
  await navigator.serviceWorker.ready;
  return reg;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** 기도 알림 설정 훅 (웹 전용). */
export function useReminders() {
  const { user } = useAuth();
  const [state, setState] = useState<ReminderState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // 초기: 지원 여부 + 이 기기의 기존 구독 설정을 불러옵니다.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!isSupported()) {
        if (active) {
          setState((s) => ({ ...s, supported: false, reason: '이 브라우저·기기에서는 알림을 지원하지 않습니다.' }));
          setLoading(false);
        }
        return;
      }
      if (!hasSupabaseConfig || !supabase) {
        if (active) {
          setState((s) => ({ ...s, supported: false, reason: '알림을 저장할 서버(Supabase)가 연결되어 있지 않습니다.' }));
          setLoading(false);
        }
        return;
      }
      const permission = Notification.permission;
      let loaded: Partial<ReminderState> = {};
      try {
        const reg = await navigator.serviceWorker.getRegistration(`${basePath()}/`);
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        if (sub) {
          const { data } = await supabase
            .from('push_subscriptions')
            .select('days, time_hhmm, enabled')
            .eq('endpoint', sub.endpoint)
            .maybeSingle();
          if (data) {
            const [h, m] = String(data.time_hhmm ?? '21:00').split(':').map((x) => parseInt(x, 10));
            loaded = {
              enabled: Boolean(data.enabled),
              days: Array.isArray(data.days) ? data.days : DEFAULT_STATE.days,
              hour: Number.isFinite(h) ? h : 21,
              minute: Number.isFinite(m) ? m : 0,
            };
          }
        }
      } catch {
        // 불러오기 실패해도 기본값으로 진행합니다.
      }
      if (active) {
        setState((s) => ({ ...s, ...loaded, supported: true, permission }));
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const setDays = useCallback((days: number[]) => setState((s) => ({ ...s, days })), []);
  const setTime = useCallback((hour: number, minute: number) => setState((s) => ({ ...s, hour, minute })), []);

  /** 알림 켜기: 권한 요청 → 구독 → 서버 저장 */
  const enable = useCallback(async () => {
    if (!isSupported() || !supabase) return;
    setBusy(true);
    setError(undefined);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState((s) => ({ ...s, permission, enabled: false }));
        setError('알림 권한이 허용되지 않았습니다. 브라우저 설정에서 알림을 허용해 주세요.');
        return;
      }
      const reg = await getRegistration();
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
        }));
      const json = sub.toJSON();
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { error: upErr } = await supabase.from('push_subscriptions').upsert(
        {
          endpoint: sub.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
          user_id: user?.id ?? null,
          days: state.days,
          time_hhmm: `${pad2(state.hour)}:${pad2(state.minute)}`,
          tz,
          enabled: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' },
      );
      if (upErr) throw new Error(upErr.message);
      setState((s) => ({ ...s, permission, enabled: true }));
    } catch (e) {
      setError(e instanceof Error ? e.message : '알림을 켜지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }, [state.days, state.hour, state.minute, user]);

  /** 요일·시간 저장(이미 켜진 상태에서 변경) */
  const save = useCallback(async () => {
    if (!isSupported() || !supabase) return;
    setBusy(true);
    setError(undefined);
    try {
      const reg = await navigator.serviceWorker.getRegistration(`${basePath()}/`);
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (!sub) {
        await enable();
        return;
      }
      const { error: upErr } = await supabase
        .from('push_subscriptions')
        .update({
          days: state.days,
          time_hhmm: `${pad2(state.hour)}:${pad2(state.minute)}`,
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
          enabled: true,
          updated_at: new Date().toISOString(),
        })
        .eq('endpoint', sub.endpoint);
      if (upErr) throw new Error(upErr.message);
      setState((s) => ({ ...s, enabled: true }));
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }, [state.days, state.hour, state.minute, enable]);

  /** 알림 끄기 */
  const disable = useCallback(async () => {
    if (!isSupported() || !supabase) return;
    setBusy(true);
    setError(undefined);
    try {
      const reg = await navigator.serviceWorker.getRegistration(`${basePath()}/`);
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await supabase.from('push_subscriptions').update({ enabled: false }).eq('endpoint', sub.endpoint);
      }
      setState((s) => ({ ...s, enabled: false }));
    } catch (e) {
      setError(e instanceof Error ? e.message : '알림을 끄지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, loading, busy, error, setDays, setTime, enable, save, disable };
}

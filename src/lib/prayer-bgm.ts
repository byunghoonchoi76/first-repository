import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { ChurchInfo } from '@/constants/church';

/**
 * 기도 타이머 배경음(BGM).
 *
 * - 기본: 앱이 직접 합성하는 잔잔한 패드음(저작권/파일 불필요, 오프라인 동작).
 * - 교회 음원이 있으면 ChurchInfo.prayerBgmUrl 에 mp3 링크를 넣으면 그 음원을 대신 재생합니다.
 * - 웹(PWA) 전용입니다. 네이티브에서는 조용히 아무 동작도 하지 않습니다.
 *
 * 재생은 반드시 사용자 동작(기도 시작·켜기 버튼) 안에서 호출해야 브라우저 자동재생 정책을 통과합니다.
 */

const PREF_KEY = 'church-app/prayer-bgm';

type BgmEngine = { start: () => void; stop: () => void };

// ── 교회 음원(URL) 재생 ───────────────────────────────────────────
function createTrackEngine(url: string): BgmEngine {
  let audio: HTMLAudioElement | null = null;
  return {
    start() {
      try {
        if (!audio) {
          audio = new (globalThis as { Audio: typeof Audio }).Audio(url);
          audio.loop = true;
          audio.volume = 0.4;
        }
        void audio.play().catch(() => {});
      } catch {
        /* 재생 실패는 조용히 무시합니다. */
      }
    },
    stop() {
      try {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
      } catch {
        /* noop */
      }
    },
  };
}

// ── 내장 잔잔한 배경음(Web Audio 합성) ─────────────────────────────
function createAmbientEngine(): BgmEngine {
  // 느슨한 타입: RN 환경에서도 tsc 를 통과하도록 any 로 둡니다.
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let nodes: OscillatorNode[] = [];

  const build = () => {
    const AC: typeof AudioContext | undefined =
      (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ||
      (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;

    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    filter.Q.value = 0.3;
    filter.connect(master);

    // C3 · G3 · C4 — 편안한 완전5도/옥타브 화음
    const freqs = [130.81, 196.0, 261.63];
    for (const f of freqs) {
      const g = ctx.createGain();
      g.gain.value = 0.16;
      g.connect(filter);
      // 살짝 디튜닝한 두 사인파를 겹쳐 따뜻한 패드음을 만듭니다.
      for (const mult of [1, 1.006]) {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f * mult;
        o.connect(g);
        o.start();
        nodes.push(o);
      }
    }

    // 아주 느린 LFO 로 필터를 흔들어 음색에 미세한 움직임을 줍니다.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    nodes.push(lfo);
  };

  return {
    start() {
      try {
        if (!ctx) build();
        if (!ctx || !master) return;
        if (ctx.state === 'suspended') void ctx.resume();
        const now = ctx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
        master.gain.exponentialRampToValueAtTime(0.1, now + 2.5); // 은은하게 페이드인
      } catch {
        /* noop */
      }
    },
    stop() {
      if (!ctx || !master) return;
      const c = ctx;
      const m = master;
      const ns = nodes;
      ctx = null;
      master = null;
      nodes = [];
      try {
        const now = c.currentTime;
        m.gain.cancelScheduledValues(now);
        m.gain.setValueAtTime(m.gain.value, now);
        m.gain.exponentialRampToValueAtTime(0.0001, now + 1.0); // 페이드아웃
        setTimeout(() => {
          ns.forEach((n) => {
            try {
              n.stop();
            } catch {
              /* noop */
            }
          });
          void c.close().catch(() => {});
        }, 1100);
      } catch {
        /* noop */
      }
    },
  };
}

let engine: BgmEngine | null = null;
function getEngine(): BgmEngine | null {
  if (Platform.OS !== 'web') return null;
  if (!engine) {
    engine = ChurchInfo.prayerBgmUrl ? createTrackEngine(ChurchInfo.prayerBgmUrl) : createAmbientEngine();
  }
  return engine;
}

/** 기도 배경음 상태·조작 훅. */
export function usePrayerBgm() {
  const available = Platform.OS === 'web';
  const [enabled, setEnabledState] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(PREF_KEY)
      .then((v) => {
        if (v === 'off') setEnabledState(false);
      })
      .catch(() => {});
  }, []);

  const start = useCallback(() => {
    if (available) getEngine()?.start();
  }, [available]);

  const stop = useCallback(() => {
    getEngine()?.stop();
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next);
    void AsyncStorage.setItem(PREF_KEY, next ? 'on' : 'off').catch(() => {});
  }, []);

  return { available, enabled, setEnabled, start, stop };
}

import { Platform } from 'react-native';

/**
 * 유튜브 주소를 앱 안에서 재생할 수 있는 형태로 해석합니다.
 * 일반 영상 · 쇼츠 · 라이브 · 짧은 주소(youtu.be)를 모두 지원합니다.
 */

export type YouTubeKind = 'video' | 'shorts' | 'live';

export interface YouTubeRef {
  videoId: string;
  kind: YouTubeKind;
  /** 앱/웹에 그대로 끼워 넣을 수 있는 재생 주소 */
  embedUrl: string;
  /** 쇼츠처럼 세로 영상이면 true */
  portrait: boolean;
  /** 유튜브 앱·웹에서 열 때 쓰는 원래 주소 */
  watchUrl: string;
}

const ID = '[A-Za-z0-9_-]{6,}';

const PATTERNS: { re: RegExp; kind: YouTubeKind }[] = [
  { re: new RegExp(`youtube\\.com/watch\\?(?:.*&)?v=(${ID})`), kind: 'video' },
  { re: new RegExp(`youtu\\.be/(${ID})`), kind: 'video' },
  { re: new RegExp(`youtube\\.com/embed/(${ID})`), kind: 'video' },
  { re: new RegExp(`youtube\\.com/v/(${ID})`), kind: 'video' },
  { re: new RegExp(`youtube\\.com/shorts/(${ID})`), kind: 'shorts' },
  { re: new RegExp(`youtube\\.com/live/(${ID})`), kind: 'live' },
];

/** 유튜브 영상 주소면 재생 정보를, 아니면(채널 주소·오디오 파일 등) null 을 돌려줍니다. */
export function parseYouTubeUrl(url: string | undefined | null): YouTubeRef | null {
  if (!url) return null;
  const trimmed = url.trim();

  for (const { re, kind } of PATTERNS) {
    const match = trimmed.match(re);
    if (match?.[1]) {
      const videoId = match[1];
      return {
        videoId,
        kind,
        // playsinline: 휴대폰에서 전체화면으로 튀지 않고 화면 안에서 재생
        // rel=0: 재생이 끝나도 같은 채널 영상만 제안
        embedUrl: `https://www.youtube.com/embed/${videoId}?playsinline=1&rel=0&modestbranding=1`,
        portrait: kind === 'shorts',
        watchUrl:
          kind === 'shorts'
            ? `https://www.youtube.com/shorts/${videoId}`
            : `https://www.youtube.com/watch?v=${videoId}`,
      };
    }
  }
  return null;
}

/** 유튜브 채널 주소인지 (개별 영상이 아니라 채널로 연결되는 경우) */
export function isYouTubeChannelUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return /youtube\.com\/(@|c\/|channel\/|user\/)/.test(url) && !parseYouTubeUrl(url);
}

/** 유튜브가 공개로 제공하는 썸네일 주소 (별도 설정 없이 바로 쓸 수 있습니다) */
export function youtubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

// 같은 영상을 여러 화면에서 열어도 한 번만 불러오도록 기억해 둡니다.
const titleCache = new Map<string, string>();

/**
 * 유튜브 영상 제목을 가져옵니다. API 키가 필요 없는 oEmbed 를 먼저 쓰고,
 * 브라우저에서 막히는 경우를 대비해 noembed 로 한 번 더 시도합니다.
 * 실패하면 null 을 돌려주고, 화면은 저장된 제목을 그대로 씁니다.
 */
export async function fetchYouTubeTitle(url: string): Promise<string | null> {
  const ref = parseYouTubeUrl(url);
  if (!ref) return null;

  const cached = titleCache.get(ref.videoId);
  if (cached) return cached;

  const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(ref.watchUrl)}&format=json`;
  const noembed = `https://noembed.com/embed?url=${encodeURIComponent(ref.watchUrl)}`;

  // 웹 브라우저에서는 유튜브 oEmbed 가 CORS 로 막히므로 noembed 를 먼저 씁니다.
  // 앱(iOS·안드로이드)에서는 그런 제약이 없어 유튜브를 먼저 부릅니다.
  const endpoints = Platform.OS === 'web' ? [noembed, oembed] : [oembed, noembed];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) continue;
      const json = (await response.json()) as { title?: string };
      const title = json.title?.trim();
      if (title) {
        titleCache.set(ref.videoId, title);
        return title;
      }
    } catch {
      // 다음 방법으로 넘어갑니다.
    }
  }
  return null;
}

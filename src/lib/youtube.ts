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

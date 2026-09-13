// 교회 유튜브 채널 최신 영상 목록 — 설교 자동 노출·가져오기에 사용합니다.
//
// 앱이 이 함수를 호출하면, 서버(Supabase)가 유튜브에서 채널의 최근 업로드 영상을 가져와
// { videos: [{ videoId, title, publishedAt, thumbnail, description }] } 형태로 돌려줍니다.
// 유튜브 API 키는 이 함수(서버) 안에만 두므로 앱 코드에는 노출되지 않습니다.
//
// 필요 시크릿(Edge Functions → Secrets) — 실시간 배지(live-status)와 같은 키를 씁니다:
//   YOUTUBE_API_KEY   (필수)
//   (선택) YT_HANDLE=@mychmedia , YT_CHANNEL_ID=UC...
// 배포:  Verify JWT 끄고 배포.

const HANDLE = (Deno.env.get('YT_HANDLE') ?? '@mychmedia').replace(/^@?/, '@');
const API_KEY = Deno.env.get('YOUTUBE_API_KEY') ?? '';
const CHANNEL_ID_ENV = Deno.env.get('YT_CHANNEL_ID') ?? '';
const MAX = 15;

// 유튜브 할당량 절약: 결과를 10분간 재사용합니다. (업로드 후 최대 10분 내 노출)
const CACHE_TTL_MS = 600_000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface Video {
  videoId: string;
  title: string;
  publishedAt: string;
  thumbnail: string;
  description: string;
  /** 유튜브 쇼츠(세로 단편) 여부 — 앱에서 '쇼츠' 카테고리로만 분류하는 데 씁니다. */
  isShort: boolean;
}

/**
 * '/shorts/{id}' 주소가 리다이렉트되는지로 '유튜브 쇼츠 등록' 여부를 봅니다.
 * (쇼츠면 200, 일반 영상이면 watch 로 리다이렉트)
 */
async function probeShortsUrl(videoId: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${videoId}`, {
      method: 'HEAD',
      redirect: 'manual',
      signal: controller.signal,
    });
    return res.status >= 200 && res.status < 300;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** JPEG 바이트에서 실제 가로·세로 픽셀 크기를 읽습니다. (SOF 마커) */
function readJpegSize(buf: Uint8Array): { w: number; h: number } | null {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = buf[i + 1];
    // SOF0~SOF15 (해상도 정보). DHT(C4)·DAC(CC)·RSTn 은 제외.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const h = (buf[i + 5] << 8) | buf[i + 6];
      const w = (buf[i + 7] << 8) | buf[i + 8];
      return { w, h };
    }
    const len = (buf[i + 2] << 8) | buf[i + 3];
    if (len <= 0) break;
    i += 2 + len;
  }
  return null;
}

/**
 * 원본 비율(oardefault) 썸네일을 읽어 9:16 등 '세로 영상'인지 판별합니다.
 * 이 썸네일은 영상이 16:9 가 아닐 때만 생성되므로, 존재하고 세로이면 쇼츠로 봅니다.
 */
async function probeVertical(videoId: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const res = await fetch(`https://i.ytimg.com/vi/${videoId}/oardefault.jpg`, {
      signal: controller.signal,
    });
    if (!res.ok) return false;
    const size = readJpegSize(new Uint8Array(await res.arrayBuffer()));
    return Boolean(size && size.h > size.w);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 영상이 쇼츠인지 확인합니다. 유튜브 Data API 는 쇼츠 여부를 알려주지 않으므로
 * ① 쇼츠 URL 리다이렉트, ② 실제 세로(9:16) 비율 두 신호로 판별합니다.
 * 둘 다 실패하면 false 로 두어 제목 기반 판별에 맡깁니다.
 */
async function detectShort(videoId: string): Promise<boolean> {
  const [isShortsUrl, isVertical] = await Promise.all([
    probeShortsUrl(videoId),
    probeVertical(videoId),
  ]);
  return isShortsUrl || isVertical;
}

/** 제목만으로 보는 임시 쇼츠 판별 (네트워크 없이 즉시). 정확 판별 전 대체값으로 씁니다. */
function titleIsShort(title: string): boolean {
  return /#?shorts|쇼츠/i.test(title ?? '');
}

// 한 번 정확히 판별한 영상은 기억해 둡니다(다음 호출부터는 확인하지 않음 → 빠름).
const shortCache = new Map<string, boolean>();
// 아직 판별 못 한 영상이 남아 있으면 짧게만 캐시해 곧 정확값으로 보정합니다.
const CACHE_TTL_PARTIAL_MS = 30_000;

let cache: { at: number; data: Video[]; ttl: number } | null = null;
let cachedUploads = '';

/** 채널 ID(UC...)에서 '업로드 재생목록 ID(UU...)'를 얻습니다. */
async function resolveUploadsPlaylist(): Promise<string> {
  if (cachedUploads) return cachedUploads;

  let channelId = CHANNEL_ID_ENV;
  if (!channelId) {
    const handleParam = HANDLE.replace(/^@/, '');
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=${handleParam}&key=${API_KEY}`,
    );
    const json = await res.json();
    cachedUploads = json?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads ?? '';
    return cachedUploads;
  }

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${API_KEY}`,
  );
  const json = await res.json();
  cachedUploads = json?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads ?? '';
  return cachedUploads;
}

async function getVideos(): Promise<Video[]> {
  if (cache && Date.now() - cache.at < cache.ttl) return cache.data;
  if (!API_KEY) return [];

  const uploads = await resolveUploadsPlaylist();
  if (!uploads) return [];

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploads}` +
      `&maxResults=${MAX}&key=${API_KEY}`,
  );
  const json = await res.json();
  const items: unknown[] = json?.items ?? [];

  const videos: Video[] = items
    .map((raw) => {
      const sn = (raw as { snippet?: Record<string, unknown> }).snippet ?? {};
      const resourceId = (sn.resourceId as { videoId?: string }) ?? {};
      const thumbs = (sn.thumbnails as Record<string, { url?: string }>) ?? {};
      const thumb = thumbs.medium?.url ?? thumbs.high?.url ?? thumbs.default?.url ?? '';
      return {
        videoId: resourceId.videoId ?? '',
        title: String(sn.title ?? ''),
        publishedAt: String(sn.publishedAt ?? ''),
        thumbnail: thumb,
        description: String(sn.description ?? '').slice(0, 500),
        isShort: false,
      };
    })
    .filter((v) => v.videoId && v.title !== 'Private video' && v.title !== 'Deleted video');

  // 쇼츠 여부는 이미 아는 값이 있으면 그걸, 없으면 제목 기반 임시값을 씁니다(대기 없음 → 빠름).
  videos.forEach((v) => {
    v.isShort = shortCache.get(v.videoId) ?? titleIsShort(v.title);
  });

  // 아직 판별 안 된 영상은 '백그라운드'에서 확인해 캐시에 채웁니다.
  // 응답을 기다리게 하지 않으므로 목록이 즉시 반환됩니다. (정확값은 곧 다음 호출에 반영)
  const unknown = videos.filter((v) => !shortCache.has(v.videoId));
  if (unknown.length > 0) {
    const bg = Promise.all(
      unknown.map(async (v) => {
        try {
          shortCache.set(v.videoId, await detectShort(v.videoId));
        } catch {
          /* 다음 호출에서 다시 시도 */
        }
      }),
    );
    // 응답을 보낸 뒤에도 백그라운드 작업이 끝나도록 인스턴스를 잠깐 살려 둡니다.
    try {
      (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime?.waitUntil?.(bg);
    } catch {
      /* waitUntil 미지원 환경에서는 그냥 진행 */
    }
  }

  // 아직 판별 못 한 영상이 남아 있으면 짧게 캐시(30초)해 곧 정확값으로 갱신,
  // 모두 판별됐으면 평소대로 10분 캐시합니다.
  const ttl = unknown.length > 0 ? CACHE_TTL_PARTIAL_MS : CACHE_TTL_MS;
  cache = { at: Date.now(), data: videos, ttl };
  return videos;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const videos = await getVideos();
    return new Response(JSON.stringify({ ok: true, videos }), {
      headers: { ...CORS, 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e), videos: [] }), {
      status: 200,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }
});

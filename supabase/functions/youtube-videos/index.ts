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
  const timer = setTimeout(() => controller.abort(), 5000);
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
  const timer = setTimeout(() => controller.abort(), 5000);
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

let cache: { at: number; data: Video[] } | null = null;
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
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;
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

  // 각 영상이 쇼츠인지 병렬로 확인해 표시합니다.
  const shortFlags = await Promise.all(videos.map((v) => detectShort(v.videoId)));
  videos.forEach((v, i) => {
    v.isShort = shortFlags[i];
  });

  cache = { at: Date.now(), data: videos };
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

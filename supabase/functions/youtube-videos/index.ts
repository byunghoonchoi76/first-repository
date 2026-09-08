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
      };
    })
    .filter((v) => v.videoId && v.title !== 'Private video' && v.title !== 'Deleted video');

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

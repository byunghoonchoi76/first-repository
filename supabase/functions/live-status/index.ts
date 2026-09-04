// 실시간 예배 감지 — 유튜브 채널이 "지금" 라이브 방송 중인지 확인해 돌려줍니다.
//
// 앱(웹/모바일)이 이 함수를 호출하면, 함수가 서버(Supabase) 쪽에서 유튜브를 확인하고
// { live, videoId, watchUrl, title } 을 돌려줍니다. 유튜브 API 키는 이 함수 안(서버)에만
// 두므로 앱 코드에는 노출되지 않습니다.
//
// 두 가지 방식이 있으며, 시크릿 설정에 따라 자동으로 골라 씁니다.
//   1) YOUTUBE_API_KEY 시크릿이 있으면 → 공식 YouTube Data API 로 정확히 확인 (하루 할당량 있음)
//   2) 없으면(기본) → 채널의 /live 페이지를 읽어 방송 여부를 판별 (키·할당량 불필요)
//
// 배포:  supabase functions deploy live-status --no-verify-jwt
// (선택) 채널 손잡이:  supabase secrets set YT_HANDLE=@mychmedia
// (선택) 공식 API:     supabase secrets set YOUTUBE_API_KEY=... (+ 필요시 YT_CHANNEL_ID=UC...)

const HANDLE = (Deno.env.get('YT_HANDLE') ?? '@mychmedia').replace(/^@?/, '@');
const API_KEY = Deno.env.get('YOUTUBE_API_KEY') ?? '';
const CHANNEL_ID = Deno.env.get('YT_CHANNEL_ID') ?? '';

// 여러 사람이 동시에 열어도 유튜브를 자주 두드리지 않도록 결과를 잠깐(30초) 재사용합니다.
const CACHE_TTL_MS = 30_000;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface LiveStatus {
  live: boolean;
  videoId: string | null;
  watchUrl: string | null;
  title: string | null;
  source: 'api' | 'scrape';
  checkedAt: string;
}

let cache: { at: number; data: LiveStatus } | null = null;
let cachedChannelId = CHANNEL_ID;

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** 공식 YouTube Data API 로 확인 (YOUTUBE_API_KEY 가 있을 때) */
async function checkViaApi(): Promise<LiveStatus> {
  // 손잡이(@handle)를 채널 ID(UC...)로 한 번만 바꿔 둡니다.
  if (!cachedChannelId) {
    const handleParam = HANDLE.replace(/^@/, '');
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${handleParam}&key=${API_KEY}`,
    );
    const json = await res.json();
    cachedChannelId = json?.items?.[0]?.id ?? '';
  }
  if (!cachedChannelId) {
    return { live: false, videoId: null, watchUrl: null, title: null, source: 'api', checkedAt: new Date().toISOString() };
  }

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${cachedChannelId}` +
      `&eventType=live&type=video&maxResults=1&key=${API_KEY}`,
  );
  const json = await res.json();
  const item = json?.items?.[0];
  const videoId: string | null = item?.id?.videoId ?? null;
  return {
    live: Boolean(videoId),
    videoId,
    watchUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
    title: item?.snippet?.title ?? null,
    source: 'api',
    checkedAt: new Date().toISOString(),
  };
}

/** 채널 /live 페이지를 읽어 방송 여부 판별 (키 없이 동작) */
async function checkViaScrape(): Promise<LiveStatus> {
  const res = await fetch(`https://www.youtube.com/${HANDLE}/live?hl=ko&gl=KR`, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
      'accept-language': 'ko-KR,ko;q=0.9',
      // 유럽 동의(consent) 페이지로 넘어가지 않도록
      cookie: 'CONSENT=YES+cb',
    },
    redirect: 'follow',
  });
  const html = await res.text();

  // 라이브 방송 중이면 /live 가 실제 시청 페이지로 이어지며 아래 신호가 담깁니다.
  const isLiveNow =
    /"isLiveNow"\s*:\s*true/.test(html) ||
    (/"isLive"\s*:\s*true/.test(html) && /hlsManifestUrl/.test(html));

  // 라이브면 canonical 이 watch?v= 로, 아니면 채널 주소로 향합니다.
  const canon = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/);
  const videoId = canon?.[1] ?? null;
  const live = Boolean(isLiveNow && videoId);

  const titleMatch = html.match(/<meta property="og:title" content="([^"]*)"/);
  const title = titleMatch ? decodeEntities(titleMatch[1]) : null;

  return {
    live,
    videoId: live ? videoId : null,
    watchUrl: live ? `https://www.youtube.com/watch?v=${videoId}` : null,
    title: live ? title : null,
    source: 'scrape',
    checkedAt: new Date().toISOString(),
  };
}

async function getStatus(): Promise<LiveStatus> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;
  let data: LiveStatus;
  try {
    data = API_KEY ? await checkViaApi() : await checkViaScrape();
  } catch (_e) {
    // 확인에 실패하면 '방송 아님'으로 안전하게 처리합니다(배지를 잘못 켜지 않도록).
    data = { live: false, videoId: null, watchUrl: null, title: null, source: API_KEY ? 'api' : 'scrape', checkedAt: new Date().toISOString() };
  }
  cache = { at: Date.now(), data };
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const data = await getStatus();
  return new Response(JSON.stringify(data), {
    headers: { ...CORS, 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
});

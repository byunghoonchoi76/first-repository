import { Platform } from 'react-native';

import { requireSupabase, hasSupabaseConfig } from '@/lib/supabase';

/** 주보 원본 이미지를 담는 Supabase Storage 버킷 (supabase/storage.sql 참고) */
export const BULLETIN_BUCKET = 'bulletins';

/** base64 문자열을 업로드에 쓸 수 있는 바이트 배열로 바꿉니다. */
function base64ToBytes(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes = new Uint8Array((clean.length * 3) / 4 - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0));

  let byteIndex = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const chunk =
      (chars.indexOf(clean[i]) << 18) |
      (chars.indexOf(clean[i + 1]) << 12) |
      (chars.indexOf(clean[i + 2]) << 6) |
      chars.indexOf(clean[i + 3]);

    if (byteIndex < bytes.length) bytes[byteIndex++] = (chunk >> 16) & 0xff;
    if (byteIndex < bytes.length) bytes[byteIndex++] = (chunk >> 8) & 0xff;
    if (byteIndex < bytes.length) bytes[byteIndex++] = chunk & 0xff;
  }
  return bytes;
}

function extensionFor(mimeType: string | undefined, fileName: string | undefined): string {
  const fromName = fileName?.split('.').pop()?.toLowerCase();
  if (fromName && fromName.length <= 4) return fromName;
  if (mimeType?.includes('png')) return 'png';
  if (mimeType?.includes('webp')) return 'webp';
  if (mimeType?.includes('heic')) return 'heic';
  return 'jpg';
}

export interface PickedImage {
  uri: string;
  base64?: string | null;
  mimeType?: string;
  fileName?: string;
}

/**
 * 고른 사진을 Supabase Storage 에 올리고, 앱에서 바로 쓸 수 있는 공개 주소를 돌려줍니다.
 * (Supabase 를 연결하지 않은 샘플 모드에서는 기기 안의 주소를 그대로 씁니다.)
 */
export async function uploadBulletinImage(image: PickedImage): Promise<string> {
  if (!hasSupabaseConfig) {
    // 샘플 모드: 올릴 곳이 없으므로 이 기기에서만 보이는 주소를 사용합니다.
    return image.uri;
  }

  const supabase = requireSupabase();
  const extension = extensionFor(image.mimeType, image.fileName);
  const path = `${new Date().toISOString().slice(0, 10)}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${extension}`;

  // 웹은 Blob 을, 앱은 사진의 base64 를 바이트로 바꿔 올립니다.
  const body =
    Platform.OS === 'web'
      ? await (await fetch(image.uri)).blob()
      : base64ToBytes(image.base64 ?? '');

  const { error } = await supabase.storage.from(BULLETIN_BUCKET).upload(path, body, {
    contentType: image.mimeType ?? `image/${extension === 'jpg' ? 'jpeg' : extension}`,
    upsert: false,
  });
  if (error) {
    if (/bucket/i.test(error.message)) {
      throw new Error('저장소가 준비되지 않았습니다. supabase/storage.sql 을 실행해 주세요.');
    }
    if (/policy|permission|unauthorized/i.test(error.message)) {
      throw new Error('업로드 권한이 없습니다. 관리자 계정으로 로그인했는지 확인해 주세요.');
    }
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(BULLETIN_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** 주보에서 뺀 이미지가 우리 저장소의 파일이면 함께 지웁니다. (실패해도 화면 동작에는 지장 없음) */
export async function deleteBulletinImage(publicUrl: string): Promise<void> {
  if (!hasSupabaseConfig) return;

  const marker = `/storage/v1/object/public/${BULLETIN_BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  if (index < 0) return; // 우리 저장소 파일이 아니면 건드리지 않습니다.

  const path = decodeURIComponent(publicUrl.slice(index + marker.length));
  try {
    await requireSupabase().storage.from(BULLETIN_BUCKET).remove([path]);
  } catch {
    // 지우지 못해도 주보에서는 이미 빠졌으므로 넘어갑니다.
  }
}

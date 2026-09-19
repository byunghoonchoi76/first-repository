const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 'YYYY-MM-DD'(날짜만)는 로컬 자정으로 해석합니다.
 * new Date('2026-08-30') 은 UTC 자정으로 읽혀, UTC 보다 뒤인 지역에서는 하루 전 날짜/요일로
 * 어긋납니다. 시각까지 포함된 ISO 는 그대로 해석합니다.
 */
function parseLocalDate(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(iso);
}

/** '2026-08-30' → '8월 30일 (일)' */
export function formatDate(iso: string): string {
  const d = parseLocalDate(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

/** '2026-08-30' → '2026년 8월 30일 (일)' */
export function formatFullDate(iso: string): string {
  const d = parseLocalDate(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}년 ${formatDate(iso)}`;
}

/** 방금 · 3시간 전 · 어제 · 8월 12일 */
export function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  const diffMs = Date.now() - d.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  const days = Math.floor(hours / 24);
  if (days === 1) return '어제';
  if (days < 7) return `${days}일 전`;

  return formatDate(iso);
}

/** 채팅 말풍선용 시각 표기 (오전 9:05) */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hours = d.getHours();
  const period = hours < 12 ? '오전' : '오후';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${period} ${hour12}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** YYYY-MM-DD (로컬 기준) */
export function toDateKey(date: Date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function minutesLabel(minutes: number): string {
  if (minutes < 60) return `${minutes}분`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

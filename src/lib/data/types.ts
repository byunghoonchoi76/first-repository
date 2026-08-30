/** 앱 전체에서 공유하는 도메인 타입. 샘플/Supabase 저장소가 모두 이 형태를 반환합니다. */

export type Role = 'member' | 'admin';

export interface AppUser {
  id: string;
  name: string;
  email?: string;
  role: Role;
}

export interface ServiceTime {
  id: string;
  /** 예) 주일 1부 예배 */
  name: string;
  /** 예) 주일 오전 9:00 */
  schedule: string;
  place: string;
  note?: string;
}

export interface ChurchProfile {
  name: string;
  slogan: string;
  pastor: string;
  address: string;
  phone: string;
  email: string;
  offeringAccount: string;
  serviceTimes: ServiceTime[];
}

/** 주보 순서지 한 줄 */
export interface BulletinOrderItem {
  title: string;
  detail: string;
}

export interface Bulletin {
  id: string;
  /** ISO 날짜 (YYYY-MM-DD) */
  serviceDate: string;
  title: string;
  sermonTitle: string;
  preacher: string;
  scripture: string;
  order: BulletinOrderItem[];
  notices: string[];
  weeklyVerse: string;
}

export type AnnouncementCategory = '공지' | '행사' | '소식';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  author: string;
  pinned: boolean;
  /** ISO 날짜시각 */
  publishedAt: string;
}

export type AnnouncementInput = Omit<Announcement, 'id' | 'publishedAt'> &
  Partial<Pick<Announcement, 'publishedAt'>>;

export type SermonMedia = 'video' | 'audio';

export interface Sermon {
  id: string;
  title: string;
  preacher: string;
  scripture: string;
  /** ISO 날짜 (YYYY-MM-DD) */
  date: string;
  series?: string;
  mediaType: SermonMedia;
  /** 유튜브/오디오 파일 등 재생 주소 */
  mediaUrl: string;
  thumbnailUrl?: string;
  summary: string;
}

export type SermonInput = Omit<Sermon, 'id'>;

export interface PrayerRequest {
  id: string;
  title: string;
  body: string;
  /** 익명이면 '익명' 으로 저장됩니다. */
  author: string;
  anonymous: boolean;
  answered: boolean;
  prayCount: number;
  createdAt: string;
}

export type PrayerRequestInput = Pick<PrayerRequest, 'title' | 'body' | 'author' | 'anonymous'>;

export interface SmallGroup {
  id: string;
  name: string;
  leader: string;
  meetingInfo: string;
  description: string;
  memberCount: number;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  author: string;
  body: string;
  createdAt: string;
}

/** 개인 기도시간 기록 (기기 로컬에 저장) */
export interface PrayerLogEntry {
  /** YYYY-MM-DD */
  date: string;
  minutes: number;
  note?: string;
}

export type DataMode = 'sample' | 'supabase';

/** 화면은 이 인터페이스만 알고 있으면 됩니다. 구현체는 샘플/Supabase 두 가지입니다. */
export interface ChurchRepository {
  mode: DataMode;

  getChurchProfile(): Promise<ChurchProfile>;

  listBulletins(): Promise<Bulletin[]>;
  getBulletin(id: string): Promise<Bulletin | null>;
  getLatestBulletin(): Promise<Bulletin | null>;

  listAnnouncements(): Promise<Announcement[]>;
  getAnnouncement(id: string): Promise<Announcement | null>;
  createAnnouncement(input: AnnouncementInput): Promise<Announcement>;
  updateAnnouncement(id: string, input: AnnouncementInput): Promise<Announcement>;
  deleteAnnouncement(id: string): Promise<void>;

  listSermons(): Promise<Sermon[]>;
  getSermon(id: string): Promise<Sermon | null>;
  createSermon(input: SermonInput): Promise<Sermon>;
  updateSermon(id: string, input: SermonInput): Promise<Sermon>;
  deleteSermon(id: string): Promise<void>;

  listPrayerRequests(): Promise<PrayerRequest[]>;
  createPrayerRequest(input: PrayerRequestInput): Promise<PrayerRequest>;
  prayForRequest(id: string): Promise<PrayerRequest>;
  markPrayerAnswered(id: string, answered: boolean): Promise<PrayerRequest>;

  listGroups(): Promise<SmallGroup[]>;
  getGroup(id: string): Promise<SmallGroup | null>;
  listGroupMessages(groupId: string): Promise<GroupMessage[]>;
  sendGroupMessage(groupId: string, author: string, body: string): Promise<GroupMessage>;
}

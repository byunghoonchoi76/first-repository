import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  sampleAnnouncements,
  sampleBulletins,
  sampleChurchProfile,
  sampleCommunalPrayers,
  sampleGroupMessages,
  sampleGroups,
  samplePrayerRequests,
  sampleSermons,
  sampleStaff,
} from '@/lib/data/sample-data';
import type {
  Announcement,
  AnnouncementInput,
  Bulletin,
  BulletinInput,
  ChurchRepository,
  CommunalPrayer,
  CommunalPrayerInput,
  GroupMessage,
  PrayerRequest,
  PrayerRequestInput,
  Sermon,
  SermonInput,
  SmallGroup,
  SmallGroupInput,
  StaffMember,
  StaffInput,
  NewFamily,
  NewFamilyInput,
} from '@/lib/data/types';

/**
 * 백엔드 없이 동작하는 저장소. 처음에는 샘플 데이터로 시작하고,
 * 이후 추가·수정한 내용은 기기에 저장되어 앱을 다시 열어도 남아 있습니다.
 * (Supabase 를 연결하면 이 저장소 대신 실제 DB 를 사용합니다.)
 */
const STORAGE_KEY = 'church-app/sample-db';

/**
 * 샘플 데이터를 고칠 때마다 이 값을 바꿔 주세요.
 * 기기에 저장된 값이 이 버전과 다르면 새 샘플 데이터로 다시 시작합니다.
 * (그렇지 않으면 앱을 한 번 실행한 기기에는 예전 내용이 계속 남습니다.)
 */
const SAMPLE_VERSION = '2026-09-04-a';

interface SampleDb {
  announcements: Announcement[];
  bulletins: Bulletin[];
  sermons: Sermon[];
  prayers: PrayerRequest[];
  communalPrayers: CommunalPrayer[];
  staff: StaffMember[];
  newFamilies: NewFamily[];
  groups: SmallGroup[];
  messages: GroupMessage[];
}

const initialDb = (): SampleDb => ({
  announcements: [...sampleAnnouncements],
  bulletins: [...sampleBulletins],
  sermons: [...sampleSermons],
  prayers: [...samplePrayerRequests],
  communalPrayers: [...sampleCommunalPrayers],
  staff: [...sampleStaff],
  newFamilies: [],
  groups: [...sampleGroups],
  messages: [...sampleGroupMessages],
});

let db: SampleDb = initialDb();
let hydration: Promise<void> | null = null;

/** 저장된 내용이 있으면 한 번만 읽어 옵니다. */
function ready(): Promise<void> {
  hydration ??= (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const stored = JSON.parse(raw) as Partial<SampleDb> & { version?: string };
      if (stored.version !== SAMPLE_VERSION) {
        // 샘플 데이터가 갱신되었으므로 기기에 남은 예전 내용을 버립니다.
        await AsyncStorage.removeItem(STORAGE_KEY);
        return;
      }
      db = { ...initialDb(), ...stored };
    } catch {
      // 저장된 값이 깨져 있으면 샘플 데이터로 시작합니다.
    }
  })();
  return hydration;
}

async function persist(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...db, version: SAMPLE_VERSION }));
  } catch {
    // 저장에 실패해도 화면 동작은 계속됩니다.
  }
}

const delay = (ms = 180) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const byDateDesc = (a: string, b: string) => (a < b ? 1 : a > b ? -1 : 0);

export const sampleRepository: ChurchRepository = {
  mode: 'sample',

  async getChurchProfile() {
    await ready();
    await delay(60);
    return clone(sampleChurchProfile);
  },

  async listBulletins() {
    await ready();
    await delay();
    return clone(db.bulletins).sort((a, b) => byDateDesc(a.serviceDate, b.serviceDate));
  },

  async getBulletin(id) {
    await ready();
    await delay(80);
    return clone(db.bulletins.find((b) => b.id === id) ?? null);
  },

  async getLatestBulletin() {
    await ready();
    const list = await this.listBulletins();
    return list[0] ?? null;
  },

  async createBulletin(input: BulletinInput) {
    await ready();
    await delay();
    const created: Bulletin = { ...input, id: newId('bulletin') };
    db.bulletins = [created, ...db.bulletins];
    await persist();
    return clone(created);
  },

  async updateBulletin(id, input) {
    await ready();
    await delay();
    const index = db.bulletins.findIndex((b) => b.id === id);
    if (index < 0) throw new Error('주보를 찾을 수 없습니다.');
    const updated: Bulletin = { ...input, id };
    db.bulletins[index] = updated;
    await persist();
    return clone(updated);
  },

  async deleteBulletin(id) {
    await ready();
    await delay();
    db.bulletins = db.bulletins.filter((b) => b.id !== id);
    await persist();
  },

  async listAnnouncements() {
    await ready();
    await delay();
    // 최신 소식이 항상 맨 위에 오도록 발행일 기준 내림차순으로만 정렬합니다.
    return clone(db.announcements).sort((a, b) => byDateDesc(a.publishedAt, b.publishedAt));
  },

  async getAnnouncement(id) {
    await ready();
    await delay(80);
    return clone(db.announcements.find((a) => a.id === id) ?? null);
  },

  async createAnnouncement(input: AnnouncementInput) {
    await ready();
    await delay();
    const created: Announcement = {
      ...input,
      id: newId('ann'),
      publishedAt: input.publishedAt ?? new Date().toISOString(),
    };
    db.announcements = [created, ...db.announcements];
    await persist();
    return clone(created);
  },

  async updateAnnouncement(id, input) {
    await ready();
    await delay();
    const index = db.announcements.findIndex((a) => a.id === id);
    if (index < 0) throw new Error('공지사항을 찾을 수 없습니다.');
    const updated: Announcement = {
      ...db.announcements[index],
      ...input,
      id,
      publishedAt: input.publishedAt ?? db.announcements[index].publishedAt,
    };
    db.announcements[index] = updated;
    await persist();
    return clone(updated);
  },

  async deleteAnnouncement(id) {
    await ready();
    await delay();
    db.announcements = db.announcements.filter((a) => a.id !== id);
    await persist();
  },

  async listSermons() {
    await ready();
    await delay();
    return clone(db.sermons).sort((a, b) => byDateDesc(a.date, b.date));
  },

  async getSermon(id) {
    await ready();
    await delay(80);
    return clone(db.sermons.find((s) => s.id === id) ?? null);
  },

  async createSermon(input: SermonInput) {
    await ready();
    await delay();
    const created: Sermon = { ...input, id: newId('sermon') };
    db.sermons = [created, ...db.sermons];
    await persist();
    return clone(created);
  },

  async updateSermon(id, input) {
    await ready();
    await delay();
    const index = db.sermons.findIndex((s) => s.id === id);
    if (index < 0) throw new Error('설교를 찾을 수 없습니다.');
    const updated: Sermon = { ...input, id };
    db.sermons[index] = updated;
    await persist();
    return clone(updated);
  },

  async deleteSermon(id) {
    await ready();
    await delay();
    db.sermons = db.sermons.filter((s) => s.id !== id);
    await persist();
  },

  async listPrayerRequests() {
    await ready();
    await delay();
    return clone(db.prayers).sort((a, b) => byDateDesc(a.createdAt, b.createdAt));
  },

  async createPrayerRequest(input: PrayerRequestInput) {
    await ready();
    await delay();
    const created: PrayerRequest = {
      id: newId('prayer'),
      title: input.title,
      body: input.body,
      author: input.anonymous ? '익명' : input.author,
      authorId: input.authorId,
      anonymous: input.anonymous,
      answered: false,
      prayCount: 0,
      createdAt: new Date().toISOString(),
    };
    db.prayers = [created, ...db.prayers];
    await persist();
    return clone(created);
  },

  async prayForRequest(id) {
    await ready();
    await delay(60);
    const target = db.prayers.find((p) => p.id === id);
    if (!target) throw new Error('기도제목을 찾을 수 없습니다.');
    target.prayCount += 1;
    await persist();
    return clone(target);
  },

  async markPrayerAnswered(id, answered) {
    await ready();
    await delay(60);
    const target = db.prayers.find((p) => p.id === id);
    if (!target) throw new Error('기도제목을 찾을 수 없습니다.');
    target.answered = answered;
    await persist();
    return clone(target);
  },

  async listCommunalPrayers() {
    await ready();
    await delay(120);
    return clone(db.communalPrayers).sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getCommunalPrayer(id) {
    await ready();
    await delay(80);
    return clone(db.communalPrayers.find((p) => p.id === id) ?? null);
  },

  async createCommunalPrayer(input: CommunalPrayerInput) {
    await ready();
    await delay();
    const created: CommunalPrayer = {
      id: newId('communal'),
      title: input.title,
      body: input.body,
      totalMinutes: 0,
      sortOrder: input.sortOrder,
      createdAt: new Date().toISOString(),
    };
    db.communalPrayers = [...db.communalPrayers, created];
    await persist();
    return clone(created);
  },

  async updateCommunalPrayer(id, input) {
    await ready();
    await delay();
    const index = db.communalPrayers.findIndex((p) => p.id === id);
    if (index < 0) throw new Error('공동 기도제목을 찾을 수 없습니다.');
    const updated: CommunalPrayer = { ...db.communalPrayers[index], ...input };
    db.communalPrayers[index] = updated;
    await persist();
    return clone(updated);
  },

  async deleteCommunalPrayer(id) {
    await ready();
    await delay();
    db.communalPrayers = db.communalPrayers.filter((p) => p.id !== id);
    await persist();
  },

  async prayCommunal(id, minutes) {
    await ready();
    await delay(60);
    const target = db.communalPrayers.find((p) => p.id === id);
    if (!target) throw new Error('공동 기도제목을 찾을 수 없습니다.');
    target.totalMinutes += Math.max(0, Math.round(minutes));
    await persist();
    return clone(target);
  },

  async createNewFamily(input: NewFamilyInput) {
    await ready();
    await delay();
    const created: NewFamily = { ...input, id: newId('nf'), createdAt: new Date().toISOString() };
    db.newFamilies = [created, ...db.newFamilies];
    await persist();
    return clone(created);
  },

  async listNewFamilies() {
    await ready();
    await delay();
    return clone(db.newFamilies).sort((a, b) => byDateDesc(a.createdAt, b.createdAt));
  },

  async deleteNewFamily(id) {
    await ready();
    await delay();
    db.newFamilies = db.newFamilies.filter((f) => f.id !== id);
    await persist();
  },

  async listStaff() {
    await ready();
    await delay(120);
    return clone(db.staff).sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getStaff(id) {
    await ready();
    await delay(80);
    return clone(db.staff.find((m) => m.id === id) ?? null);
  },

  async createStaff(input: StaffInput) {
    await ready();
    await delay();
    const created: StaffMember = { ...input, id: newId('staff') };
    db.staff = [...db.staff, created];
    await persist();
    return clone(created);
  },

  async updateStaff(id, input) {
    await ready();
    await delay();
    const index = db.staff.findIndex((m) => m.id === id);
    if (index < 0) throw new Error('섬기는 분을 찾을 수 없습니다.');
    const updated: StaffMember = { ...input, id };
    db.staff[index] = updated;
    await persist();
    return clone(updated);
  },

  async deleteStaff(id) {
    await ready();
    await delay();
    db.staff = db.staff.filter((m) => m.id !== id);
    await persist();
  },

  async listGroups() {
    await ready();
    await delay();
    return clone(db.groups);
  },

  async getGroup(id) {
    await ready();
    await delay(80);
    return clone(db.groups.find((g) => g.id === id) ?? null);
  },

  async createGroup(input: SmallGroupInput) {
    await ready();
    await delay();
    const created: SmallGroup = { ...input, id: newId('group') };
    db.groups = [...db.groups, created];
    await persist();
    return clone(created);
  },

  async updateGroup(id, input) {
    await ready();
    await delay();
    const index = db.groups.findIndex((g) => g.id === id);
    if (index < 0) throw new Error('소그룹을 찾을 수 없습니다.');
    const updated: SmallGroup = { ...input, id };
    db.groups[index] = updated;
    await persist();
    return clone(updated);
  },

  async deleteGroup(id) {
    await ready();
    await delay();
    db.groups = db.groups.filter((g) => g.id !== id);
    // 소그룹을 지우면 그 방의 대화도 함께 지웁니다.
    db.messages = db.messages.filter((m) => m.groupId !== id);
    await persist();
  },

  async listGroupMessages(groupId) {
    await ready();
    await delay(120);
    return clone(db.messages.filter((m) => m.groupId === groupId)).sort((a, b) =>
      a.createdAt < b.createdAt ? -1 : 1,
    );
  },

  async sendGroupMessage(groupId, author, body) {
    await ready();
    await delay(80);
    const created: GroupMessage = {
      id: newId('msg'),
      groupId,
      author,
      body,
      createdAt: new Date().toISOString(),
    };
    db.messages = [...db.messages, created];
    await persist();
    return clone(created);
  },
};


/** 샘플 모드에서 기기에 저장된 내용을 지우고 처음 상태로 되돌립니다. */
export async function resetSampleData(): Promise<void> {
  db = initialDb();
  hydration = Promise.resolve();
  await AsyncStorage.removeItem(STORAGE_KEY);
}

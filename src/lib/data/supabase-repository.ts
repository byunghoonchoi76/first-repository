import { ChurchInfo } from '@/constants/church';
import { requireSupabase } from '@/lib/supabase';
import type {
  Announcement,
  AnnouncementInput,
  Bulletin,
  BulletinInput,
  ChurchProfile,
  ChurchRepository,
  GroupMessage,
  PrayerRequest,
  PrayerRequestInput,
  Sermon,
  SermonInput,
  SmallGroup,
  SmallGroupInput,
  StaffMember,
  StaffInput,
  StaffCategory,
  NewFamily,
  NewFamilyInput,
} from '@/lib/data/types';

/**
 * Supabase 저장소. 테이블 정의는 `supabase/schema.sql` 에 있습니다.
 * DB 는 snake_case, 앱은 camelCase 를 쓰므로 이 파일에서 변환합니다.
 */

/** 현재 로그인한 사용자의 id (비로그인이면 null) */
async function currentUserId(): Promise<string | null> {
  const sb = requireSupabase();
  const { data } = await sb.auth.getUser();
  return data.user?.id ?? null;
}

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error('데이터를 불러오지 못했습니다.');
  return result.data;
}

type Row = Record<string, any>;

const toBulletin = (row: Row): Bulletin => ({
  id: row.id,
  serviceDate: row.service_date,
  title: row.title,
  sermonTitle: row.sermon_title,
  preacher: row.preacher,
  scripture: row.scripture,
  order: row.order_items ?? [],
  notices: row.notices ?? [],
  weeklyVerse: row.weekly_verse ?? '',
  imageUrls: row.image_urls ?? [],
});

const fromBulletin = (input: BulletinInput) => ({
  service_date: input.serviceDate,
  title: input.title,
  sermon_title: input.sermonTitle,
  preacher: input.preacher,
  scripture: input.scripture,
  weekly_verse: input.weeklyVerse,
  order_items: input.order,
  notices: input.notices,
  image_urls: input.imageUrls,
});

const toAnnouncement = (row: Row): Announcement => ({
  id: row.id,
  title: row.title,
  body: row.body,
  category: row.category,
  author: row.author,
  pinned: row.pinned,
  publishedAt: row.published_at,
});

const fromAnnouncement = (input: AnnouncementInput) => ({
  title: input.title,
  body: input.body,
  category: input.category,
  author: input.author,
  pinned: input.pinned,
  published_at: input.publishedAt ?? new Date().toISOString(),
});

const toSermon = (row: Row): Sermon => ({
  id: row.id,
  title: row.title,
  preacher: row.preacher,
  scripture: row.scripture,
  date: row.preached_on,
  series: row.series ?? undefined,
  mediaType: row.media_type,
  mediaUrl: row.media_url,
  thumbnailUrl: row.thumbnail_url ?? undefined,
  summary: row.summary ?? '',
});

const fromSermon = (input: SermonInput) => ({
  title: input.title,
  preacher: input.preacher,
  scripture: input.scripture,
  preached_on: input.date,
  series: input.series ?? null,
  media_type: input.mediaType,
  media_url: input.mediaUrl,
  thumbnail_url: input.thumbnailUrl ?? null,
  summary: input.summary,
});

const toPrayer = (row: Row): PrayerRequest => ({
  id: row.id,
  title: row.title,
  body: row.body,
  author: row.author,
  authorId: row.author_id ?? undefined,
  anonymous: row.anonymous,
  answered: row.answered,
  prayCount: row.pray_count ?? 0,
  createdAt: row.created_at,
});

const toGroup = (row: Row): SmallGroup => ({
  id: row.id,
  name: row.name,
  leader: row.leader,
  meetingInfo: row.meeting_info,
  description: row.description ?? '',
  memberCount: row.member_count ?? 0,
});

const toNewFamily = (row: Row): NewFamily => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  gender: row.gender ?? '',
  address: row.address ?? '',
  referrer: row.referrer ?? '',
  note: row.note ?? '',
  createdAt: row.created_at,
});

// category 컬럼이 아직 없거나 비어 있으면 직분(role)으로 큰 분류를 유추합니다.
const inferCategory = (role: string): StaffCategory => {
  if (role.includes('전도사') || role.includes('강도사')) return '전도사';
  if (role.includes('장로')) return '장로';
  if (role.includes('목사')) return '목사';
  return '관리';
};

const toStaff = (row: Row): StaffMember => ({
  id: row.id,
  name: row.name,
  category: (row.category as StaffCategory) || inferCategory(row.role ?? ''),
  role: row.role,
  detail: row.detail ?? '',
  sortOrder: row.sort_order ?? 0,
});

const fromStaff = (input: StaffInput) => ({
  name: input.name,
  category: input.category,
  role: input.role,
  detail: input.detail,
  sort_order: input.sortOrder,
});

const fromGroup = (input: SmallGroupInput) => ({
  name: input.name,
  leader: input.leader,
  meeting_info: input.meetingInfo,
  description: input.description,
  member_count: input.memberCount,
});

const toMessage = (row: Row): GroupMessage => ({
  id: row.id,
  groupId: row.group_id,
  author: row.author,
  body: row.body,
  createdAt: row.created_at,
});

export const supabaseRepository: ChurchRepository = {
  mode: 'supabase',

  async getChurchProfile(): Promise<ChurchProfile> {
    const sb = requireSupabase();
    const [profile, times] = await Promise.all([
      sb.from('church_profile').select('*').limit(1).maybeSingle(),
      sb.from('service_times').select('*').order('sort_order', { ascending: true }),
    ]);
    if (profile.error) throw new Error(profile.error.message);
    if (times.error) throw new Error(times.error.message);

    const row = (profile.data ?? {}) as Row;
    return {
      name: row.name ?? ChurchInfo.name,
      slogan: row.slogan ?? ChurchInfo.slogan,
      sloganVerse: row.slogan_verse ?? ChurchInfo.sloganVerse,
      pastor: row.pastor ?? ChurchInfo.pastor,
      address: row.address ?? ChurchInfo.address,
      phone: row.phone ?? ChurchInfo.phone,
      email: row.email ?? ChurchInfo.email,
      offeringAccount: row.offering_account ?? ChurchInfo.offeringAccount,
      youtubeUrl: row.youtube_url ?? ChurchInfo.youtubeUrl,
      givingUrl: row.giving_url ?? ChurchInfo.givingUrl,
      mapUrl: row.map_url ?? ChurchInfo.mapUrl,
      serviceTimes: (times.data ?? []).map((t: Row) => ({
        id: t.id,
        name: t.name,
        schedule: t.schedule,
        place: t.place,
        note: t.note ?? undefined,
        category: t.category ?? '예배',
      })),
    };
  },

  async listBulletins() {
    const sb = requireSupabase();
    const res = await sb.from('bulletins').select('*').order('service_date', { ascending: false });
    return unwrap(res).map(toBulletin);
  },

  async getBulletin(id) {
    const sb = requireSupabase();
    const res = await sb.from('bulletins').select('*').eq('id', id).maybeSingle();
    if (res.error) throw new Error(res.error.message);
    return res.data ? toBulletin(res.data) : null;
  },

  async getLatestBulletin() {
    const sb = requireSupabase();
    const res = await sb
      .from('bulletins')
      .select('*')
      .order('service_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (res.error) throw new Error(res.error.message);
    return res.data ? toBulletin(res.data) : null;
  },

  async createBulletin(input) {
    const sb = requireSupabase();
    const res = await sb.from('bulletins').insert(fromBulletin(input)).select().single();
    return toBulletin(unwrap(res));
  },

  async updateBulletin(id, input) {
    const sb = requireSupabase();
    const res = await sb.from('bulletins').update(fromBulletin(input)).eq('id', id).select().single();
    return toBulletin(unwrap(res));
  },

  async deleteBulletin(id) {
    const sb = requireSupabase();
    const { error } = await sb.from('bulletins').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async listAnnouncements() {
    const sb = requireSupabase();
    // 최신 소식이 항상 맨 위에 오도록 발행일 기준 내림차순으로 정렬합니다.
    const res = await sb
      .from('announcements')
      .select('*')
      .order('published_at', { ascending: false });
    return unwrap(res).map(toAnnouncement);
  },

  async getAnnouncement(id) {
    const sb = requireSupabase();
    const res = await sb.from('announcements').select('*').eq('id', id).maybeSingle();
    if (res.error) throw new Error(res.error.message);
    return res.data ? toAnnouncement(res.data) : null;
  },

  async createAnnouncement(input) {
    const sb = requireSupabase();
    const res = await sb.from('announcements').insert(fromAnnouncement(input)).select().single();
    return toAnnouncement(unwrap(res));
  },

  async updateAnnouncement(id, input) {
    const sb = requireSupabase();
    const res = await sb
      .from('announcements')
      .update(fromAnnouncement(input))
      .eq('id', id)
      .select()
      .single();
    return toAnnouncement(unwrap(res));
  },

  async deleteAnnouncement(id) {
    const sb = requireSupabase();
    const { error } = await sb.from('announcements').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async listSermons() {
    const sb = requireSupabase();
    const res = await sb.from('sermons').select('*').order('preached_on', { ascending: false });
    return unwrap(res).map(toSermon);
  },

  async getSermon(id) {
    const sb = requireSupabase();
    const res = await sb.from('sermons').select('*').eq('id', id).maybeSingle();
    if (res.error) throw new Error(res.error.message);
    return res.data ? toSermon(res.data) : null;
  },

  async createSermon(input) {
    const sb = requireSupabase();
    const res = await sb.from('sermons').insert(fromSermon(input)).select().single();
    return toSermon(unwrap(res));
  },

  async updateSermon(id, input) {
    const sb = requireSupabase();
    const res = await sb.from('sermons').update(fromSermon(input)).eq('id', id).select().single();
    return toSermon(unwrap(res));
  },

  async deleteSermon(id) {
    const sb = requireSupabase();
    const { error } = await sb.from('sermons').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async listPrayerRequests() {
    const sb = requireSupabase();
    const res = await sb.from('prayer_requests').select('*').order('created_at', { ascending: false });
    return unwrap(res).map(toPrayer);
  },

  async createPrayerRequest(input: PrayerRequestInput) {
    const sb = requireSupabase();
    const res = await sb
      .from('prayer_requests')
      .insert({
        title: input.title,
        body: input.body,
        author: input.anonymous ? '익명' : input.author,
        anonymous: input.anonymous,
        // 본인이 올린 기도제목만 수정·삭제할 수 있게 작성자를 남깁니다.
        author_id: await currentUserId(),
      })
      .select()
      .single();
    return toPrayer(unwrap(res));
  },

  async prayForRequest(id) {
    const sb = requireSupabase();
    // 동시 클릭에도 카운트가 어긋나지 않도록 DB 함수로 증가시킵니다.
    const res = await sb.rpc('increment_pray_count', { request_id: id }).select().single();
    if (res.error) throw new Error(res.error.message);
    return toPrayer(res.data as Row);
  },

  async markPrayerAnswered(id, answered) {
    const sb = requireSupabase();
    const res = await sb
      .from('prayer_requests')
      .update({ answered })
      .eq('id', id)
      .select()
      .single();
    return toPrayer(unwrap(res));
  },

  async createNewFamily(input) {
    const sb = requireSupabase();
    const res = await sb
      .from('new_families')
      .insert({
        name: input.name,
        phone: input.phone,
        gender: input.gender,
        address: input.address,
        referrer: input.referrer,
        note: input.note,
      })
      .select()
      .single();
    return toNewFamily(unwrap(res));
  },

  async listNewFamilies() {
    const sb = requireSupabase();
    const res = await sb.from('new_families').select('*').order('created_at', { ascending: false });
    return unwrap(res).map(toNewFamily);
  },

  async deleteNewFamily(id) {
    const sb = requireSupabase();
    const { error } = await sb.from('new_families').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async listStaff() {
    const sb = requireSupabase();
    const res = await sb.from('church_staff').select('*').order('sort_order', { ascending: true });
    return unwrap(res).map(toStaff);
  },

  async getStaff(id) {
    const sb = requireSupabase();
    const res = await sb.from('church_staff').select('*').eq('id', id).maybeSingle();
    if (res.error) throw new Error(res.error.message);
    return res.data ? toStaff(res.data) : null;
  },

  async createStaff(input) {
    const sb = requireSupabase();
    const res = await sb.from('church_staff').insert(fromStaff(input)).select().single();
    return toStaff(unwrap(res));
  },

  async updateStaff(id, input) {
    const sb = requireSupabase();
    const res = await sb.from('church_staff').update(fromStaff(input)).eq('id', id).select().single();
    return toStaff(unwrap(res));
  },

  async deleteStaff(id) {
    const sb = requireSupabase();
    const { error } = await sb.from('church_staff').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async listGroups() {
    const sb = requireSupabase();
    const res = await sb.from('small_groups').select('*').order('name', { ascending: true });
    return unwrap(res).map(toGroup);
  },

  async getGroup(id) {
    const sb = requireSupabase();
    const res = await sb.from('small_groups').select('*').eq('id', id).maybeSingle();
    if (res.error) throw new Error(res.error.message);
    return res.data ? toGroup(res.data) : null;
  },

  async createGroup(input) {
    const sb = requireSupabase();
    const res = await sb.from('small_groups').insert(fromGroup(input)).select().single();
    return toGroup(unwrap(res));
  },

  async updateGroup(id, input) {
    const sb = requireSupabase();
    const res = await sb.from('small_groups').update(fromGroup(input)).eq('id', id).select().single();
    return toGroup(unwrap(res));
  },

  async deleteGroup(id) {
    const sb = requireSupabase();
    // group_messages 는 on delete cascade 로 함께 지워집니다.
    const { error } = await sb.from('small_groups').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  async listGroupMessages(groupId) {
    const sb = requireSupabase();
    const res = await sb
      .from('group_messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(200);
    return unwrap(res).map(toMessage);
  },

  async sendGroupMessage(groupId, author, body) {
    const sb = requireSupabase();
    const res = await sb
      .from('group_messages')
      .insert({ group_id: groupId, author, body, author_id: await currentUserId() })
      .select()
      .single();
    return toMessage(unwrap(res));
  },
};

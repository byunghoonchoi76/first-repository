import { ChurchInfo } from '@/constants/church';
import { requireSupabase } from '@/lib/supabase';
import type {
  Announcement,
  AnnouncementInput,
  Bulletin,
  ChurchProfile,
  ChurchRepository,
  GroupMessage,
  PrayerRequest,
  PrayerRequestInput,
  Sermon,
  SermonInput,
  SmallGroup,
} from '@/lib/data/types';

/**
 * Supabase 저장소. 테이블 정의는 `supabase/schema.sql` 에 있습니다.
 * DB 는 snake_case, 앱은 camelCase 를 쓰므로 이 파일에서 변환합니다.
 */

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

  async listAnnouncements() {
    const sb = requireSupabase();
    const res = await sb
      .from('announcements')
      .select('*')
      .order('pinned', { ascending: false })
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
      .insert({ group_id: groupId, author, body })
      .select()
      .single();
    return toMessage(unwrap(res));
  },
};

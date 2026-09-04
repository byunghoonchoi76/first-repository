import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { HeroBanner } from '@/components/hero-banner';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, EmptyState, ErrorState, ListRow, LoadingState, SectionHeader } from '@/components/ui';
import { ChurchInfo } from '@/constants/church';
import { todaysVerse } from '@/constants/daily-verses';
import { Photos } from '@/constants/photos';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { repository, useAsyncData, type Sermon } from '@/lib/data';
import { formatDate, formatFullDate, minutesLabel } from '@/lib/format';
import { usePrayerTime } from '@/lib/prayer-log';
import { useYouTubeTitle } from '@/lib/use-youtube-title';
import { parseYouTubeUrl, youtubeThumbnail } from '@/lib/youtube';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '평안한 새벽입니다';
  if (hour < 12) return '좋은 아침입니다';
  if (hour < 18) return '평안한 오후입니다';
  return '복된 저녁입니다';
}

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const prayerLog = usePrayerTime('personal');

  const profile = useAsyncData(() => repository.getChurchProfile());
  const bulletin = useAsyncData(() => repository.getLatestBulletin());
  const sermons = useAsyncData(() => repository.listSermons());
  const announcements = useAsyncData(() => repository.listAnnouncements());

  const loading = profile.loading || bulletin.loading || announcements.loading;
  const error = profile.error ?? bulletin.error ?? announcements.error;

  const reloadAll = () => {
    profile.reload();
    bulletin.reload();
    sermons.reload();
    announcements.reload();
  };

  if (loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorState message={error} onRetry={reloadAll} />
      </Screen>
    );
  }

  const topAnnouncements = (announcements.data ?? []).slice(0, 5);
  const latestSermon = sermons.data?.[0];
  const dailyVerse = todaysVerse();

  const openLive = () => {
    if (!ChurchInfo.youtubeUrl) return;
    const live = `${ChurchInfo.youtubeUrl}/streams`;
    if (Platform.OS === 'web') void Linking.openURL(live);
    else void WebBrowser.openBrowserAsync(live);
  };

  return (
    <Screen onRefresh={reloadAll} refreshing={false}>
      {/* 히어로 — 오늘의 말씀 (매일 자동으로 바뀝니다) */}
      <HeroBanner imageUrl={Photos.heroWorship} base="warm" height={210}>
        <ThemedText type="caption" style={styles.heroLabel}>
          {greeting()}
          {user ? `, ${user.name}님` : ''} · {formatFullDate(new Date().toISOString().slice(0, 10))}
        </ThemedText>
        <View style={styles.heroTagRow}>
          <Ionicons name="book-outline" size={13} color="#fff" />
          <ThemedText type="caption" style={styles.heroTag}>
            오늘의 말씀
          </ThemedText>
        </View>
        <ThemedText type="subtitle" style={styles.heroTitle} numberOfLines={3}>
          {dailyVerse.text}
        </ThemedText>
        <ThemedText type="small" style={styles.heroVerse}>
          {dailyVerse.ref}
        </ThemedText>
      </HeroBanner>

      {/* 이번 주 말씀 (최신 설교) */}
      {latestSermon ? <WeeklyMessage sermon={latestSermon} onPress={() => router.push(`/sermons/${latestSermon.id}`)} /> : null}

      {/* 빠른 메뉴 */}
      <View style={styles.quickRow}>
        <QuickAction icon="radio-outline" label="실시간 예배" badge="LIVE" onPress={openLive} />
        <QuickAction icon="book-outline" label="이번 주 주보" onPress={() => router.push('/bulletins')} />
        <QuickAction icon="card-outline" label="온라인 헌금" onPress={() => router.push('/giving')} />
        <QuickAction icon="hand-right-outline" label="기도 요청" onPress={() => router.push('/prayer')} />
        <QuickAction icon="person-add-outline" label="새가족 등록" onPress={() => router.push('/new-family')} />
      </View>

      {/* 이번 주 예배 */}
      {bulletin.data ? (
        <View>
          <SectionHeader
            title="이번 주 예배"
            actionLabel="주보 보기"
            onAction={() => router.push(`/bulletin/${bulletin.data!.id}`)}
          />
          <Card onPress={() => router.push(`/bulletin/${bulletin.data!.id}`)}>
            <View style={styles.rowBetween}>
              <Badge label={formatDate(bulletin.data.serviceDate)} tone="accent" />
              {bulletin.data.imageUrls.length > 0 ? <Badge label="주보 원본" tone="success" /> : null}
            </View>
            <ThemedText type="heading">{bulletin.data.sermonTitle}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {bulletin.data.scripture} · {bulletin.data.preacher}
            </ThemedText>
          </Card>
        </View>
      ) : null}

      {/* 교회 소식 — 가로 카드 */}
      <View>
        <SectionHeader title="교회 소식" actionLabel="더보기" onAction={() => router.push('/news')} />
        {topAnnouncements.length === 0 ? (
          <EmptyState message="아직 등록된 소식이 없습니다." />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.newsRow}>
            {topAnnouncements.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => router.push(`/news/${item.id}`)}
                style={({ pressed }) => [styles.newsCard, pressed && styles.pressed]}>
                <HeroBanner imageUrl={Photos.community} height={100} base="navy" style={styles.newsImage}>
                  <Badge label={item.category} tone={item.category === '행사' ? 'accent' : 'primary'} />
                </HeroBanner>
                <View style={[styles.newsBody, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {item.title}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary" numberOfLines={2}>
                    {item.body}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      {/* 우리의 기도 */}
      <View>
        <SectionHeader title="우리의 기도" actionLabel="기도하기" onAction={() => router.push('/prayer')} />
        <Card>
          <View style={styles.prayerRow}>
            <View style={styles.flex}>
              <ThemedText type="caption" themeColor="textSecondary">
                오늘 기도시간
              </ThemedText>
              <ThemedText type="subtitle">
                {prayerLog.todayMinutes > 0 ? minutesLabel(prayerLog.todayMinutes) : '아직 없음'}
              </ThemedText>
            </View>
            <View style={[styles.streakBox, { backgroundColor: theme.backgroundSelected }]}>
              <Ionicons name="flame-outline" size={18} color={theme.accent} />
              <ThemedText type="smallBold">{prayerLog.streak}일 연속</ThemedText>
            </View>
          </View>
          <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
          <ListRow
            icon="people-circle-outline"
            title="공동 기도제목"
            subtitle="온 성도가 함께 기도하며 시간을 쌓아가요"
            onPress={() => router.push('/prayer')}
          />
          <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
          <ListRow
            icon="flower-outline"
            title="개인 기도제목"
            subtitle="나만의 기도제목을 적고 관리해요"
            onPress={() => router.push('/prayer/personal')}
          />
          <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
          <ListRow
            icon="hand-right-outline"
            title="기도 요청"
            subtitle="성도들과 나누고 함께 기도해요"
            onPress={() => router.push('/prayer/requests')}
          />
        </Card>
      </View>

      {/* 교회 안내 */}
      <View>
        <SectionHeader title="교회 안내" />
        <Card>
          <ListRow icon="time-outline" title="예배 안내" subtitle="주일예배 · 새벽예배 · 교육부서 시간표" onPress={() => router.push('/services')} />
          <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
          <ListRow icon="people-outline" title="섬기는 사람들" subtitle="교역자와 직분자를 소개합니다" onPress={() => router.push('/staff')} />
          <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
          <ListRow icon="location-outline" title="교회 주소" subtitle={profile.data?.address} onPress={() => router.push('/location')} />
          <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
          <ListRow icon="card-outline" title="헌금 안내" subtitle="헌금 계좌 안내" onPress={() => router.push('/giving')} />
        </Card>
      </View>
    </Screen>
  );
}

/** 이번 주 말씀 — 설교 썸네일 + 재생 */
function WeeklyMessage({ sermon, onPress }: { sermon: Sermon; onPress: () => void }) {
  const theme = useTheme();
  const video = parseYouTubeUrl(sermon.mediaUrl);
  const title = useYouTubeTitle(sermon.mediaUrl, sermon.title, '이번 주 말씀');
  const thumb = sermon.thumbnailUrl ?? (video ? youtubeThumbnail(video.videoId) : undefined);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <Card style={styles.weekly}>
        <View style={[styles.weeklyThumb, { backgroundColor: theme.backgroundSelected }]}>
          {thumb ? <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
          <View style={styles.playDot}>
            <Ionicons name="play" size={16} color="#fff" />
          </View>
        </View>
        <View style={styles.flex}>
          <View style={styles.weeklyTag}>
            <Ionicons name="volume-medium-outline" size={13} color={theme.accent} />
            <ThemedText type="caption" style={{ color: theme.accent, fontWeight: '700' }}>
              이번 주 말씀
            </ThemedText>
          </View>
          <ThemedText type="smallBold" numberOfLines={2}>
            {title}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {[sermon.scripture, sermon.preacher].filter(Boolean).join(' · ')}
          </ThemedText>
        </View>
      </Card>
    </Pressable>
  );
}

function QuickAction({
  icon,
  label,
  badge,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  badge?: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}>
      <View style={[styles.quickIcon, { backgroundColor: theme.backgroundSelected }]}>
        <Ionicons name={icon} size={22} color={theme.primary} />
        {badge ? (
          <View style={[styles.liveBadge, { backgroundColor: theme.danger }]}>
            <ThemedText type="caption" style={styles.liveText}>
              {badge}
            </ThemedText>
          </View>
        ) : null}
      </View>
      <ThemedText type="caption" themeColor="textSecondary" style={styles.quickLabel} numberOfLines={2}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  menuDivider: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.one },

  heroLabel: { color: 'rgba(255,255,255,0.9)' },
  heroTagRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.two },
  heroTag: { color: '#fff', fontWeight: '700', letterSpacing: 0.5 },
  heroTitle: { color: '#fff', marginTop: Spacing.one, lineHeight: 26 },
  heroVerse: { color: 'rgba(255,255,255,0.92)', marginTop: Spacing.one },

  weekly: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  weeklyThumb: {
    width: 92,
    height: 62,
    borderRadius: Radius.small,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weeklyTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },

  quickRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.one },
  quickAction: { flex: 1, alignItems: 'center', gap: Spacing.one },
  quickIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: { textAlign: 'center', lineHeight: 15 },
  liveBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  liveText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  newsRow: { gap: Spacing.two, paddingRight: Spacing.three },
  newsCard: { width: 208 },
  newsImage: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  newsBody: {
    borderWidth: StyleSheet.hairlineWidth,
    borderTopWidth: 0,
    borderBottomLeftRadius: Radius.large,
    borderBottomRightRadius: Radius.large,
    padding: Spacing.three,
    gap: 2,
  },

  prayerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  streakBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
});

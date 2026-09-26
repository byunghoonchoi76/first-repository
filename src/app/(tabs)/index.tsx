import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Animated, FlatList, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { HeroBanner } from '@/components/hero-banner';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, EmptyState, ErrorState, ListRow, LoadingState, SectionHeader } from '@/components/ui';
import { ChurchInfo } from '@/constants/church';
import { todaysVerse } from '@/constants/daily-verses';
import { LocalPhotos, Photos } from '@/constants/photos';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { repository, useAsyncData, type Sermon } from '@/lib/data';
import { durationLabel, formatDate, formatFullDate, toDateKey } from '@/lib/format';
import { isUnread, useNewsSeenAt } from '@/lib/news-seen';
import { useLiveStatus } from '@/lib/live-status';
import { useAllPrayerTime } from '@/lib/prayer-log';
import { classifyChurchVideo, parseYouTubeUrl, youtubeThumbnail } from '@/lib/youtube';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '평안한 새벽입니다';
  if (hour < 12) return '좋은 아침입니다';
  if (hour < 18) return '평안한 오후입니다';
  return '복된 저녁입니다';
}

/** 부고(장례) 공지인지 세부 분류·제목·내용으로 판별합니다. 맞으면 국화 이미지를 씁니다. */
function isFuneralNotice(item: { title?: string; body?: string; subCategory?: string }): boolean {
  if (item.subCategory === '장례') return true;
  const text = `${item.title ?? ''} ${item.body ?? ''}`;
  return /부고|장례|별세|소천|하관|발인|빈소|조문|국화|영결|위독|천국환송|소천하/.test(text);
}

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const prayerLog = useAllPrayerTime();
  const live = useLiveStatus();
  const newsSeenAt = useNewsSeenAt(); // 홈에서는 기준만 읽고, 소식 탭을 열 때 갱신됩니다.

  const profile = useAsyncData(() => repository.getChurchProfile());
  const bulletin = useAsyncData(() => repository.getLatestBulletin());
  const sermons = useAsyncData(() => repository.listSermons());
  const channel = useAsyncData(() => repository.listChannelVideos());
  const announcements = useAsyncData(() => repository.listAnnouncements());

  const loading = profile.loading || bulletin.loading || announcements.loading;
  const error = profile.error ?? bulletin.error ?? announcements.error;

  const reloadAll = () => {
    profile.reload();
    bulletin.reload();
    sermons.reload();
    channel.reload();
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

  // '이번 주 말씀' = 교회 유튜브 채널의 가장 최신 예배 영상. 찬양대(찬양) 영상은 제외합니다.
  // 채널을 못 불러오면 최신 등록 설교로 대체.
  // 채널 목록이 아직 로딩 중이면(첫 도착 전) 자리표시만 보여주고,
  // 다 불러온 뒤에만 대체 설교(fallback)를 씁니다 → '지난주→최신' 깜빡임 방지.
  const channelPending = channel.loading && !channel.data;

  // 최신 예배 영상들을 좌우로 넘겨 볼 수 있게 목록으로 만듭니다. 찬양대·쇼츠·실시간은 제외.
  // 중복 방지: ① 같은 영상(videoId) 두 번 금지, ② 같은 예배 종류는 가장 최근 한 편만.
  //   (분류기가 규칙에 안 걸리는 제목을 '청년예배'로 몰아넣어, 서로 다른 영상이 같은 배지로
  //    겹쳐 보이던 문제를 종류별 대표 한 편만 노출해 해결합니다.)
  const seenVideoId = new Set<string>();
  const seenCategory = new Set<string>();
  const weeklyItems: WeeklyItem[] = [...(channel.data ?? [])]
    .filter((v) => {
      const c = classifyChurchVideo(v.title, v.isShort);
      return c !== '찬양' && c !== '쇼츠' && c !== '실시간';
    })
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .filter((v) => {
      if (seenVideoId.has(v.videoId)) return false;
      const c = classifyChurchVideo(v.title, v.isShort);
      if (seenCategory.has(c)) return false;
      seenVideoId.add(v.videoId);
      seenCategory.add(c);
      return true;
    })
    .slice(0, 8)
    .map((v) => {
      // 이미 설교로 등록된 영상이면 그 설교 상세로, 아니면 인앱 재생 화면으로 연결합니다.
      const registered = (sermons.data ?? []).find((s) => parseYouTubeUrl(s.mediaUrl)?.videoId === v.videoId);
      return {
        key: v.videoId,
        title: registered?.title || v.title,
        thumbnail: v.thumbnail || youtubeThumbnail(v.videoId),
        category: classifyChurchVideo(v.title, v.isShort),
        subtitle: registered
          ? [registered.scripture, registered.preacher].filter(Boolean).join(' · ')
          : v.publishedAt
            ? formatDate(v.publishedAt.slice(0, 10))
            : '',
        onPress: () => (registered ? router.push(`/sermons/${registered.id}`) : router.push(`/watch/${v.videoId}`)),
      };
    });

  // 채널을 못 불러오면 최신 등록 설교 한 편으로 대체합니다.
  if (weeklyItems.length === 0 && latestSermon && !channelPending) {
    const video = parseYouTubeUrl(latestSermon.mediaUrl);
    weeklyItems.push({
      key: latestSermon.id,
      title: latestSermon.title,
      thumbnail: latestSermon.thumbnailUrl ?? (video ? youtubeThumbnail(video.videoId) : undefined),
      category: '설교',
      subtitle: [latestSermon.scripture, latestSermon.preacher].filter(Boolean).join(' · '),
      onPress: () => router.push(`/sermons/${latestSermon.id}`),
    });
  }

  const openLive = () => {
    // 방송 중이면 그 라이브 영상으로 바로, 아니면 채널의 실시간/다시보기 목록으로.
    const target = live.live && live.watchUrl ? live.watchUrl : ChurchInfo.youtubeUrl ? `${ChurchInfo.youtubeUrl}/streams` : null;
    if (!target) return;
    if (Platform.OS === 'web') void Linking.openURL(target);
    else void WebBrowser.openBrowserAsync(target);
  };

  return (
    <Screen onRefresh={reloadAll} refreshing={false}>
      {/* 히어로 — 오늘의 말씀 (매일 자동으로 바뀝니다) */}
      <HeroBanner imageUrl={Photos.heroWorship} base="warm" height={216} style={styles.heroShadow}>
        <ThemedText type="small" style={styles.heroDate}>
          {formatFullDate(toDateKey())}
        </ThemedText>
        <ThemedText type="small" style={styles.heroLabel}>
          {greeting()}
          {user ? `, ${user.name}님` : ''}
        </ThemedText>
        <View style={styles.heroTagRow}>
          <Ionicons name="book-outline" size={12} color="#fff" />
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

      {/* 이번 주 말씀 — 교회 유튜브 채널 최신 영상들을 좌우로 넘겨 봅니다 */}
      {weeklyItems.length > 0 ? <WeeklyCarousel items={weeklyItems} /> : channelPending ? <WeeklyMessageSkeleton /> : null}

      {/* 빠른 메뉴 */}
      <View style={styles.quickRow}>
        <QuickAction
          icon="radio-outline"
          label={live.live ? '실시간 방송 중' : '실시간 예배'}
          badge={live.live ? 'LIVE' : undefined}
          pulse={live.live}
          onPress={openLive}
        />
        <QuickAction icon="book-outline" label="성경 읽기표" onPress={() => router.push('/reading-plan')} />
        <QuickAction icon="card-outline" label="온라인 헌금" onPress={() => router.push('/giving')} />
        <QuickAction icon="hand-right-outline" label="중보 기도" onPress={() => router.push('/prayer/requests')} />
        <QuickAction icon="person-add-outline" label="새가족 등록" onPress={() => router.push('/new-family')} />
      </View>

      {/* 이번 주 예배 */}
      {bulletin.data ? (
        <View>
          <SectionHeader
            title="이번 주 예배"
            actionLabel="주보 보기"
            accent
            onAction={() => router.push(`/bulletin/${bulletin.data!.id}`)}
          />
          <Card elevated onPress={() => router.push(`/bulletin/${bulletin.data!.id}`)}>
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
        <SectionHeader title="교회 소식" actionLabel="더보기" accent onAction={() => router.push('/news')} />
        {topAnnouncements.length === 0 ? (
          <EmptyState message="아직 등록된 소식이 없습니다." />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.newsRow}>
            {topAnnouncements.map((item) => {
              const funeral = isFuneralNotice(item);
              const poster = item.images?.[0];
              return (
              <Pressable
                key={item.id}
                onPress={() => router.push(`/news/${item.id}`)}
                style={({ pressed }) => [styles.newsCard, pressed && styles.pressed]}>
                <HeroBanner
                  imageSource={poster ? undefined : funeral ? LocalPhotos.funeral : undefined}
                  imageUrl={poster ?? (funeral ? undefined : Photos.community)}
                  height={100}
                  base="navy"
                  style={styles.newsImage}>
                  {isUnread(item.publishedAt, newsSeenAt) ? (
                    <View style={styles.newTag}>
                      <ThemedText type="caption" style={styles.newTagText}>
                        새 소식
                      </ThemedText>
                    </View>
                  ) : null}
                  <Badge label={funeral ? '부고' : item.category} tone={funeral ? 'textSecondary' : item.category === '행사' ? 'accent' : 'primary'} />
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
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* 우리의 기도 */}
      <View>
        <SectionHeader title="우리의 기도" actionLabel="기도하기" accent onAction={() => router.push('/prayer')} />
        <Card elevated>
          <View style={styles.prayerRow}>
            <View style={styles.flex}>
              <ThemedText type="caption" themeColor="textSecondary">
                오늘 기도시간
              </ThemedText>
              <ThemedText type="subtitle">
                {prayerLog.todayMinutes > 0 ? durationLabel(prayerLog.todayMinutes) : '아직 없음'}
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
    </Screen>
  );
}

type WeeklyItem = {
  key: string;
  title: string;
  thumbnail?: string;
  category: string;
  subtitle: string;
  onPress: () => void;
};

/** 이번 주 말씀 — 최신 예배 영상들을 좌우로 넘겨 보는 캐러셀 */
function WeeklyCarousel({ items }: { items: WeeklyItem[] }) {
  const theme = useTheme();
  const [pageW, setPageW] = useState(0);
  const [index, setIndex] = useState(0);

  return (
    <View>
      <View style={styles.weeklyTag}>
        <Ionicons name="volume-medium-outline" size={13} color={theme.accent} />
        <ThemedText type="caption" style={{ color: theme.accent, fontWeight: '700' }}>
          이번 주 말씀
        </ThemedText>
      </View>

      <View onLayout={(e) => setPageW(e.nativeEvent.layout.width)}>
        {pageW > 0 ? (
          <FlatList
            data={items}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(it) => it.key}
            getItemLayout={(_, i) => ({ length: pageW, offset: pageW * i, index: i })}
            scrollEventThrottle={16}
            onScroll={(e) => {
              const i = Math.round(e.nativeEvent.contentOffset.x / pageW);
              setIndex((cur) => (cur === i ? cur : i));
            }}
            renderItem={({ item }) => <WeeklySlide item={item} width={pageW} theme={theme} />}
          />
        ) : null}
      </View>

      {items.length > 1 ? (
        <View style={styles.dotsRow}>
          {items.map((it, i) => (
            <View
              key={it.key}
              style={[styles.dot, { width: i === index ? 18 : 6, backgroundColor: i === index ? theme.primary : theme.border }]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** 캐러셀 한 장 — 큰 썸네일 + 카테고리 배지 + 제목 */
function WeeklySlide({ item, width, theme }: { item: WeeklyItem; width: number; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={{ width }}>
      <Pressable onPress={item.onPress} style={({ pressed }) => pressed && styles.pressed}>
        <View style={[styles.posterThumb, { backgroundColor: theme.backgroundSelected }]}>
          {item.thumbnail ? <Image source={{ uri: item.thumbnail }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
          <View style={styles.posterBadge}>
            <ThemedText type="caption" style={styles.posterBadgeText}>
              {item.category}
            </ThemedText>
          </View>
          <View style={styles.playDot}>
            <Ionicons name="play" size={20} color="#fff" style={{ marginLeft: 2 }} />
          </View>
        </View>
        <View style={styles.posterMeta}>
          <ThemedText type="smallBold" numberOfLines={2} style={styles.posterTitle}>
            {item.title}
          </ThemedText>
          {item.subtitle ? (
            <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
              {item.subtitle}
            </ThemedText>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}

/** 이번 주 말씀 자리표시 — 채널 목록을 불러오는 동안 잠깐 보여줍니다. */
function WeeklyMessageSkeleton() {
  const theme = useTheme();
  return (
    <Card elevated style={styles.weekly}>
      <View style={[styles.weeklyThumb, { backgroundColor: theme.backgroundSelected }]}>
        <ActivityIndicator color={theme.textMuted} />
      </View>
      <View style={styles.flex}>
        <View style={styles.weeklyTag}>
          <Ionicons name="volume-medium-outline" size={13} color={theme.accent} />
          <ThemedText type="caption" style={{ color: theme.accent, fontWeight: '700' }}>
            이번 주 말씀
          </ThemedText>
        </View>
        <View style={[styles.skelLine, { backgroundColor: theme.backgroundSelected, width: '80%' }]} />
        <View style={[styles.skelLine, { backgroundColor: theme.backgroundSelected, width: '55%' }]} />
      </View>
    </Card>
  );
}

function QuickAction({
  icon,
  label,
  badge,
  pulse,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  badge?: string;
  /** 실제 방송 중일 때처럼 배지를 은은하게 깜빡이게 합니다. */
  pulse?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pulse) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.35, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, pulseAnim]);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}>
      <View style={[styles.quickIcon, Shadow.soft, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Ionicons name={icon} size={22} color={theme.primary} />
        {badge ? (
          <Animated.View style={[styles.liveBadge, { backgroundColor: theme.danger, opacity: pulse ? pulseAnim : 1 }]}>
            <ThemedText type="caption" style={styles.liveText}>
              {badge}
            </ThemedText>
          </Animated.View>
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
  collapseCard: { gap: 0 },
  collapseHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  collapseBar: { width: 3, height: 16, borderRadius: 2 },
  collapseBody: { marginTop: Spacing.two },

  heroShadow: Shadow.card,
  heroDate: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  heroLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600', marginTop: 1 },
  heroTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  heroTag: { color: '#fff', fontWeight: '700', letterSpacing: 0.5 },
  heroTitle: { color: '#fff', marginTop: Spacing.two, lineHeight: 27 },
  heroVerse: { color: 'rgba(255,255,255,0.92)', marginTop: Spacing.one, fontWeight: '600' },

  weekly: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  weeklyThumb: {
    width: 104,
    height: 68,
    borderRadius: Radius.medium,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weeklyTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  skelLine: { height: 12, borderRadius: Radius.small, marginTop: 6 },

  // 이번 주 말씀 캐러셀
  posterThumb: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Radius.large,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterBadge: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  posterBadgeText: { color: '#fff', fontWeight: '800' },
  posterMeta: { marginTop: Spacing.two, alignItems: 'center', gap: 2 },
  posterTitle: { textAlign: 'center' },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: Spacing.two },
  dot: { height: 6, borderRadius: 3 },

  quickRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  quickAction: { flex: 1, alignItems: 'center', gap: Spacing.two },
  quickIcon: {
    width: 54,
    height: 54,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
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

  newsRow: { gap: Spacing.three, paddingRight: Spacing.three, paddingVertical: Spacing.one },
  newsCard: { width: 208, borderRadius: Radius.large, ...Shadow.soft },
  newsImage: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  newTag: { position: 'absolute', top: 8, right: 8, backgroundColor: '#C4453B', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  newTagText: { color: '#fff', fontWeight: '800', fontSize: 10 },
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

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useMemo, useState } from 'react';
import { Image, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { ChurchInfo } from '@/constants/church';
import { repository, useAsyncData } from '@/lib/data';
import { useYouTubeTitle } from '@/lib/use-youtube-title';
import {
  classifyChurchVideo,
  parseYouTubeUrl,
  SERMON_CATEGORY_ORDER,
  youtubeThumbnail,
  type SermonCategory,
} from '@/lib/youtube';
import { formatDate } from '@/lib/format';

const ALL = '전체';

/** 설교 목록 한 항목 — 등록된 설교 또는 채널 영상(자동 분류) 공통 */
interface Entry {
  key: string;
  category: SermonCategory;
  title: string;
  /** 정렬·표시용 날짜 (YYYY-MM-DD) */
  date: string;
  mediaUrl: string;
  thumbnail?: string;
  /** 등록된 설교면 본문·설교자 */
  subtitle?: string;
  registered: boolean;
  onPress: () => void;
  onRegister?: () => void;
}

export default function SermonsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [category, setCategory] = useState<string>(ALL);

  const sermons = useAsyncData(() => repository.listSermons());
  const channel = useAsyncData(() => repository.listChannelVideos());

  const reloadAll = useCallback(() => {
    sermons.reload();
    channel.reload();
  }, [sermons, channel]);

  useFocusEffect(
    useCallback(() => {
      reloadAll();
    }, [reloadAll]),
  );

  const entries = useMemo<Entry[]>(() => {
    const sermonList = sermons.data ?? [];
    const registeredIds = new Set(
      sermonList.map((s) => parseYouTubeUrl(s.mediaUrl)?.videoId).filter(Boolean) as string[],
    );

    // 등록된 설교: 관리자가 정한 시리즈가 표준 카테고리면 그대로, 아니면 제목으로 분류
    const fromSermons: Entry[] = sermonList.map((s) => {
      const video = parseYouTubeUrl(s.mediaUrl);
      const isShorts = video?.kind === 'shorts';
      const series = (s.series ?? '').trim();
      const category = (SERMON_CATEGORY_ORDER as string[]).includes(series)
        ? (series as SermonCategory)
        : classifyChurchVideo(`${series} ${s.title}`, isShorts);
      return {
        key: `s-${s.id}`,
        category,
        title: s.title,
        date: s.date,
        mediaUrl: s.mediaUrl,
        thumbnail: s.thumbnailUrl ?? (video ? youtubeThumbnail(video.videoId) : undefined),
        subtitle: [s.scripture, s.preacher].filter(Boolean).join(' · ') || undefined,
        registered: true,
        onPress: () => router.push(`/sermons/${s.id}`),
      };
    });

    // 채널 영상 중 아직 설교로 등록되지 않은 것: 제목으로 자동 분류
    const fromChannel: Entry[] = (channel.data ?? [])
      .filter((v) => !registeredIds.has(v.videoId))
      .map((v) => ({
        key: `c-${v.videoId}`,
        category: classifyChurchVideo(v.title),
        title: v.title,
        date: (v.publishedAt || '').slice(0, 10),
        mediaUrl: `https://www.youtube.com/watch?v=${v.videoId}`,
        thumbnail: v.thumbnail || youtubeThumbnail(v.videoId),
        registered: false,
        onPress: () => router.push(`/watch/${v.videoId}`),
        onRegister: () => router.push(`/admin/sermon/new?videoId=${v.videoId}`),
      }));

    return [...fromSermons, ...fromChannel].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [sermons.data, channel.data, router]);

  const categories = useMemo(() => {
    const present = new Set(entries.map((e) => e.category));
    return [ALL, ...SERMON_CATEGORY_ORDER.filter((c) => present.has(c))];
  }, [entries]);

  if (sermons.loading && !sermons.data) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (sermons.error) {
    return (
      <Screen>
        <ErrorState message={sermons.error} onRetry={reloadAll} />
      </Screen>
    );
  }

  const items = category === ALL ? entries : entries.filter((e) => e.category === category);

  return (
    <Screen onRefresh={reloadAll}>
      {categories.length > 1 ? (
        <View style={styles.filterRow}>
          {categories.map((option) => {
            const active = option === category;
            return (
              <Pressable
                key={option}
                onPress={() => setCategory(option)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.primary : theme.backgroundElement,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}>
                <ThemedText type="caption" style={{ color: active ? theme.onPrimary : theme.textSecondary, fontWeight: '700' }}>
                  {option}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {ChurchInfo.youtubeUrl ? (
        <Button
          label="교회 유튜브 채널"
          icon="logo-youtube"
          variant="ghost"
          onPress={() => {
            if (Platform.OS === 'web') void Linking.openURL(ChurchInfo.youtubeUrl);
            else void WebBrowser.openBrowserAsync(ChurchInfo.youtubeUrl);
          }}
        />
      ) : null}

      {isAdmin ? (
        <Button
          label="새 설교 등록"
          icon="add-circle-outline"
          variant="secondary"
          onPress={() => router.push('/admin/sermon/new')}
        />
      ) : null}

      {items.length === 0 ? (
        <EmptyState icon="play-circle-outline" message="표시할 설교 영상이 없습니다." />
      ) : (
        <View style={styles.stack}>
          {items.map((entry) => (
            <SermonEntryRow key={entry.key} entry={entry} isAdmin={isAdmin} />
          ))}
        </View>
      )}
    </Screen>
  );
}

/** 목록 한 줄. 제목이 비어 있으면 유튜브에서 실제 제목을 가져옵니다. */
function SermonEntryRow({ entry, isAdmin }: { entry: Entry; isAdmin: boolean }) {
  const t = useTheme();
  const title = useYouTubeTitle(entry.mediaUrl, entry.title, '설교 영상');
  const [thumbFailed, setThumbFailed] = useState(false);
  const showThumb = Boolean(entry.thumbnail) && !thumbFailed;

  return (
    <Card onPress={entry.onPress}>
      <View style={styles.row}>
        <View style={[styles.thumb, { backgroundColor: t.backgroundSelected }]}>
          {showThumb ? (
            <Image source={{ uri: entry.thumbnail! }} style={styles.thumbImage} resizeMode="cover" onError={() => setThumbFailed(true)} />
          ) : (
            <Ionicons name={entry.registered ? 'videocam-outline' : 'logo-youtube'} size={22} color={entry.registered ? t.primary : '#c4302b'} />
          )}
        </View>
        <View style={styles.flex}>
          <View style={styles.metaRow}>
            <Badge label={entry.category} tone="primary" />
            {!entry.registered ? <Badge label="유튜브" tone="accent" /> : null}
            <ThemedText type="caption" themeColor="textMuted">
              {entry.date ? formatDate(entry.date) : ''}
            </ThemedText>
          </View>
          <ThemedText type="smallBold" numberOfLines={2}>
            {title}
          </ThemedText>
          {entry.subtitle ? (
            <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
              {entry.subtitle}
            </ThemedText>
          ) : null}
          {isAdmin && entry.onRegister ? (
            <Pressable onPress={entry.onRegister} hitSlop={6} style={styles.registerLink}>
              <Ionicons name="add-circle-outline" size={14} color={t.primary} />
              <ThemedText type="caption" style={{ color: t.primary, fontWeight: '700' }}>
                설교로 등록 (설교자·본문 추가)
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: Spacing.two },
  filterRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  thumb: { width: 68, height: 52, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: 2, flexWrap: 'wrap' },
  registerLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
});

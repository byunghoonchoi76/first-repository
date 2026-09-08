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
import { repository, useAsyncData, type ChannelVideo, type Sermon } from '@/lib/data';
import { useYouTubeTitle } from '@/lib/use-youtube-title';
import { parseYouTubeUrl, youtubeThumbnail } from '@/lib/youtube';
import { formatDate } from '@/lib/format';

export default function SermonsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [series, setSeries] = useState<string>('전체');

  const sermons = useAsyncData(() => repository.listSermons());
  const channel = useAsyncData(() => repository.listChannelVideos());
  const { reload } = sermons;
  const reloadChannel = channel.reload;

  useFocusEffect(
    useCallback(() => {
      reload();
      reloadChannel();
    }, [reload, reloadChannel]),
  );

  const seriesOptions = useMemo(() => {
    const names = new Set<string>();
    let hasShorts = false;
    (sermons.data ?? []).forEach((s) => {
      if (s.series) names.add(s.series);
      if (parseYouTubeUrl(s.mediaUrl)?.kind === 'shorts') hasShorts = true;
    });
    return ['전체', ...(hasShorts ? ['쇼츠'] : []), ...Array.from(names)];
  }, [sermons.data]);

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
        <ErrorState message={sermons.error} onRetry={sermons.reload} />
      </Screen>
    );
  }

  const allSermons = sermons.data ?? [];
  const items = allSermons.filter((s) => {
    if (series === '전체') return true;
    if (series === '쇼츠') return parseYouTubeUrl(s.mediaUrl)?.kind === 'shorts';
    return s.series === series;
  });

  // 이미 설교로 등록된 유튜브 영상은 자동 목록에서 빼서 중복을 막습니다.
  const registeredIds = new Set(
    allSermons.map((s) => parseYouTubeUrl(s.mediaUrl)?.videoId).filter(Boolean) as string[],
  );
  const channelVideos = (channel.data ?? []).filter((v) => !registeredIds.has(v.videoId));
  // 자동 '유튜브 최신 영상'은 전체 보기에서만 표시합니다.
  const showChannel = series === '전체' && channelVideos.length > 0;

  const reloadAll = () => {
    sermons.reload();
    channel.reload();
  };

  return (
    <Screen onRefresh={reloadAll}>
      {seriesOptions.length > 1 ? (
        <View style={styles.filterRow}>
          {seriesOptions.map((option) => {
            const active = option === series;
            return (
              <Pressable
                key={option}
                onPress={() => setSeries(option)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.primary : theme.backgroundElement,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}>
                <ThemedText
                  type="caption"
                  style={{ color: active ? theme.onPrimary : theme.textSecondary, fontWeight: '700' }}>
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
            if (Platform.OS === 'web') {
              void Linking.openURL(ChurchInfo.youtubeUrl);
            } else {
              void WebBrowser.openBrowserAsync(ChurchInfo.youtubeUrl);
            }
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

      {items.length === 0 && !showChannel ? (
        <EmptyState icon="play-circle-outline" message="등록된 설교가 없습니다." />
      ) : (
        <View style={styles.stack}>
          {items.map((sermon) => (
            <SermonRow key={sermon.id} sermon={sermon} onPress={() => router.push(`/sermons/${sermon.id}`)} />
          ))}
        </View>
      )}

      {showChannel ? (
        <View style={styles.channelSection}>
          <View style={styles.channelHead}>
            <Ionicons name="logo-youtube" size={18} color="#c4302b" />
            <ThemedText type="smallBold">유튜브 최신 영상</ThemedText>
          </View>
          <ThemedText type="caption" themeColor="textMuted">
            교회 유튜브 채널에 올라온 최근 영상이에요. 눌러서 바로 볼 수 있어요.
          </ThemedText>
          <View style={styles.stack}>
            {channelVideos.map((v) => (
              <ChannelVideoRow
                key={v.videoId}
                video={v}
                isAdmin={isAdmin}
                onPress={() => router.push(`/watch/${v.videoId}`)}
                onRegister={() => router.push(`/admin/sermon/new?videoId=${v.videoId}`)}
              />
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

/** 유튜브 채널 최신 영상 한 줄 (설교로 아직 등록되지 않은 영상). */
function ChannelVideoRow({
  video,
  isAdmin,
  onPress,
  onRegister,
}: {
  video: ChannelVideo;
  isAdmin: boolean;
  onPress: () => void;
  onRegister: () => void;
}) {
  const theme = useTheme();
  const [thumbFailed, setThumbFailed] = useState(false);
  const thumbnail = video.thumbnail || youtubeThumbnail(video.videoId);
  const showThumb = Boolean(thumbnail) && !thumbFailed;
  return (
    <Card onPress={onPress}>
      <View style={styles.row}>
        <View style={[styles.thumb, { backgroundColor: theme.backgroundSelected }]}>
          {showThumb ? (
            <Image source={{ uri: thumbnail }} style={styles.thumbImage} resizeMode="cover" onError={() => setThumbFailed(true)} />
          ) : (
            <Ionicons name="logo-youtube" size={22} color="#c4302b" />
          )}
        </View>
        <View style={styles.flex}>
          <View style={styles.metaRow}>
            <Badge label="유튜브" tone="accent" />
            <ThemedText type="caption" themeColor="textMuted">
              {video.publishedAt ? formatDate(video.publishedAt.slice(0, 10)) : ''}
            </ThemedText>
          </View>
          <ThemedText type="smallBold" numberOfLines={2}>
            {video.title}
          </ThemedText>
          {isAdmin ? (
            <Pressable onPress={onRegister} hitSlop={6} style={styles.registerLink}>
              <Ionicons name="add-circle-outline" size={14} color={theme.primary} />
              <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '700' }}>
                설교로 등록
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

/** 설교 목록 한 줄. 제목이 비어 있으면 유튜브에서 실제 제목을 가져옵니다. */
function SermonRow({ sermon, onPress }: { sermon: Sermon; onPress: () => void }) {
  const theme = useTheme();
  const video = parseYouTubeUrl(sermon.mediaUrl);
  const title = useYouTubeTitle(sermon.mediaUrl, sermon.title, video?.kind === 'shorts' ? '쇼츠 영상' : '설교 영상');
  const thumbnail = sermon.thumbnailUrl ?? (video ? youtubeThumbnail(video.videoId) : undefined);
  const [thumbFailed, setThumbFailed] = useState(false);
  const showThumb = Boolean(thumbnail) && !thumbFailed;

  return (
    <Card onPress={onPress}>
      <View style={styles.row}>
        <View style={[styles.thumb, { backgroundColor: theme.backgroundSelected }]}>
          {showThumb ? (
            <Image
              source={{ uri: thumbnail! }}
              style={styles.thumbImage}
              resizeMode="cover"
              onError={() => setThumbFailed(true)}
            />
          ) : (
            <Ionicons
              name={
                video?.kind === 'shorts'
                  ? 'phone-portrait-outline'
                  : sermon.mediaType === 'video'
                    ? 'videocam-outline'
                    : 'headset-outline'
              }
              size={22}
              color={theme.primary}
            />
          )}
        </View>
        <View style={styles.flex}>
          <View style={styles.metaRow}>
            <Badge
              label={video?.kind === 'shorts' ? '쇼츠' : sermon.mediaType === 'video' ? '영상' : '음성'}
              tone={sermon.mediaType === 'video' ? 'primary' : 'success'}
            />
            <ThemedText type="caption" themeColor="textMuted">
              {formatDate(sermon.date)}
            </ThemedText>
          </View>
          <ThemedText type="smallBold" numberOfLines={2}>
            {title}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {[sermon.scripture, sermon.preacher].filter(Boolean).join(' · ')}
          </ThemedText>
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
  channelSection: { gap: Spacing.two },
  channelHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  registerLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  row: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  thumb: {
    width: 68,
    height: 52,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: { width: '100%', height: '100%' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: 2 },
});

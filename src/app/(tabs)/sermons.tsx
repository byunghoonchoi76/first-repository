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
import { repository, useAsyncData, type Sermon } from '@/lib/data';
import { useYouTubeTitle } from '@/lib/use-youtube-title';
import { parseYouTubeUrl, youtubeThumbnail } from '@/lib/youtube';
import { formatDate } from '@/lib/format';

export default function SermonsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [series, setSeries] = useState<string>('전체');

  const sermons = useAsyncData(() => repository.listSermons());
  const { reload } = sermons;

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
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

  const items = (sermons.data ?? []).filter((s) => {
    if (series === '전체') return true;
    if (series === '쇼츠') return parseYouTubeUrl(s.mediaUrl)?.kind === 'shorts';
    return s.series === series;
  });

  return (
    <Screen onRefresh={sermons.reload}>
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

      {items.length === 0 ? (
        <EmptyState icon="play-circle-outline" message="등록된 설교가 없습니다." />
      ) : (
        <View style={styles.stack}>
          {items.map((sermon) => (
            <SermonRow key={sermon.id} sermon={sermon} onPress={() => router.push(`/sermons/${sermon.id}`)} />
          ))}
        </View>
      )}
    </Screen>
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

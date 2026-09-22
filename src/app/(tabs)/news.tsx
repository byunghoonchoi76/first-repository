import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { repository, useAsyncData, type AnnouncementCategory } from '@/lib/data';
import { formatRelative, isWithinDays } from '@/lib/format';

const FILTERS: ('전체' | AnnouncementCategory)[] = ['전체', '공지', '행사', '소식'];

export default function NewsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('전체');

  const announcements = useAsyncData(() => repository.listAnnouncements());
  const { reload } = announcements;

  // 관리자 화면에서 글을 쓰고 돌아오면 목록을 새로 불러옵니다.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  if (announcements.loading && !announcements.data) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (announcements.error) {
    return (
      <Screen>
        <ErrorState message={announcements.error} onRetry={announcements.reload} />
      </Screen>
    );
  }

  const items = (announcements.data ?? []).filter(
    (item) => filter === '전체' || item.category === filter,
  );

  return (
    <Screen onRefresh={announcements.reload}>
      <View style={styles.filterRow}>
        {FILTERS.map((option) => {
          const active = option === filter;
          return (
            <Pressable
              key={option}
              onPress={() => setFilter(option)}
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

      {isAdmin ? (
        <Button
          label="새 공지 작성"
          icon="create-outline"
          variant="secondary"
          onPress={() => router.push('/admin/announcement/new')}
        />
      ) : null}

      {items.length === 0 ? (
        <EmptyState icon="megaphone-outline" message="해당하는 소식이 없습니다." />
      ) : (
        <View style={styles.stack}>
          {items.map((item) => (
            <Card key={item.id} onPress={() => router.push(`/news/${item.id}`)}>
              <View style={styles.rowBetween}>
                <View style={styles.metaRow}>
                  {isWithinDays(item.publishedAt, 3) ? <Badge label="새 소식" tone="danger" /> : null}
                  <Badge label={item.category} tone={item.category === '행사' ? 'accent' : 'primary'} />
                  {item.subCategory ? <Badge label={item.subCategory} tone="textSecondary" /> : null}
                </View>
                <View style={styles.metaRow}>
                  {item.pinned ? <Ionicons name="pin" size={13} color={theme.accent} /> : null}
                  <ThemedText type="caption" themeColor="textMuted">
                    {formatRelative(item.publishedAt)}
                  </ThemedText>
                </View>
              </View>
              <ThemedText type="heading" numberOfLines={2}>
                {item.title}
              </ThemedText>
              <View style={styles.bodyRow}>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={2} style={styles.flex}>
                  {item.body}
                </ThemedText>
                {item.images && item.images.length > 0 ? (
                  <Image source={{ uri: item.images[0] }} style={styles.thumb} contentFit="cover" transition={120} />
                ) : null}
              </View>
              <ThemedText type="caption" themeColor="textMuted">
                {item.author}
              </ThemedText>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: Spacing.two },
  filterRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  bodyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  flex: { flex: 1 },
  thumb: { width: 56, height: 56, borderRadius: Radius.small },
});

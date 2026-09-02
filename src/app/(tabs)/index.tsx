import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ChurchLogoWhite } from '@/components/church-logo';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, EmptyState, ErrorState, ListRow, LoadingState, SectionHeader } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { repository, useAsyncData } from '@/lib/data';
import { formatDate, formatFullDate, minutesLabel } from '@/lib/format';
import { usePrayerLog } from '@/lib/prayer-log';

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
  const prayerLog = usePrayerLog();

  const profile = useAsyncData(() => repository.getChurchProfile());
  const bulletin = useAsyncData(() => repository.getLatestBulletin());
  const announcements = useAsyncData(() => repository.listAnnouncements());

  const loading = profile.loading || bulletin.loading || announcements.loading;
  const error = profile.error ?? bulletin.error ?? announcements.error;

  const reloadAll = () => {
    profile.reload();
    bulletin.reload();
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

  const topAnnouncements = (announcements.data ?? []).slice(0, 3);

  return (
    <Screen onRefresh={reloadAll} refreshing={false}>
      {/* 인사 + 이번 주 말씀 */}
      <Card style={[styles.hero, { backgroundColor: theme.primary, borderColor: theme.primary }]}>
        <ChurchLogoWhite width={168} />
        <ThemedText type="caption" style={{ color: theme.onPrimary, opacity: 0.9 }}>
          {formatFullDate(new Date().toISOString().slice(0, 10))}
        </ThemedText>
        <ThemedText type="subtitle" style={{ color: theme.onPrimary }}>
          {greeting()}
          {user ? `, ${user.name}님` : ''}
        </ThemedText>
        {bulletin.data ? (
          <ThemedText type="small" style={{ color: theme.onPrimary, opacity: 0.9 }}>
            {bulletin.data.weeklyVerse}
          </ThemedText>
        ) : null}
      </Card>

      {/* 빠른 메뉴 */}
      <View style={styles.quickRow}>
        <QuickAction icon="book-outline" label="주보" onPress={() => router.push('/bulletins')} />
        <QuickAction icon="play-circle-outline" label="설교" onPress={() => router.push('/sermons')} />
        <QuickAction icon="flower-outline" label="기도" onPress={() => router.push('/prayer')} />
        <QuickAction icon="people-outline" label="소그룹" onPress={() => router.push('/groups')} />
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

      {/* 나의 기도 */}
      <View>
        <SectionHeader title="나의 기도" actionLabel="기록하기" onAction={() => router.push('/prayer')} />
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
          {prayerLog.todayMinutes === 0 ? (
            <Button label="오늘 기도 기록하기" icon="add" onPress={() => router.push('/prayer')} />
          ) : null}
        </Card>
      </View>

      {/* 교회 안내 */}
      <View>
        <SectionHeader title="교회 안내" />
        <Card>
          <ListRow
            icon="time-outline"
            title="예배 안내"
            subtitle="주일예배 · 새벽예배 · 교육부서 시간표"
            onPress={() => router.push('/services')}
          />
          <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
          <ListRow
            icon="people-outline"
            title="섬기는 사람들"
            subtitle="교역자와 직분자를 소개합니다"
            onPress={() => router.push('/staff')}
          />
          <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
          <ListRow
            icon="location-outline"
            title="교회 장소"
            subtitle={profile.data?.address}
            onPress={() => router.push('/location')}
          />
          <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
          <ListRow
            icon="card-outline"
            title="헌금 안내"
            subtitle="헌금 계좌 안내"
            onPress={() => router.push('/giving')}
          />
        </Card>
      </View>

      {/* 최근 소식 */}
      <View>
        <SectionHeader title="교회 소식" actionLabel="더보기" onAction={() => router.push('/news')} />
        {topAnnouncements.length === 0 ? (
          <EmptyState message="아직 등록된 소식이 없습니다." />
        ) : (
          <View style={styles.stack}>
            {topAnnouncements.map((item) => (
              <Card key={item.id} onPress={() => router.push(`/news/${item.id}`)}>
                <View style={styles.rowBetween}>
                  <Badge label={item.category} tone={item.category === '행사' ? 'accent' : 'primary'} />
                  {item.pinned ? <Ionicons name="pin" size={14} color={theme.accent} /> : null}
                </View>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {item.title}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary" numberOfLines={2}>
                  {item.body}
                </ThemedText>
              </Card>
            ))}
          </View>
        )}
      </View>

    </Screen>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Card style={styles.quickAction} onPress={onPress}>
      <Ionicons name={icon} size={22} color={theme.primary} />
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: Spacing.two },
  hero: { gap: Spacing.two, padding: Spacing.four },
  quickRow: { flexDirection: 'row', gap: Spacing.two },
  menuDivider: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.one },
  quickAction: { flex: 1, alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.three },
  prayerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  streakBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  divider: { height: StyleSheet.hairlineWidth },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});

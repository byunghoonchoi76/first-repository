import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, EmptyState, ListRow, SectionHeader } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { dataMode, repository, useAsyncData } from '@/lib/data';
import { formatDate, formatRelative } from '@/lib/format';
import { useLiveOverride, type LiveOverride } from '@/lib/live-status';

export default function AdminHomeScreen() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const bulletins = useAsyncData(() => repository.listBulletins());
  const groups = useAsyncData(() => repository.listGroups());
  const staff = useAsyncData(() => repository.listStaff());
  const announcements = useAsyncData(() => repository.listAnnouncements());
  const sermons = useAsyncData(() => repository.listSermons());

  const reloadAll = useCallback(() => {
    bulletins.reload();
    groups.reload();
    staff.reload();
    announcements.reload();
    sermons.reload();
  }, [bulletins, groups, staff, announcements, sermons]);

  useFocusEffect(
    useCallback(() => {
      reloadAll();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  if (!isAdmin) {
    return (
      <Screen>
        <EmptyState icon="lock-closed-outline" message="관리자만 볼 수 있는 화면입니다." />
        <Button label="로그인 화면으로" variant="secondary" onPress={() => router.push('/sign-in')} />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={reloadAll}>
      {dataMode === 'sample' ? (
        <Card>
          <Badge label="샘플 모드" tone="accent" />
          <ThemedText type="small" themeColor="textSecondary">
            지금 작성한 내용은 이 기기에만 저장됩니다. Supabase 를 연결하면 모든 성도에게 함께 보입니다.
          </ThemedText>
        </Card>
      ) : null}

      <LiveOverrideCard />

      <View>
        <SectionHeader title="주보" actionLabel="새로 등록" onAction={() => router.push('/admin/bulletin/new')} />
        <ThemedText type="caption" themeColor="textMuted" style={{ marginBottom: 8 }}>
          지난 주보를 모두 보려면 홈 화면의 주보 메뉴를 눌러 주세요.
        </ThemedText>
        <Card>
          {(bulletins.data ?? []).slice(0, 6).map((item) => (
            <ListRow
              key={item.id}
              icon="book-outline"
              title={`${formatDate(item.serviceDate)} · ${item.sermonTitle}`}
              subtitle={`${item.scripture} · ${item.preacher}`}
              onPress={() => router.push(`/admin/bulletin/${item.id}`)}
            />
          ))}
          {(bulletins.data ?? []).length === 0 ? (
            <EmptyState icon="book-outline" message="등록된 주보가 없습니다." />
          ) : null}
        </Card>
      </View>

      <View>
        <SectionHeader
          title="공지사항"
          actionLabel="새로 작성"
          onAction={() => router.push('/admin/announcement/new')}
        />
        <Card>
          {(announcements.data ?? []).slice(0, 8).map((item) => (
            <ListRow
              key={item.id}
              icon={item.pinned ? 'pin' : 'document-text-outline'}
              title={item.title}
              subtitle={`${item.category} · ${item.author} · ${formatRelative(item.publishedAt)}`}
              onPress={() => router.push(`/admin/announcement/${item.id}`)}
            />
          ))}
          {(announcements.data ?? []).length === 0 ? (
            <EmptyState icon="document-text-outline" message="등록된 공지가 없습니다." />
          ) : null}
        </Card>
      </View>

      <View>
        <SectionHeader title="새가족 등록 명단" actionLabel="전체 보기" onAction={() => router.push('/admin/new-families')} />
        <Card>
          <ListRow
            icon="person-add-outline"
            title="새가족 등록 신청 보기"
            subtitle="방문하신 분들이 남긴 등록 신청을 확인합니다"
            onPress={() => router.push('/admin/new-families')}
          />
        </Card>
      </View>

      <View>
        <SectionHeader title="섬기는 사람들" actionLabel="새로 등록" onAction={() => router.push('/admin/staff/new')} />
        <Card>
          {(staff.data ?? []).map((item) => (
            <ListRow
              key={item.id}
              icon="person-outline"
              title={`${item.name} · ${item.role}`}
              subtitle={item.detail || undefined}
              onPress={() => router.push(`/admin/staff/${item.id}`)}
            />
          ))}
          {(staff.data ?? []).length === 0 ? (
            <EmptyState icon="people-outline" message="등록된 정보가 없습니다." />
          ) : null}
        </Card>
      </View>

      <View>
        <SectionHeader title="소그룹" actionLabel="새로 등록" onAction={() => router.push('/admin/group/new')} />
        <Card>
          {(groups.data ?? []).map((item) => (
            <ListRow
              key={item.id}
              icon="people-outline"
              title={item.name}
              subtitle={`${item.leader} · ${item.meetingInfo}`}
              onPress={() => router.push(`/admin/group/${item.id}`)}
            />
          ))}
          {(groups.data ?? []).length === 0 ? (
            <EmptyState icon="people-outline" message="등록된 소그룹이 없습니다." />
          ) : null}
        </Card>
      </View>

      <View>
        <SectionHeader title="설교" actionLabel="새로 등록" onAction={() => router.push('/admin/sermon/new')} />
        <Card>
          {(sermons.data ?? []).slice(0, 8).map((item) => (
            <ListRow
              key={item.id}
              icon={item.mediaType === 'video' ? 'videocam-outline' : 'headset-outline'}
              title={item.title}
              subtitle={`${formatDate(item.date)} · ${item.preacher}`}
              onPress={() => router.push(`/admin/sermon/${item.id}`)}
            />
          ))}
          {(sermons.data ?? []).length === 0 ? (
            <EmptyState icon="play-circle-outline" message="등록된 설교가 없습니다." />
          ) : null}
        </Card>
      </View>
    </Screen>
  );
}

/** 실시간 방송 표시 강제 스위치 (자동 / 강제 켜기 / 강제 끄기) */
const LIVE_OPTIONS: { mode: LiveOverride; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { mode: 'auto', label: '자동', icon: 'sync-outline' },
  { mode: 'on', label: '강제 켜기', icon: 'radio-outline' },
  { mode: 'off', label: '강제 끄기', icon: 'close-circle-outline' },
];

const LIVE_HINTS: Record<LiveOverride, string> = {
  auto: '유튜브 방송을 자동으로 감지해, 실제 방송 중일 때만 LIVE 배지를 켭니다.',
  on: '지금 모든 성도 화면에 LIVE 배지가 켜집니다. 예배가 끝나면 다시 꺼 주세요.',
  off: 'LIVE 배지를 항상 숨깁니다.',
};

function LiveOverrideCard() {
  const theme = useTheme();
  const { mode, setMode, loading, saving } = useLiveOverride();

  return (
    <View>
      <SectionHeader title="실시간 방송 표시" />
      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          홈 화면 ‘실시간 예배’의 LIVE 배지를 어떻게 표시할지 정합니다.
        </ThemedText>
        <View style={styles.liveRow}>
          {LIVE_OPTIONS.map((option) => {
            const active = mode === option.mode;
            return (
              <Pressable
                key={option.mode}
                disabled={loading || saving}
                onPress={() => void setMode(option.mode)}
                style={[
                  styles.liveChip,
                  {
                    backgroundColor: active ? theme.primary : theme.backgroundElement,
                    borderColor: active ? theme.primary : theme.border,
                    opacity: loading || saving ? 0.6 : 1,
                  },
                ]}>
                <Ionicons name={option.icon} size={18} color={active ? theme.onPrimary : theme.textSecondary} />
                <ThemedText type="smallBold" style={{ color: active ? theme.onPrimary : theme.text }}>
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
        <ThemedText type="caption" themeColor="textMuted" style={styles.liveHint}>
          {LIVE_HINTS[mode]}
        </ThemedText>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  liveRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three },
  liveChip: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
  },
  liveHint: { marginTop: Spacing.two, lineHeight: 17 },
});

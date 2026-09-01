import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, EmptyState, ListRow, SectionHeader } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { dataMode, repository, useAsyncData } from '@/lib/data';
import { formatDate, formatRelative } from '@/lib/format';

export default function AdminHomeScreen() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const bulletins = useAsyncData(() => repository.listBulletins());
  const groups = useAsyncData(() => repository.listGroups());
  const announcements = useAsyncData(() => repository.listAnnouncements());
  const sermons = useAsyncData(() => repository.listSermons());

  const reloadAll = useCallback(() => {
    bulletins.reload();
    groups.reload();
    announcements.reload();
    sermons.reload();
  }, [bulletins, groups, announcements, sermons]);

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

      <View>
        <SectionHeader title="주보" actionLabel="새로 등록" onAction={() => router.push('/admin/bulletin/new')} />
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

const styles = StyleSheet.create({});

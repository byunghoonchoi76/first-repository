import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { repository, useAsyncData } from '@/lib/data';

export default function GroupsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const groups = useAsyncData(() => repository.listGroups());
  const { reload } = groups;

  // 관리자가 소그룹을 등록·수정하고 돌아오면 목록을 새로 불러옵니다.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  if (groups.loading && !groups.data) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (groups.error) {
    return (
      <Screen>
        <ErrorState message={groups.error} onRetry={groups.reload} />
      </Screen>
    );
  }

  const items = groups.data ?? [];

  return (
    <Screen onRefresh={groups.reload}>
      <ThemedText type="small" themeColor="textSecondary">
        소그룹을 선택하면 소통방으로 들어갑니다.
      </ThemedText>

      {isAdmin ? (
        <Button
          label="새 소그룹 등록"
          icon="add-circle-outline"
          variant="secondary"
          onPress={() => router.push('/admin/group/new')}
        />
      ) : null}

      {items.length === 0 ? (
        <EmptyState icon="people-outline" message="등록된 소그룹이 없습니다." />
      ) : (
        <View style={styles.stack}>
          {items.map((group) => (
            <Card key={group.id} onPress={() => router.push(`/groups/${group.id}`)}>
              <View style={styles.row}>
                <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}>
                  <Ionicons name="people" size={20} color={theme.primary} />
                </View>
                <View style={styles.flex}>
                  <ThemedText type="smallBold">{group.name}</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {[group.leader, group.memberCount > 0 ? `구성원 ${group.memberCount}명` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textMuted">
                    {group.meetingInfo}
                  </ThemedText>
                </View>
                {isAdmin ? (
                  <Pressable
                    onPress={() => router.push(`/admin/group/${group.id}`)}
                    hitSlop={10}
                    style={styles.editButton}>
                    <Ionicons name="create-outline" size={18} color={theme.primary} />
                  </Pressable>
                ) : null}
                <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {group.description}
              </ThemedText>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: { width: 44, height: 44, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  editButton: { padding: Spacing.one },
});

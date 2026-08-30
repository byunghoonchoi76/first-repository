import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Card, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { repository, useAsyncData } from '@/lib/data';

export default function GroupsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const groups = useAsyncData(() => repository.listGroups());

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
                    {group.leader} · 구성원 {group.memberCount}명
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textMuted">
                    {group.meetingInfo}
                  </ThemedText>
                </View>
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
});

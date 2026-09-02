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

/** 섬기는 사람들 — 교역자·직분자 소개. 관리자는 여기서 등록·수정합니다. */
export default function StaffScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const staff = useAsyncData(() => repository.listStaff());
  const { reload } = staff;

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  if (staff.loading && !staff.data) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (staff.error) {
    return (
      <Screen>
        <ErrorState message={staff.error} onRetry={reload} />
      </Screen>
    );
  }

  const items = staff.data ?? [];

  return (
    <Screen onRefresh={reload}>
      {isAdmin ? (
        <Button
          label="새로 등록"
          icon="add-circle-outline"
          variant="secondary"
          onPress={() => router.push('/admin/staff/new')}
        />
      ) : null}

      {items.length === 0 ? (
        <EmptyState icon="people-outline" message="등록된 정보가 없습니다." />
      ) : (
        <Card style={styles.card}>
          {items.map((member, index) => (
            <View key={member.id}>
              {index > 0 ? <View style={[styles.divider, { backgroundColor: theme.border }]} /> : null}
              <Pressable
                onPress={isAdmin ? () => router.push(`/admin/staff/${member.id}`) : undefined}
                style={styles.row}>
                <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    {member.name.slice(0, 1)}
                  </ThemedText>
                </View>
                <View style={styles.flex}>
                  <View style={styles.nameRow}>
                    <ThemedText type="smallBold">{member.name}</ThemedText>
                    <ThemedText type="caption" themeColor="primary">
                      {member.role}
                    </ThemedText>
                  </View>
                  {member.detail ? (
                    <ThemedText type="caption" themeColor="textSecondary">
                      {member.detail}
                    </ThemedText>
                  ) : null}
                </View>
                {isAdmin ? <Ionicons name="create-outline" size={18} color={theme.textMuted} /> : null}
              </Pressable>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { paddingVertical: Spacing.two },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
});

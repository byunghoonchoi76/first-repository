import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { repository, useAsyncData } from '@/lib/data';
import type { StaffCategory } from '@/lib/data/types';

/** 화면 표시용 묶음 — 교역자(목사·전도사) / 장로 / 관리 */
const GROUPS: { key: string; cats: StaffCategory[] }[] = [
  { key: '교역자', cats: ['목사', '전도사'] },
  { key: '장로', cats: ['장로'] },
  { key: '관리', cats: ['관리'] },
];

/** 섬기는 사람들 — 교역자·직분자 소개. 관리자는 여기서 등록·수정합니다. */
export default function StaffScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { isAdmin } = useAuth();
  const staff = useAsyncData(() => repository.listStaff());
  const { reload } = staff;
  // 첫 묶음(교역자)은 펼친 상태로 시작합니다.
  const [open, setOpen] = useState<Set<string>>(new Set(['교역자']));

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
  // 교역자(목사·전도사) / 장로 / 관리 로 묶고, 묶음 안에서는 분류·표시순서대로 정렬합니다.
  // 관리자는 빈 묶음도 볼 수 있어 어디에 등록할지 알 수 있습니다. 성도에게는 사람이 있는 묶음만 보입니다.
  const groups = GROUPS.map((g) => ({
    key: g.key,
    members: items
      .filter((m) => g.cats.includes(m.category))
      .sort((a, b) => {
        const ca = g.cats.indexOf(a.category);
        const cb = g.cats.indexOf(b.category);
        return ca !== cb ? ca - cb : a.sortOrder - b.sortOrder;
      }),
  })).filter((g) => isAdmin || g.members.length > 0);

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const openEditor = (id: string) => router.push(`/admin/staff/${id}`);

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

      {groups.length === 0 ? (
        <EmptyState icon="people-outline" message="등록된 정보가 없습니다." />
      ) : (
        groups.map((group) => {
          const expanded = open.has(group.key);
          return (
            <Card key={group.key} elevated style={styles.card}>
              <Pressable onPress={() => toggle(group.key)} style={styles.groupHeader}>
                <View style={[styles.sectionBar, { backgroundColor: theme.primary }]} />
                <ThemedText type="smallBold" style={styles.flex}>
                  {group.key}
                </ThemedText>
                <ThemedText type="caption" themeColor="textMuted">
                  {group.members.length}명
                </ThemedText>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textMuted} />
              </Pressable>

              {expanded ? (
                <View style={styles.groupBody}>
                  {group.members.length === 0 ? (
                    <ThemedText type="caption" themeColor="textMuted" style={styles.emptyRow}>
                      아직 등록된 분이 없습니다. &lsquo;새로 등록&rsquo;에서 추가하세요.
                    </ThemedText>
                  ) : null}
                  {group.members.map((member, index) => (
                    <View key={member.id}>
                      {index > 0 ? <View style={[styles.divider, { backgroundColor: theme.border }]} /> : null}
                      <Pressable onPress={isAdmin ? () => openEditor(member.id) : undefined} style={styles.row}>
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
                </View>
              ) : null}
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sectionBar: { width: 3, height: 16, borderRadius: 2 },
  card: { gap: 0 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  groupBody: { marginTop: Spacing.three },
  emptyRow: { paddingVertical: Spacing.two },
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

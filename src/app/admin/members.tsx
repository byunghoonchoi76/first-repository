import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { repository, useAsyncData } from '@/lib/data';
import { formatDate } from '@/lib/format';

/** 관리자 — 가입자(계정) 명단 조회·삭제 */
export default function AdminMembersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const members = useAsyncData(() => repository.listMembers());

  if (!isAdmin) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '가입자 현황' }} />
        <Card>
          <EmptyState icon="lock-closed-outline" message="관리자만 볼 수 있는 화면입니다." />
          <Button label="로그인 화면으로" variant="secondary" onPress={() => router.push('/sign-in')} />
        </Card>
      </Screen>
    );
  }

  const confirmDelete = (id: string, name: string) => {
    const run = async () => {
      try {
        await repository.deleteMember(id);
        members.reload();
      } catch (e) {
        const message = e instanceof Error ? e.message : '삭제하지 못했습니다.';
        if (Platform.OS === 'web') window.alert(message); // eslint-disable-line no-alert
        else Alert.alert('삭제 실패', message);
      }
    };
    const message = `${name} 님의 계정을 삭제할까요?\n계정과 기도 기록·소통방 참여 정보가 함께 삭제되며 되돌릴 수 없습니다.`;
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (window.confirm(message)) void run();
      return;
    }
    Alert.alert('가입자 삭제', message, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => void run() },
    ]);
  };

  const items = members.data ?? [];

  return (
    <Screen onRefresh={members.reload}>
      <Stack.Screen options={{ title: '가입자 현황' }} />

      <View style={styles.headRow}>
        <ThemedText type="smallBold">
          전체 <ThemedText type="smallBold" themeColor="primary">{items.length}</ThemedText>명
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted">최근 가입 순</ThemedText>
      </View>

      {members.loading && !members.data ? (
        <LoadingState />
      ) : members.error ? (
        <ErrorState message={members.error} onRetry={members.reload} />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon="people-outline" message="가입한 성도가 없습니다." />
        </Card>
      ) : (
        <Card>
          {items.map((m, i) => {
            const isSelf = m.id === user?.id;
            return (
              <View
                key={m.id}
                style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
                <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}>
                  <Ionicons name={m.role === 'admin' ? 'shield-checkmark' : 'person'} size={16} color={m.role === 'admin' ? theme.primary : theme.textSecondary} />
                </View>
                <View style={styles.flex}>
                  <View style={styles.nameRow}>
                    <ThemedText type="small" numberOfLines={1}>
                      {m.name}
                      {isSelf ? ' (나)' : ''}
                    </ThemedText>
                    {m.role === 'admin' ? <Badge label="관리자" tone="primary" /> : null}
                  </View>
                  <ThemedText type="caption" themeColor="textMuted">
                    가입 {m.createdAt ? formatDate(m.createdAt.slice(0, 10)) : '-'}
                  </ThemedText>
                </View>
                {isSelf ? (
                  <ThemedText type="caption" themeColor="textMuted">
                    본인
                  </ThemedText>
                ) : (
                  <Pressable onPress={() => confirmDelete(m.id, m.name)} hitSlop={8} style={styles.deleteBtn} accessibilityLabel={`${m.name} 삭제`}>
                    <Ionicons name="trash-outline" size={18} color={theme.danger} />
                  </Pressable>
                )}
              </View>
            );
          })}
        </Card>
      )}

      <ThemedText type="caption" themeColor="textMuted" style={styles.note}>
        · 삭제하면 그 성도의 계정과 개인 기록(기도 시간·소통방 참여 등)이 함께 지워집니다.{'\n'}· 본인 계정은 이 화면에서 삭제할 수 없습니다.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two + 2 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  deleteBtn: { padding: 4 },
  note: { lineHeight: 17, marginTop: Spacing.one },
});

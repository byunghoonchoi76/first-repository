import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Badge, Card, EmptyState, LoadingState, SectionHeader, Toggle } from '@/components/ui';
import { UserPicker } from '@/components/user-picker';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { dataMode, repository, type DirectoryUser, type GroupMember, type MyGroupMembership } from '@/lib/data';
import { ensurePushSubscription } from '@/lib/reminders';

/** 소통방 멤버·초대·알림 관리 화면 */
export default function GroupMembersScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = String(id);
  const { user, isAdmin } = useAuth();

  const [members, setMembers] = useState<GroupMember[]>([]);
  const [membership, setMembership] = useState<MyGroupMembership | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [hint, setHint] = useState<string>();

  const load = useCallback(async () => {
    try {
      const [list, mine] = await Promise.all([
        repository.listGroupMembers(groupId),
        repository.getMyGroupMembership(groupId),
      ]);
      setMembers(list);
      setMembership(mine);
      setError(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : '불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    void load();
  }, [load]);

  const canManage = (membership?.role === 'leader') || isAdmin;

  const toggleNotify = async (want: boolean) => {
    setBusy(true);
    setError(undefined);
    setHint(undefined);
    try {
      if (want && Platform.OS === 'web') {
        const res = await ensurePushSubscription(user?.id ?? null);
        if (!res.ok) setHint(res.reason);
      }
      await repository.setGroupNotify(groupId, want);
      setMembership((m) => (m ? { ...m, notify: want } : m));
    } catch (e) {
      setError(e instanceof Error ? e.message : '알림 설정을 바꾸지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const invite = async (u: DirectoryUser) => {
    setBusy(true);
    setError(undefined);
    try {
      await repository.addGroupMember(groupId, u.id, 'member');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '초대하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = (target: GroupMember) => {
    const isSelf = target.userId === user?.id;
    const message = isSelf
      ? '이 소통방에서 나갈까요? 다시 들어오려면 초대가 필요합니다.'
      : `${target.name} 님을 이 소통방에서 내보낼까요?`;
    const run = async () => {
      setBusy(true);
      try {
        await repository.removeGroupMember(groupId, target.userId);
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : '내보내지 못했습니다.');
      } finally {
        setBusy(false);
      }
    };
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (window.confirm(message)) void run();
      return;
    }
    Alert.alert(isSelf ? '소통방 나가기' : '멤버 내보내기', message, [
      { text: '취소', style: 'cancel' },
      { text: isSelf ? '나가기' : '내보내기', style: 'destructive', onPress: () => void run() },
    ]);
  };

  if (loading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '소통방 멤버' }} />
        <LoadingState />
      </Screen>
    );
  }

  const memberIds = members.map((m) => m.userId);

  return (
    <Screen onRefresh={load}>
      <Stack.Screen options={{ title: '소통방 멤버' }} />

      {/* 개인별 알림 설정 */}
      {membership?.isMember ? (
        <Card>
          <View style={styles.rowBetween}>
            <View style={styles.flex}>
              <ThemedText type="smallBold">이 소통방 알림</ThemedText>
              <ThemedText type="caption" themeColor="textMuted">
                새 글이 올라오면 앱을 열지 않아도 알림을 받아요. (기기·개인별 설정)
              </ThemedText>
            </View>
            <Toggle label="" value={membership.notify} onChange={(v) => void toggleNotify(v)} />
          </View>
          {hint ? (
            <ThemedText type="caption" themeColor="danger" style={styles.mt}>
              {hint}
            </ThemedText>
          ) : null}
        </Card>
      ) : null}

      {/* 초대 (리더·관리자만) */}
      {canManage ? (
        <View>
          <SectionHeader title="멤버 초대" />
          <Card>
            <ThemedText type="caption" themeColor="textMuted" style={styles.mb}>
              앱에 가입한 성도를 이름으로 검색해 초대하세요. 초대된 분만 입장·대화할 수 있어요.
            </ThemedText>
            <UserPicker placeholder="초대할 성도 이름 검색" excludeIds={memberIds} onPick={(u) => void invite(u)} />
          </Card>
        </View>
      ) : null}

      {/* 멤버 목록 */}
      <View>
        <SectionHeader title={`멤버 ${members.length}명`} />
        {error ? (
          <Card>
            <ThemedText type="small" themeColor="danger">
              {error}
            </ThemedText>
          </Card>
        ) : members.length === 0 ? (
          <Card>
            <EmptyState icon="people-outline" message="아직 멤버가 없습니다." />
          </Card>
        ) : (
          <Card>
            {members.map((m, i) => {
              const isSelf = m.userId === user?.id;
              const canRemove = (canManage && m.role !== 'leader') || (isSelf && m.role !== 'leader');
              return (
                <View
                  key={m.userId}
                  style={[styles.memberRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
                  <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}>
                    <Ionicons name={m.role === 'leader' ? 'ribbon' : 'person'} size={15} color={m.role === 'leader' ? theme.primary : theme.textSecondary} />
                  </View>
                  <ThemedText type="small" style={styles.flex}>
                    {m.name}
                    {isSelf ? ' (나)' : ''}
                  </ThemedText>
                  {m.role === 'leader' ? <Badge label="리더" tone="primary" /> : null}
                  {canRemove && !busy ? (
                    <Pressable onPress={() => confirmRemove(m)} hitSlop={8} style={styles.removeBtn}>
                      <Ionicons name={isSelf ? 'exit-outline' : 'close-circle-outline'} size={20} color={theme.textMuted} />
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </Card>
        )}
      </View>

      {dataMode === 'supabase' && !membership?.isMember && !isAdmin ? (
        <Card>
          <EmptyState icon="lock-closed-outline" message="이 소통방의 멤버만 볼 수 있어요." />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  mt: { marginTop: Spacing.two },
  mb: { marginBottom: Spacing.two },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two + 2 },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  removeBtn: { padding: 2 },
});

import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Field, LoadingState } from '@/components/ui';
import { UserPicker } from '@/components/user-picker';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { repository, type DirectoryUser } from '@/lib/data';

export default function GroupEditorScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = String(id) === 'new';

  const [name, setName] = useState('');
  const [leaderName, setLeaderName] = useState('');
  const [leaderId, setLeaderId] = useState<string | undefined>();
  const [meetingInfo, setMeetingInfo] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (isNew) return;
    let active = true;
    repository
      .getGroup(String(id))
      .then((found) => {
        if (!active || !found) return;
        setName(found.name);
        setLeaderName(found.leader);
        setLeaderId(found.leaderId);
        setMeetingInfo(found.meetingInfo);
        setDescription(found.description);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '불러오지 못했습니다.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, isNew]);

  const pickLeader = (u: DirectoryUser) => {
    setLeaderId(u.id);
    setLeaderName(u.name);
  };

  const save = async () => {
    if (!name.trim()) {
      setError('소통방 이름을 입력해 주세요.');
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      const input = {
        name: name.trim(),
        leader: leaderName.trim(),
        leaderId,
        meetingInfo: meetingInfo.trim(),
        description: description.trim(),
      };
      if (isNew) {
        await repository.createGroup(input);
      } else {
        await repository.updateGroup(String(id), input);
      }
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    const remove = async () => {
      try {
        await repository.deleteGroup(String(id));
        // 소그룹 목록으로 돌아갑니다.
        router.dismissAll();
        router.replace('/groups');
      } catch (e) {
        setError(e instanceof Error ? e.message : '삭제하지 못했습니다.');
      }
    };

    const message = '이 소통방과 그 안의 대화·멤버가 모두 사라집니다. 삭제할까요?';
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (window.confirm(message)) void remove();
      return;
    }
    Alert.alert('소통방 삭제', message, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => void remove() },
    ]);
  };

  if (loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: isNew ? '소통방 등록' : '소통방 수정' }} />

      <View style={styles.form}>
        <Field label="소통방 이름" value={name} onChangeText={setName} placeholder="예) 청년부 · 반석" />

        <View style={styles.leaderBlock}>
          <ThemedText type="smallBold">리더</ThemedText>
          <ThemedText type="caption" themeColor="textMuted">
            앱에 가입한 성도 중에서 리더를 지정하세요. 리더가 소통방에 멤버를 초대할 수 있어요.
          </ThemedText>
          {leaderId ? (
            <Card style={styles.leaderChip}>
              <View style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}>
                <Ionicons name="ribbon" size={15} color={theme.primary} />
              </View>
              <View style={styles.flex}>
                <ThemedText type="smallBold">{leaderName}</ThemedText>
                <ThemedText type="caption" themeColor="textMuted">
                  리더로 지정됨
                </ThemedText>
              </View>
              <Pressable
                onPress={() => {
                  setLeaderId(undefined);
                  setLeaderName('');
                }}
                hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={theme.textMuted} />
              </Pressable>
            </Card>
          ) : (
            <UserPicker placeholder="리더 이름 검색" onPick={pickLeader} />
          )}
        </View>

        <Field
          label="모임 안내"
          value={meetingInfo}
          onChangeText={setMeetingInfo}
          placeholder="예) 매주 금요일 오후 8시 · 교육관 2층"
        />
        <Field
          label="소개"
          value={description}
          onChangeText={setDescription}
          placeholder="어떤 모임인지 한두 줄로 적어 주세요."
          multiline
        />

        {error ? (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        ) : null}

        <Button
          label={isNew ? '등록하기' : '수정 완료'}
          icon="save-outline"
          loading={saving}
          onPress={() => void save()}
        />

        {!isNew ? (
          <Button label="소통방 삭제" icon="trash-outline" variant="danger" onPress={confirmDelete} />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three },
  flex: { flex: 1 },
  leaderBlock: { gap: Spacing.two },
  leaderChip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});

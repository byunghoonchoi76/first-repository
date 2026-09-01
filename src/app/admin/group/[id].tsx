import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button, Field, LoadingState } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { repository } from '@/lib/data';

export default function GroupEditorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = String(id) === 'new';

  const [name, setName] = useState('');
  const [leader, setLeader] = useState('');
  const [meetingInfo, setMeetingInfo] = useState('');
  const [description, setDescription] = useState('');
  const [memberCount, setMemberCount] = useState('');
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
        setLeader(found.leader);
        setMeetingInfo(found.meetingInfo);
        setDescription(found.description);
        setMemberCount(found.memberCount > 0 ? String(found.memberCount) : '');
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '불러오지 못했습니다.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, isNew]);

  const save = async () => {
    if (!name.trim()) {
      setError('소그룹 이름을 입력해 주세요.');
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      const input = {
        name: name.trim(),
        leader: leader.trim(),
        meetingInfo: meetingInfo.trim(),
        description: description.trim(),
        // 숫자가 아니면 0 으로 두고, 화면에서는 표시하지 않습니다.
        memberCount: Number.parseInt(memberCount, 10) || 0,
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

    const message = '이 소그룹과 그 안의 대화가 모두 사라집니다. 삭제할까요?';
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (window.confirm(message)) void remove();
      return;
    }
    Alert.alert('소그룹 삭제', message, [
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
      <Stack.Screen options={{ title: isNew ? '소그룹 등록' : '소그룹 수정' }} />

      <View style={styles.form}>
        <Field label="소그룹 이름" value={name} onChangeText={setName} placeholder="예) 청년부 · 반석" />
        <Field label="리더" value={leader} onChangeText={setLeader} placeholder="예) 한지훈 리더" />
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
        <Field
          label="구성원 수 (선택)"
          value={memberCount}
          onChangeText={setMemberCount}
          placeholder="예) 14"
          keyboardType="number-pad"
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
          <Button label="소그룹 삭제" icon="trash-outline" variant="danger" onPress={confirmDelete} />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three },
});

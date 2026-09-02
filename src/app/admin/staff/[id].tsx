import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button, Field, LoadingState } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { repository } from '@/lib/data';

export default function StaffEditorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = String(id) === 'new';

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [detail, setDetail] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (isNew) return;
    let active = true;
    repository
      .getStaff(String(id))
      .then((found) => {
        if (!active || !found) return;
        setName(found.name);
        setRole(found.role);
        setDetail(found.detail);
        setSortOrder(String(found.sortOrder));
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '불러오지 못했습니다.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, isNew]);

  const save = async () => {
    if (!name.trim() || !role.trim()) {
      setError('이름과 직분을 입력해 주세요.');
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      const input = {
        name: name.trim(),
        role: role.trim(),
        detail: detail.trim(),
        sortOrder: Number.parseInt(sortOrder, 10) || 0,
      };
      if (isNew) {
        await repository.createStaff(input);
      } else {
        await repository.updateStaff(String(id), input);
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
        await repository.deleteStaff(String(id));
        router.back();
      } catch (e) {
        setError(e instanceof Error ? e.message : '삭제하지 못했습니다.');
      }
    };
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (window.confirm('삭제할까요?')) void remove();
      return;
    }
    Alert.alert('삭제', '삭제할까요?', [
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
      <Stack.Screen options={{ title: isNew ? '섬기는 분 등록' : '섬기는 분 수정' }} />
      <View style={styles.form}>
        <Field label="이름" value={name} onChangeText={setName} placeholder="예) 공진수" />
        <Field label="직분" value={role} onChangeText={setRole} placeholder="예) 담임목사 · 부목사 · 전도사 · 장로" />
        <Field
          label="담당·부서 (선택)"
          value={detail}
          onChangeText={setDetail}
          placeholder="예) 청년부 담당"
        />
        <Field
          label="표시 순서 (선택)"
          value={sortOrder}
          onChangeText={setSortOrder}
          placeholder="작은 숫자가 위에 옵니다 (예: 1)"
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
          <Button label="삭제" icon="trash-outline" variant="danger" onPress={confirmDelete} />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three },
});

import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Field, LoadingState } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { repository, type BulletinOrderItem } from '@/lib/data';
import { toDateKey } from '@/lib/format';

/** 새 주보를 만들 때 기본으로 깔아 두는 예배 순서 */
const DEFAULT_ORDER: BulletinOrderItem[] = [
  { title: '예배의 부름', detail: '' },
  { title: '찬송', detail: '' },
  { title: '신앙고백', detail: '사도신경 / 다같이' },
  { title: '기도', detail: '' },
  { title: '성경봉독', detail: '' },
  { title: '말씀', detail: '' },
  { title: '봉헌 · 광고', detail: '' },
  { title: '축도', detail: '' },
];

export default function BulletinEditorScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = String(id) === 'new';

  const [serviceDate, setServiceDate] = useState(toDateKey());
  const [title, setTitle] = useState('주일 예배 주보');
  const [sermonTitle, setSermonTitle] = useState('');
  const [preacher, setPreacher] = useState('');
  const [scripture, setScripture] = useState('');
  const [weeklyVerse, setWeeklyVerse] = useState('');
  const [order, setOrder] = useState<BulletinOrderItem[]>(DEFAULT_ORDER);
  const [notices, setNotices] = useState<string[]>(['']);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (isNew) return;
    let active = true;
    repository
      .getBulletin(String(id))
      .then((found) => {
        if (!active || !found) return;
        setServiceDate(found.serviceDate);
        setTitle(found.title);
        setSermonTitle(found.sermonTitle);
        setPreacher(found.preacher);
        setScripture(found.scripture);
        setWeeklyVerse(found.weeklyVerse);
        setOrder(found.order.length > 0 ? found.order : DEFAULT_ORDER);
        setNotices(found.notices.length > 0 ? found.notices : ['']);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '불러오지 못했습니다.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, isNew]);

  const updateOrder = (index: number, patch: Partial<BulletinOrderItem>) =>
    setOrder((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  const save = async () => {
    if (!sermonTitle.trim()) {
      setError('설교 제목을 입력해 주세요.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) {
      setError('예배 날짜는 YYYY-MM-DD 형식으로 입력해 주세요.');
      return;
    }

    setSaving(true);
    setError(undefined);
    try {
      const input = {
        serviceDate,
        title: title.trim() || '주일 예배 주보',
        sermonTitle: sermonTitle.trim(),
        preacher: preacher.trim(),
        scripture: scripture.trim(),
        weeklyVerse: weeklyVerse.trim(),
        // 비어 있는 줄은 저장하지 않습니다.
        order: order.filter((line) => line.title.trim() || line.detail.trim()),
        notices: notices.map((n) => n.trim()).filter(Boolean),
      };
      if (isNew) {
        await repository.createBulletin(input);
      } else {
        await repository.updateBulletin(String(id), input);
      }
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
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
      <Stack.Screen options={{ title: isNew ? '주보 등록' : '주보 수정' }} />

      <View style={styles.form}>
        <Field
          label="예배 날짜"
          value={serviceDate}
          onChangeText={setServiceDate}
          placeholder="YYYY-MM-DD"
          hint="주일 날짜를 입력하세요. 가장 최근 날짜의 주보가 홈에 표시됩니다."
        />
        <Field label="주보 제목" value={title} onChangeText={setTitle} placeholder="주일 예배 주보" />
        <Field label="설교 제목" value={sermonTitle} onChangeText={setSermonTitle} placeholder="예) 흔들리지 않는 기초" />
        <Field label="설교자" value={preacher} onChangeText={setPreacher} placeholder="예) 공진수 담임목사" />
        <Field label="본문" value={scripture} onChangeText={setScripture} placeholder="예) 마태복음 7:24-27" />
        <Field
          label="이 주의 말씀"
          value={weeklyVerse}
          onChangeText={setWeeklyVerse}
          placeholder="주보 상단에 실을 말씀을 적어 주세요."
          multiline
        />
      </View>

      <View>
        <ThemedText type="heading" style={styles.sectionTitle}>
          예배 순서
        </ThemedText>
        <Card>
          {order.map((line, index) => (
            <View key={index} style={styles.orderRow}>
              <View style={styles.orderFields}>
                <Field
                  label={`${index + 1}. 순서`}
                  value={line.title}
                  onChangeText={(text) => updateOrder(index, { title: text })}
                  placeholder="예) 성경봉독"
                />
                <Field
                  label="내용"
                  value={line.detail}
                  onChangeText={(text) => updateOrder(index, { detail: text })}
                  placeholder="예) 마태복음 7:24-27 / 인도자"
                />
              </View>
              <Pressable
                onPress={() => setOrder((current) => current.filter((_, i) => i !== index))}
                hitSlop={8}
                style={styles.removeButton}>
                <Ionicons name="close-circle-outline" size={20} color={theme.danger} />
              </Pressable>
            </View>
          ))}
          <Button
            label="순서 추가"
            icon="add"
            variant="ghost"
            onPress={() => setOrder((current) => [...current, { title: '', detail: '' }])}
          />
        </Card>
      </View>

      <View>
        <ThemedText type="heading" style={styles.sectionTitle}>
          광고
        </ThemedText>
        <Card>
          {notices.map((notice, index) => (
            <View key={index} style={styles.orderRow}>
              <View style={styles.orderFields}>
                <Field
                  label={`광고 ${index + 1}`}
                  value={notice}
                  onChangeText={(text) =>
                    setNotices((current) => current.map((n, i) => (i === index ? text : n)))
                  }
                  placeholder="예) 다음 주일은 성찬식이 있습니다."
                  multiline
                />
              </View>
              <Pressable
                onPress={() => setNotices((current) => current.filter((_, i) => i !== index))}
                hitSlop={8}
                style={styles.removeButton}>
                <Ionicons name="close-circle-outline" size={20} color={theme.danger} />
              </Pressable>
            </View>
          ))}
          <Button
            label="광고 추가"
            icon="add"
            variant="ghost"
            onPress={() => setNotices((current) => [...current, ''])}
          />
        </Card>
      </View>

      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}

      <Button
        label={isNew ? '주보 등록하기' : '수정 완료'}
        icon="save-outline"
        loading={saving}
        onPress={() => void save()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three },
  sectionTitle: { marginBottom: Spacing.two },
  orderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  orderFields: { flex: 1, gap: Spacing.two, paddingBottom: Spacing.two },
  removeButton: { paddingTop: Spacing.five },
});

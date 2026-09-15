import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button, Field, LoadingState, Toggle } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { repository, SUBCATEGORIES, type AnnouncementCategory } from '@/lib/data';

const CATEGORIES: AnnouncementCategory[] = ['공지', '행사', '소식'];

/** 분류가 모호하지 않도록 각 카테고리의 뜻을 안내합니다. */
const CATEGORY_HINTS: Record<AnnouncementCategory, string> = {
  공지: '교회 전체에 알리는 일반 공지 (주차·시설·행정 등)',
  행사: '교회에서 여는 행사 — 아래에서 세부 항목을 골라주세요',
  소식: '성도들의 일상 소식 — 아래에서 세부 항목을 골라주세요',
};

export default function AnnouncementEditorScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = String(id) === 'new';

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<AnnouncementCategory>('공지');
  const [subCategory, setSubCategory] = useState<string>('');
  const [author, setAuthor] = useState(user?.name ?? '');
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (isNew) return;
    let active = true;
    repository
      .getAnnouncement(String(id))
      .then((found) => {
        if (!active || !found) return;
        setTitle(found.title);
        setBody(found.body);
        setCategory(found.category);
        setSubCategory(found.subCategory ?? '');
        setAuthor(found.author);
        setPinned(found.pinned);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '불러오지 못했습니다.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, isNew]);

  const save = async () => {
    if (!title.trim() || !body.trim()) {
      setError('제목과 내용을 입력해 주세요.');
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      const input = {
        title: title.trim(),
        body: body.trim(),
        category,
        subCategory: SUBCATEGORIES[category].length > 0 ? subCategory || undefined : undefined,
        author: author.trim() || '교회 사무실',
        pinned,
      };
      if (isNew) {
        await repository.createAnnouncement(input);
      } else {
        await repository.updateAnnouncement(String(id), input);
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
      setDeleting(true);
      setError(undefined);
      try {
        await repository.deleteAnnouncement(String(id));
        router.back();
      } catch (e) {
        setError(e instanceof Error ? e.message : '삭제하지 못했습니다.');
        setDeleting(false);
      }
    };
    const message = '이 공지를 삭제할까요? 되돌릴 수 없습니다.';
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (window.confirm(message)) void remove();
      return;
    }
    Alert.alert('삭제', message, [
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
      <Stack.Screen options={{ title: isNew ? '공지 작성' : '공지 수정' }} />
      <View style={styles.form}>
        <View style={styles.field}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            분류
          </ThemedText>
          <View style={styles.chipRow}>
            {CATEGORIES.map((option) => {
              const active = option === category;
              return (
                <Pressable
                  key={option}
                  onPress={() => {
                    setCategory(option);
                    // 새 카테고리에 없는 세부 분류는 초기화합니다.
                    setSubCategory((prev) => (SUBCATEGORIES[option].includes(prev) ? prev : ''));
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? theme.primary : theme.backgroundElement,
                      borderColor: active ? theme.primary : theme.border,
                    },
                  ]}>
                  <ThemedText
                    type="caption"
                    style={{ color: active ? theme.onPrimary : theme.textSecondary, fontWeight: '700' }}>
                    {option}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          <ThemedText type="caption" themeColor="textMuted" style={styles.hint}>
            {CATEGORY_HINTS[category]}
          </ThemedText>
        </View>

        {SUBCATEGORIES[category].length > 0 ? (
          <View style={styles.field}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              세부 분류 {category === '소식' ? '(장례·결혼 등)' : '(행사 종류)'}
            </ThemedText>
            <View style={styles.chipWrap}>
              {SUBCATEGORIES[category].map((option) => {
                const active = option === subCategory;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setSubCategory(active ? '' : option)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? theme.accent : theme.backgroundElement,
                        borderColor: active ? theme.accent : theme.border,
                      },
                    ]}>
                    <ThemedText
                      type="caption"
                      style={{ color: active ? theme.onPrimary : theme.textSecondary, fontWeight: '700' }}>
                      {option}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <Field label="제목" value={title} onChangeText={setTitle} placeholder="공지 제목" />
        <Field label="내용" value={body} onChangeText={setBody} placeholder="공지 내용" multiline />
        <Field label="작성 부서" value={author} onChangeText={setAuthor} placeholder="예) 교육부" />
        <Toggle label="중요 소식으로 표시 (제목 옆에 표시가 붙습니다)" value={pinned} onChange={setPinned} />

        {error ? (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        ) : null}

        <Button label={isNew ? '등록하기' : '수정 완료'} icon="save-outline" loading={saving} onPress={() => void save()} />

        {!isNew ? (
          <Button
            label="공지 삭제"
            icon="trash-outline"
            variant="danger"
            loading={deleting}
            onPress={confirmDelete}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three },
  field: { gap: Spacing.one },
  chipRow: { flexDirection: 'row', gap: Spacing.two },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  hint: { marginTop: 2 },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

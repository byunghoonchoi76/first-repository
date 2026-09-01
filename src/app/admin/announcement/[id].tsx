import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button, Field, LoadingState, Toggle } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { repository, type AnnouncementCategory } from '@/lib/data';

const CATEGORIES: AnnouncementCategory[] = ['공지', '행사', '소식'];

export default function AnnouncementEditorScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = String(id) === 'new';

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<AnnouncementCategory>('공지');
  const [author, setAuthor] = useState(user?.name ?? '');
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
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
                  onPress={() => setCategory(option)}
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
        </View>

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
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three },
  field: { gap: Spacing.one },
  chipRow: { flexDirection: 'row', gap: Spacing.two },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

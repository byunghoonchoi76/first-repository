import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button, Field, LoadingState } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { repository, type SermonMedia } from '@/lib/data';
import { toDateKey } from '@/lib/format';
import { fetchYouTubeTitle, parseYouTubeUrl } from '@/lib/youtube';

/** 자주 쓰는 설교 시리즈. 탭 한 번으로 채워지고, 직접 입력도 됩니다. */
const SERIES_PRESETS = [
  '주일예배',
  '주일 4부예배',
  '주일 찬양예배',
  '수요부흥예배',
  '금요성령집회',
  '새벽예배',
];

const MEDIA_OPTIONS: { value: SermonMedia; label: string }[] = [
  { value: 'video', label: '영상' },
  { value: 'audio', label: '음성' },
];

export default function SermonEditorScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = String(id) === 'new';

  const [title, setTitle] = useState('');
  const [preacher, setPreacher] = useState('');
  const [scripture, setScripture] = useState('');
  const [date, setDate] = useState(toDateKey());
  const [series, setSeries] = useState('');
  const [mediaType, setMediaType] = useState<SermonMedia>('video');
  const [mediaUrl, setMediaUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [fetchingTitle, setFetchingTitle] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (isNew) return;
    let active = true;
    repository
      .getSermon(String(id))
      .then((found) => {
        if (!active || !found) return;
        setTitle(found.title);
        setPreacher(found.preacher);
        setScripture(found.scripture);
        setDate(found.date);
        setSeries(found.series ?? '');
        setMediaType(found.mediaType);
        setMediaUrl(found.mediaUrl);
        setSummary(found.summary);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : '불러오지 못했습니다.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, isNew]);

  const loadTitleFromYouTube = async () => {
    setFetchingTitle(true);
    setNotice(undefined);
    try {
      const fetched = await fetchYouTubeTitle(mediaUrl);
      if (fetched) {
        setTitle(fetched);
        setNotice('유튜브 제목을 가져왔습니다.');
      } else {
        setNotice('제목을 가져오지 못했습니다. 직접 입력해 주세요.');
      }
    } finally {
      setFetchingTitle(false);
    }
  };

  const save = async () => {
    if (!mediaUrl.trim()) {
      setError('재생 주소를 입력해 주세요.');
      return;
    }
    if (!title.trim() && !parseYouTubeUrl(mediaUrl)) {
      setError('제목을 입력해 주세요. (유튜브 주소면 제목을 자동으로 가져옵니다)');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('설교 날짜는 YYYY-MM-DD 형식으로 입력해 주세요.');
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      const input = {
        // 비워 두면 앱이 유튜브에서 실제 제목을 가져옵니다.
        title: title.trim(),
        preacher: preacher.trim() || '담임목사',
        scripture: scripture.trim(),
        date,
        series: series.trim() || undefined,
        mediaType,
        mediaUrl: mediaUrl.trim(),
        summary: summary.trim(),
      };
      if (isNew) {
        await repository.createSermon(input);
      } else {
        await repository.updateSermon(String(id), input);
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
      <Stack.Screen options={{ title: isNew ? '설교 등록' : '설교 수정' }} />
      <View style={styles.form}>
        <View style={styles.field}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            형식
          </ThemedText>
          <View style={styles.chipRow}>
            {MEDIA_OPTIONS.map((option) => {
              const active = option.value === mediaType;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setMediaType(option.value)}
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
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Field
          label="설교 제목"
          value={title}
          onChangeText={setTitle}
          placeholder="비워 두면 유튜브 제목을 그대로 사용합니다"
        />
        <Field label="설교자" value={preacher} onChangeText={setPreacher} placeholder="예) 담임목사" />
        <Field label="본문" value={scripture} onChangeText={setScripture} placeholder="예) 마태복음 7:24-27" />
        <Field label="설교 날짜" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" hint="예) 2026-08-30" />
        <View style={styles.field}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            시리즈 (선택)
          </ThemedText>
          <View style={styles.chipWrap}>
            {SERIES_PRESETS.map((preset) => {
              const active = preset === series.trim();
              return (
                <Pressable
                  key={preset}
                  onPress={() => setSeries(active ? '' : preset)}
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
                    {preset}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
          <Field label="" value={series} onChangeText={setSeries} placeholder="직접 입력도 됩니다 (예) 산상수훈" />
        </View>
        <Field
          label="재생 주소"
          value={mediaUrl}
          onChangeText={(text) => {
            setMediaUrl(text);
            setNotice(undefined);
          }}
          placeholder="예) https://www.youtube.com/watch?v=..."
          autoCapitalize="none"
          hint="유튜브 영상·쇼츠·라이브 주소를 넣으면 앱 화면 안에서 바로 재생됩니다. 오디오 파일 주소도 됩니다."
        />
        {parseYouTubeUrl(mediaUrl) ? (
          <Button
            label="유튜브에서 제목 가져오기"
            icon="download-outline"
            variant="ghost"
            loading={fetchingTitle}
            onPress={() => void loadTitleFromYouTube()}
          />
        ) : null}
        {notice ? (
          <ThemedText type="caption" themeColor="textSecondary">
            {notice}
          </ThemedText>
        ) : null}
        <Field label="요약 (선택)" value={summary} onChangeText={setSummary} multiline placeholder="설교 요약" />

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
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

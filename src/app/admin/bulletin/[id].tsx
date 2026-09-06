import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Field, LoadingState } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dataMode, repository, type BulletinOrderItem } from '@/lib/data';
import { toDateKey } from '@/lib/format';
import { deleteBulletinImage, uploadBulletinImage } from '@/lib/storage';

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
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  // 같은 날짜의 주보가 이미 있을 때, 한 번 더 누르면 그대로 등록되도록 하는 표시
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false);
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
        setImageUrls(found.imageUrls);
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

  /** 갤러리에서 주보 사진을 골라 저장소에 올립니다. 여러 장을 한 번에 고를 수 있습니다. */
  const pickAndUpload = async () => {
    setError(undefined);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('사진 접근을 허용해 주셔야 주보를 올릴 수 있습니다.');
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
      // 앱에서는 base64 로 읽어 저장소에 올립니다.
      base64: Platform.OS !== 'web',
    });
    if (picked.canceled) return;

    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const asset of picked.assets) {
        uploaded.push(
          await uploadBulletinImage({
            uri: asset.uri,
            base64: asset.base64,
            mimeType: asset.mimeType,
            fileName: asset.fileName ?? undefined,
          }),
        );
      }
      setImageUrls((current) => [...current, ...uploaded]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '사진을 올리지 못했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = () => {
    const remove = async () => {
      try {
        // 주보에 딸린 사진도 저장소에서 함께 정리합니다.
        await Promise.all(imageUrls.map((url) => deleteBulletinImage(url)));
        await repository.deleteBulletin(String(id));
        router.back();
      } catch (e) {
        setError(e instanceof Error ? e.message : '삭제하지 못했습니다.');
      }
    };

    const message = '이 주보와 올린 사진이 모두 사라집니다. 삭제할까요?';
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (window.confirm(message)) void remove();
      return;
    }
    Alert.alert('주보 삭제', message, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => void remove() },
    ]);
  };

  const removeImage = (url: string) => {
    setImageUrls((current) => current.filter((item) => item !== url));
    // 저장소에 올려 둔 파일이면 함께 정리합니다.
    void deleteBulletinImage(url);
  };

  const save = async () => {
    if (!sermonTitle.trim()) {
      setError('설교 제목을 입력해 주세요.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) {
      setError('예배 날짜는 YYYY-MM-DD 형식으로 입력해 주세요.');
      return;
    }

    // 실수로 같은 날짜의 주보를 두 번 등록하는 일을 막아 줍니다.
    if (isNew && !duplicateConfirmed) {
      const existing = await repository.listBulletins();
      if (existing.some((b) => b.serviceDate === serviceDate)) {
        setDuplicateConfirmed(true);
        setError(
          `${serviceDate} 주보가 이미 있습니다. 기존 주보를 수정하시는 편이 좋습니다. 그래도 새로 만들려면 한 번 더 눌러 주세요.`,
        );
        return;
      }
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
        imageUrls,
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
          주보 원본 (선택)
        </ThemedText>
        <Card>
          {imageUrls.length > 0 ? (
            <View style={styles.thumbRow}>
              {imageUrls.map((url, index) => (
                <View key={url} style={styles.thumbBox}>
                  <Image source={{ uri: url }} style={styles.thumb} resizeMode="cover" />
                  <Pressable onPress={() => removeImage(url)} hitSlop={8} style={styles.thumbRemove}>
                    <Ionicons name="close-circle" size={22} color={theme.danger} />
                  </Pressable>
                  <ThemedText type="caption" themeColor="textMuted" style={styles.thumbLabel}>
                    {index + 1}번째
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : (
            <ThemedText type="small" themeColor="textMuted">
              아직 올린 주보 사진이 없습니다.
            </ThemedText>
          )}

          <Button
            label={uploading ? '올리는 중…' : '사진 올리기'}
            icon="image-outline"
            loading={uploading}
            onPress={() => void pickAndUpload()}
          />

          <ThemedText type="caption" themeColor="textMuted">
            {dataMode === 'supabase'
              ? '앞면·뒷면 순서대로 고르시면 됩니다. 여러 장을 한 번에 고를 수 있습니다. 올린 사진은 안전하게 보관되어 사라지지 않습니다.'
              : '샘플 모드에서는 사진이 이 기기에만 남습니다. Supabase 를 연결하면 모든 성도에게 보입니다.'}
          </ThemedText>
        </Card>
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
        label={isNew ? (duplicateConfirmed ? '그대로 등록하기' : '주보 등록하기') : '수정 완료'}
        icon="save-outline"
        loading={saving}
        onPress={() => void save()}
      />

      {!isNew ? (
        <Button label="주보 삭제" icon="trash-outline" variant="danger" onPress={confirmDelete} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.three },
  thumbRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  thumbBox: { width: 96 },
  thumb: { width: 96, height: 72, borderRadius: Radius.small },
  thumbRemove: { position: 'absolute', top: -6, right: -6 },
  thumbLabel: { textAlign: 'center', marginTop: 2 },
  sectionTitle: { marginBottom: Spacing.two },
  orderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  orderFields: { flex: 1, gap: Spacing.two, paddingBottom: Spacing.two },
  removeButton: { paddingTop: Spacing.five },
});

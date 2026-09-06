import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Alert, Image, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, ErrorState, LoadingState, SectionHeader } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { repository, useAsyncData } from '@/lib/data';
import { formatFullDate } from '@/lib/format';

export default function BulletinScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const bulletin = useAsyncData(() => repository.getBulletin(String(id)), [id]);

  if (bulletin.loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (bulletin.error || !bulletin.data) {
    return (
      <Screen>
        <ErrorState message={bulletin.error ?? '주보를 찾을 수 없습니다.'} onRetry={bulletin.reload} />
      </Screen>
    );
  }

  const item = bulletin.data;

  const openOriginal = async (url: string) => {
    try {
      // 웹에서는 새 탭, 앱에서는 앱 안의 브라우저로 엽니다. (확대해서 보기 좋습니다)
      if (Platform.OS === 'web') {
        await Linking.openURL(url);
      } else {
        await WebBrowser.openBrowserAsync(url);
      }
    } catch {
      Alert.alert('주보를 열 수 없습니다', '주소를 다시 확인해 주세요.');
    }
  };

  const confirmDelete = () => {
    const remove = async () => {
      await repository.deleteBulletin(item.id);
      router.back();
    };
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (window.confirm('이 주보를 삭제할까요?')) void remove();
      return;
    }
    Alert.alert('주보 삭제', '이 주보를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => void remove() },
    ]);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Badge label={formatFullDate(item.serviceDate)} tone="accent" />
        <ThemedText type="title">{item.sermonTitle}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {item.scripture} · {item.preacher}
        </ThemedText>
      </View>

      {item.imageUrls.length > 0 ? (
        <View style={styles.sheets}>
          <SectionHeader title="주보 원본" />
          {item.imageUrls.map((url, index) =>
            url.toLowerCase().endsWith('.pdf') ? (
              <Button
                key={url}
                label={`주보 PDF 열기${item.imageUrls.length > 1 ? ` (${index + 1})` : ''}`}
                icon="document-text-outline"
                onPress={() => void openOriginal(url)}
              />
            ) : (
              <BulletinSheet key={url} url={url} onPress={() => void openOriginal(url)} />
            ),
          )}
          <ThemedText type="caption" themeColor="textMuted">
            이미지를 누르면 원본 크기로 볼 수 있습니다.
          </ThemedText>
        </View>
      ) : null}

      {item.weeklyVerse ? (
        <Card style={{ borderLeftWidth: 3, borderLeftColor: theme.accent }}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            이 주의 말씀
          </ThemedText>
          <ThemedText type="body">{item.weeklyVerse}</ThemedText>
        </Card>
      ) : null}

      <View>
        <SectionHeader title="예배 순서" />
        <Card>
          {item.order.map((line, index) => (
            <View key={`${line.title}-${index}`}>
              {index > 0 ? <View style={[styles.divider, { backgroundColor: theme.border }]} /> : null}
              <View style={styles.orderRow}>
                <ThemedText type="smallBold" style={styles.orderTitle}>
                  {line.title}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
                  {line.detail}
                </ThemedText>
              </View>
            </View>
          ))}
        </Card>
      </View>

      {item.notices.length > 0 ? (
        <View>
          <SectionHeader title="광고" />
          <Card>
            {item.notices.map((notice, index) => (
              <View key={index} style={styles.noticeRow}>
                <ThemedText type="small" themeColor="primary">
                  ·
                </ThemedText>
                <ThemedText type="small" style={styles.flex}>
                  {notice}
                </ThemedText>
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      {isAdmin ? (
        <View style={styles.adminRow}>
          <Button
            label="수정"
            icon="create-outline"
            variant="secondary"
            style={styles.flex}
            onPress={() => router.push(`/admin/bulletin/${item.id}`)}
          />
          <Button label="삭제" icon="trash-outline" variant="danger" style={styles.flex} onPress={confirmDelete} />
        </View>
      ) : null}
    </Screen>
  );
}

/** 주보 이미지 한 장. 원본 비율을 읽어 와 잘리지 않게 보여 줍니다. */
function BulletinSheet({ url, onPress }: { url: string; onPress: () => void }) {
  const theme = useTheme();
  const [ratio, setRatio] = useState(1.4);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);
    Image.getSize(
      url,
      (width, height) => {
        if (active && height > 0) setRatio(width / height);
      },
      () => {
        // 크기를 못 읽으면(주소가 깨졌거나 삭제됨) 안내 화면을 보여 줍니다.
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, [url]);

  if (failed) {
    return (
      <View style={[styles.sheetFallback, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <Ionicons name="image-outline" size={26} color={theme.textMuted} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.fallbackText}>
          원본 이미지를 불러올 수 없습니다.
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted" style={styles.fallbackText}>
          홈페이지에서 사진이 삭제·이동되었을 수 있어요. 관리자 화면에서 주보 사진을 다시 올려 주세요.
        </ThemedText>
      </View>
    );
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? styles.pressed : undefined)}>
      <Image
        source={{ uri: url }}
        style={[styles.sheetImage, { aspectRatio: ratio, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
        resizeMode="contain"
        accessibilityLabel="주보 원본 이미지"
        onError={() => setFailed(true)}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: Spacing.two },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.two },
  orderRow: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  orderTitle: { width: 92 },
  noticeRow: { flexDirection: 'row', gap: Spacing.two },
  adminRow: { flexDirection: 'row', gap: Spacing.two },
  sheets: { gap: Spacing.two },
  sheetImage: { width: '100%', borderRadius: Radius.small, borderWidth: StyleSheet.hairlineWidth },
  sheetFallback: {
    width: '100%',
    borderRadius: Radius.small,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    gap: Spacing.one,
  },
  fallbackText: { textAlign: 'center' },
  pressed: { opacity: 0.8 },
});

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, SectionHeader } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { dataMode, repository, useAsyncData } from '@/lib/data';
import type { PrayerRequest } from '@/lib/data/types';
import { formatRelative } from '@/lib/format';

/** 개인 기도제목(나만 보는 목록) + 기도 요청(성도들과 함께 기도). */
export default function PersonalPrayerScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const needsSignIn = dataMode === 'supabase' && !user;

  const myRequests = useAsyncData(
    () => (needsSignIn ? Promise.resolve([]) : repository.listMyPrayerRequests()),
    [needsSignIn],
  );
  const sharedRequests = useAsyncData(
    () => (needsSignIn ? Promise.resolve([]) : repository.listSharedPrayerRequests()),
    [needsSignIn],
  );
  const reloadMy = myRequests.reload;
  const reloadShared = sharedRequests.reload;
  const reloadAll = useCallback(() => {
    reloadMy();
    reloadShared();
  }, [reloadMy, reloadShared]);

  useFocusEffect(reloadAll);

  const toggleAnswered = async (id: string, answered: boolean) => {
    myRequests.setData((cur) => cur?.map((item) => (item.id === id ? { ...item, answered } : item)));
    sharedRequests.setData((cur) => cur?.map((item) => (item.id === id ? { ...item, answered } : item)));
    try {
      await repository.markPrayerAnswered(id, answered);
    } catch {
      /* 화면은 유지하고 다음 새로고침에서 맞춥니다. */
    }
  };

  const setShared = async (id: string, shared: boolean) => {
    myRequests.setData((cur) => cur?.map((item) => (item.id === id ? { ...item, shared } : item)));
    try {
      await repository.setPrayerShared(id, shared);
    } finally {
      reloadShared();
    }
  };

  const pray = async (id: string) => {
    sharedRequests.setData((cur) =>
      cur?.map((item) => (item.id === id ? { ...item, prayCount: item.prayCount + 1 } : item)),
    );
    try {
      const updated = await repository.prayForRequest(id);
      sharedRequests.setData((cur) => cur?.map((item) => (item.id === id ? updated : item)));
    } catch {
      reloadShared();
    }
  };

  const myItems = myRequests.data ?? [];
  const sharedItems = sharedRequests.data ?? [];

  return (
    <Screen onRefresh={reloadAll}>
      {/* 개인 기도제목 (나만 보는 목록 + 기도 요청으로 올리기) */}
      <View>
        <SectionHeader title="개인 기도제목" />
        {needsSignIn ? (
          <Card>
            <EmptyState icon="lock-closed-outline" message="로그인하면 나만의 기도제목을 적을 수 있어요." />
            <Button label="로그인하기" icon="log-in-outline" onPress={() => router.push('/sign-in')} />
          </Card>
        ) : (
          <>
            <Button
              label="기도제목 추가"
              icon="add"
              variant="secondary"
              onPress={() => router.push('/prayer/new')}
            />
            {myRequests.loading && !myRequests.data ? (
              <LoadingState />
            ) : myRequests.error ? (
              <ErrorState message={myRequests.error} onRetry={myRequests.reload} />
            ) : myItems.length === 0 ? (
              <EmptyState icon="flower-outline" message="나만의 기도제목을 적어 보세요." />
            ) : (
              <View style={styles.stack}>
                {myItems.map((item) => (
                  <MyPrayerCard
                    key={item.id}
                    item={item}
                    onToggleAnswered={() => toggleAnswered(item.id, !item.answered)}
                    onShare={() => setShared(item.id, true)}
                    onUnshare={() => setShared(item.id, false)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </View>

      {/* 기도 요청 (성도들과 함께 기도) */}
      <View>
        <SectionHeader title="기도 요청" />
        {needsSignIn ? (
          <Card>
            <EmptyState icon="lock-closed-outline" message="기도 요청은 로그인한 성도만 볼 수 있습니다." />
          </Card>
        ) : sharedRequests.loading && !sharedRequests.data ? (
          <LoadingState />
        ) : sharedRequests.error ? (
          <ErrorState message={sharedRequests.error} onRetry={sharedRequests.reload} />
        ) : sharedItems.length === 0 ? (
          <EmptyState icon="hand-right-outline" message="아직 올라온 기도 요청이 없습니다." />
        ) : (
          <View style={styles.stack}>
            {sharedItems.map((item) => (
              <Card key={item.id}>
                <View style={styles.rowBetween}>
                  {item.answered ? <Badge label="응답됨" tone="success" /> : <Badge label="기도 중" tone="primary" />}
                  <ThemedText type="caption" themeColor="textMuted">
                    {formatRelative(item.createdAt)}
                  </ThemedText>
                </View>
                <ThemedText type="smallBold">{item.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.body}
                </ThemedText>
                <View style={styles.rowBetween}>
                  <ThemedText type="caption" themeColor="textMuted">
                    {item.author}
                  </ThemedText>
                  <Pressable
                    onPress={() => void pray(item.id)}
                    style={({ pressed }) => [
                      styles.prayButton,
                      { borderColor: theme.border, opacity: pressed ? 0.6 : 1 },
                    ]}>
                    <Ionicons name="hand-right-outline" size={14} color={theme.primary} />
                    <ThemedText type="caption" style={{ color: theme.primary, fontWeight: '700' }}>
                      함께 기도 {item.prayCount}
                    </ThemedText>
                  </Pressable>
                </View>

                {isAdmin || (user && item.authorId && item.authorId === user.id) ? (
                  <Button
                    label={item.answered ? '다시 기도 중으로' : '기도 응답되었어요'}
                    icon={item.answered ? 'refresh-outline' : 'checkmark-circle-outline'}
                    variant="ghost"
                    onPress={() => void toggleAnswered(item.id, !item.answered)}
                  />
                ) : null}
              </Card>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

/** 개인 기도제목 카드 — 나만 보이며, 원하면 '기도 요청'으로 공개할 수 있습니다. */
function MyPrayerCard({
  item,
  onToggleAnswered,
  onShare,
  onUnshare,
}: {
  item: PrayerRequest;
  onToggleAnswered: () => void;
  onShare: () => void;
  onUnshare: () => void;
}) {
  return (
    <Card>
      <View style={styles.rowBetween}>
        {item.shared ? (
          <Badge label="기도 요청 중" tone="primary" />
        ) : (
          <Badge label="나만 보기" tone="textSecondary" />
        )}
        <ThemedText type="caption" themeColor="textMuted">
          {formatRelative(item.createdAt)}
        </ThemedText>
      </View>
      <ThemedText type="smallBold">{item.title}</ThemedText>
      {item.body ? (
        <ThemedText type="small" themeColor="textSecondary">
          {item.body}
        </ThemedText>
      ) : null}
      {item.shared ? (
        <ThemedText type="caption" themeColor="textMuted">
          함께 기도 {item.prayCount}번 · 성도들이 함께 기도하고 있어요
        </ThemedText>
      ) : null}
      {item.shared ? (
        <Button label="기도 요청 내리기" icon="eye-off-outline" variant="ghost" onPress={onUnshare} />
      ) : (
        <Button label="기도 요청으로 올리기" icon="megaphone-outline" variant="secondary" onPress={onShare} />
      )}
      <Button
        label={item.answered ? '다시 기도 중으로' : '기도 응답되었어요'}
        icon={item.answered ? 'refresh-outline' : 'checkmark-circle-outline'}
        variant="ghost"
        onPress={onToggleAnswered}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  stack: { gap: Spacing.two },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  prayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

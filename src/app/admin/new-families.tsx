import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Card, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { repository, useAsyncData } from '@/lib/data';
import { formatRelative } from '@/lib/format';

/** 관리자용 새가족 등록 명단 (조회·삭제). */
export default function NewFamiliesAdminScreen() {
  const theme = useTheme();
  const families = useAsyncData(() => repository.listNewFamilies());
  const { reload, setData } = families;

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const remove = (id: string) => {
    const doDelete = async () => {
      setData((current) => current?.filter((f) => f.id !== id));
      try {
        await repository.deleteNewFamily(id);
      } catch {
        reload();
      }
    };
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (window.confirm('이 등록을 삭제할까요?')) void doDelete();
      return;
    }
    Alert.alert('삭제', '이 등록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => void doDelete() },
    ]);
  };

  if (families.loading && !families.data) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (families.error) {
    return (
      <Screen>
        <ErrorState message={families.error} onRetry={reload} />
      </Screen>
    );
  }

  const items = families.data ?? [];

  return (
    <Screen onRefresh={reload}>
      <ThemedText type="small" themeColor="textSecondary">
        새가족 등록 신청 {items.length}건
      </ThemedText>

      {items.length === 0 ? (
        <EmptyState icon="person-add-outline" message="아직 등록 신청이 없습니다." />
      ) : (
        <View style={styles.stack}>
          {items.map((f) => (
            <Card key={f.id}>
              <View style={styles.headRow}>
                <View style={styles.flex}>
                  <View style={styles.nameRow}>
                    <ThemedText type="heading">{f.name}</ThemedText>
                    {f.gender ? (
                      <ThemedText type="caption" themeColor="textSecondary">
                        {f.gender}
                      </ThemedText>
                    ) : null}
                  </View>
                  <ThemedText type="caption" themeColor="textMuted">
                    {formatRelative(f.createdAt)}
                  </ThemedText>
                </View>
                <Pressable onPress={() => remove(f.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={theme.danger} />
                </Pressable>
              </View>

              <Pressable
                style={styles.infoRow}
                onPress={() => f.phone && Linking.openURL(`tel:${f.phone}`)}>
                <Ionicons name="call-outline" size={15} color={theme.primary} />
                <ThemedText type="small" style={{ color: theme.primary }}>
                  {f.phone}
                </ThemedText>
              </Pressable>
              {f.address ? <Info icon="location-outline" text={f.address} /> : null}
              {f.referrer ? <Info icon="person-outline" text={f.referrer} /> : null}
              {f.note ? <Info icon="chatbubble-outline" text={f.note} /> : null}
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

function Info({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={15} color={theme.textMuted} />
      <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: Spacing.two },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.two },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});

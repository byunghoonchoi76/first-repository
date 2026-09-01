import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { repository, useAsyncData } from '@/lib/data';
import { formatFullDate } from '@/lib/format';

/** 지난 주보까지 모두 볼 수 있는 목록. 관리자는 여기서 등록·정리도 합니다. */
export default function BulletinListScreen() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const bulletins = useAsyncData(() => repository.listBulletins());
  const { reload } = bulletins;

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  if (bulletins.loading && !bulletins.data) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (bulletins.error) {
    return (
      <Screen>
        <ErrorState message={bulletins.error} onRetry={reload} />
      </Screen>
    );
  }

  const items = bulletins.data ?? [];

  return (
    <Screen onRefresh={reload}>
      {isAdmin ? (
        <Button
          label="새 주보 등록"
          icon="add-circle-outline"
          variant="secondary"
          onPress={() => router.push('/admin/bulletin/new')}
        />
      ) : null}

      {items.length === 0 ? (
        <EmptyState icon="book-outline" message="등록된 주보가 없습니다." />
      ) : (
        <View style={styles.stack}>
          {items.map((item, index) => (
            <Card key={item.id} onPress={() => router.push(`/bulletin/${item.id}`)}>
              <View style={styles.metaRow}>
                <Badge label={formatFullDate(item.serviceDate)} tone={index === 0 ? 'accent' : 'textSecondary'} />
                {item.imageUrls.length > 0 ? <Badge label="주보 원본" tone="success" /> : null}
              </View>
              <ThemedText type="heading" numberOfLines={1}>
                {item.sermonTitle}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {[item.scripture, item.preacher].filter(Boolean).join(' · ')}
              </ThemedText>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: Spacing.two },
  metaRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
});

import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Card, ErrorState, ListRow, LoadingState, SectionHeader } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { repository, useAsyncData, type ServiceCategory } from '@/lib/data';

const GROUPS: { category: ServiceCategory; title: string; caption: string }[] = [
  { category: '예배', title: '예배', caption: '온 성도가 함께 드리는 예배입니다.' },
  { category: '교육부서', title: '교육부서', caption: '연령별로 드리는 부서 예배입니다.' },
];

export default function ServicesScreen() {
  const theme = useTheme();
  const profile = useAsyncData(() => repository.getChurchProfile());

  if (profile.loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (profile.error || !profile.data) {
    return (
      <Screen>
        <ErrorState message={profile.error ?? '예배 시간을 불러오지 못했습니다.'} onRetry={profile.reload} />
      </Screen>
    );
  }

  const times = profile.data.serviceTimes;

  return (
    <Screen onRefresh={profile.reload}>
      {GROUPS.map((group) => {
        const items = times.filter((service) => service.category === group.category);
        if (items.length === 0) return null;

        return (
          <View key={group.category}>
            <SectionHeader title={group.title} />
            <ThemedText type="caption" themeColor="textSecondary" style={styles.caption}>
              {group.caption}
            </ThemedText>
            <Card>
              {items.map((service, index) => (
                <View key={service.id}>
                  {index > 0 ? <View style={[styles.divider, { backgroundColor: theme.border }]} /> : null}
                  <ListRow
                    icon="time-outline"
                    title={service.name}
                    subtitle={`${service.schedule} · ${service.place}${service.note ? ` · ${service.note}` : ''}`}
                  />
                </View>
              ))}
            </Card>
          </View>
        );
      })}

      <Card>
        <ThemedText type="smallBold" themeColor="textSecondary">
          찾아오시는 길
        </ThemedText>
        <ThemedText type="body">{profile.data.address}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          문의 {profile.data.phone}
        </ThemedText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  caption: { marginTop: -Spacing.one, marginBottom: Spacing.two },
  divider: { height: StyleSheet.hairlineWidth },
});

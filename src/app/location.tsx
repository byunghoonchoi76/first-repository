import { Ionicons } from '@expo/vector-icons';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, LoadingState } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { repository, useAsyncData } from '@/lib/data';

/** 교회 장소 — 주소, 지도, 연락처. */
export default function LocationScreen() {
  const theme = useTheme();
  const profile = useAsyncData(() => repository.getChurchProfile());

  if (profile.loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  const church = profile.data;
  const address = church?.address ?? '';

  const openMap = () => {
    const query = encodeURIComponent(address);
    void Linking.openURL(
      Platform.select({
        ios: `http://maps.apple.com/?q=${query}`,
        default: `https://maps.google.com/?q=${query}`,
      }),
    );
  };

  return (
    <Screen>
      <Card style={styles.card}>
        <ThemedText type="heading">{church?.name}</ThemedText>
        {address ? (
          <View style={styles.row}>
            <Ionicons name="location-outline" size={18} color={theme.primary} />
            <ThemedText type="body" style={styles.flex}>
              {address}
            </ThemedText>
          </View>
        ) : null}
        {address ? <Button label="지도에서 보기" icon="map-outline" onPress={openMap} /> : null}
      </Card>

      {church?.phone ? (
        <Card>
          <View style={styles.row}>
            <Ionicons name="call-outline" size={18} color={theme.primary} />
            <ThemedText type="body" style={styles.flex}>
              {church.phone}
            </ThemedText>
          </View>
          <Button
            label="전화 걸기"
            icon="call-outline"
            variant="secondary"
            onPress={() => void Linking.openURL(`tel:${church.phone}`)}
          />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});

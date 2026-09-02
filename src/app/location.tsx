import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { MapEmbed } from '@/components/map-embed';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, LoadingState } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { repository, useAsyncData } from '@/lib/data';
import { mapLinks } from '@/lib/maps';

/** 교회 주소 — 지도·내비게이션·연락처. */
export default function LocationScreen() {
  const theme = useTheme();
  const profile = useAsyncData(() => repository.getChurchProfile());
  const [copied, setCopied] = useState(false);

  if (profile.loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  const church = profile.data;
  const address = church?.address ?? '';
  // 지도 검색이 정확하도록 교회 이름을 주소와 함께 보냅니다.
  const query = [church?.name, address].filter(Boolean).join(' ');
  const links = mapLinks(query);

  const copyAddress = async () => {
    await Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Screen>
      <Card style={styles.card}>
        <View style={styles.row}>
          <Ionicons name="location" size={18} color={theme.primary} />
          <View style={styles.flex}>
            <ThemedText type="heading">{church?.name}</ThemedText>
            {address ? (
              <ThemedText type="small" themeColor="textSecondary">
                {address}
              </ThemedText>
            ) : null}
          </View>
        </View>
        {address ? (
          <Button
            label={copied ? '주소가 복사되었습니다 ✓' : '주소 복사'}
            icon={copied ? 'checkmark' : 'copy-outline'}
            variant="ghost"
            onPress={() => void copyAddress()}
          />
        ) : null}
      </Card>

      {address ? <MapEmbed query={query} height={220} /> : null}

      {address ? (
        <View>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.navTitle}>
            길찾기 · 내비게이션
          </ThemedText>
          <View style={styles.navRow}>
            <MapButton label="카카오맵" color="#FEE500" textColor="#3A1D1D" onPress={() => void Linking.openURL(links.kakao)} />
            <MapButton label="네이버지도" color="#03C75A" textColor="#FFFFFF" onPress={() => void Linking.openURL(links.naver)} />
            <MapButton label="구글지도" color="#FFFFFF" textColor="#1A73E8" bordered onPress={() => void Linking.openURL(links.google)} />
          </View>
          <ThemedText type="caption" themeColor="textMuted" style={styles.hint}>
            지도에서 &lsquo;길찾기&rsquo;를 누르면 현재 위치에서 교회까지 내비게이션이 시작됩니다.
          </ThemedText>
        </View>
      ) : null}

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

function MapButton({
  label,
  color,
  textColor,
  bordered,
  onPress,
}: {
  label: string;
  color: string;
  textColor: string;
  bordered?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.mapButton,
        { backgroundColor: color, borderColor: bordered ? theme.border : color, opacity: pressed ? 0.8 : 1 },
      ]}>
      <ThemedText type="smallBold" style={{ color: textColor }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  navTitle: { marginBottom: Spacing.two },
  navRow: { flexDirection: 'row', gap: Spacing.two },
  mapButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radius.small,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { marginTop: Spacing.two, lineHeight: 18 },
});

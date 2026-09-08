import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, LoadingState } from '@/components/ui';
import { Gradients, Radius, Spacing } from '@/constants/theme';
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
  // 네이버 플레이스 링크가 있으면 정확한 위치로 바로 연결합니다.
  const placeUrl = church?.mapUrl?.trim();

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

      {/* 인앱 브라우저(카카오톡 등)에서는 지도 임베드가 차단되므로, 탭하면 지도 앱/사이트가 열리는 카드로 안내합니다. */}
      {address ? (
        <MapPreviewCard
          name={church?.name}
          address={address}
          onPress={() => void Linking.openURL(placeUrl || links.naver)}
        />
      ) : null}

      {address ? (
        <View>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.navTitle}>
            길찾기 · 내비게이션
          </ThemedText>
          <View style={styles.navRow}>
            <MapButton label="카카오맵" color="#FEE500" textColor="#3A1D1D" onPress={() => void Linking.openURL(links.kakao)} />
            <MapButton
              label="네이버지도"
              color="#03C75A"
              textColor="#FFFFFF"
              onPress={() => void Linking.openURL(placeUrl || links.naver)}
            />
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

/** 지도 미리보기 카드 — 탭하면 지도 앱/사이트가 열립니다. 인앱 브라우저에서도 안정적으로 동작합니다. */
function MapPreviewCard({ name, address, onPress }: { name?: string; address: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.mapCard, { opacity: pressed ? 0.9 : 1 }]}>
      <LinearGradient colors={Gradients.navy} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.mapCardBg}>
        <View style={styles.mapPin}>
          <Ionicons name="location" size={30} color="#FFFFFF" />
        </View>
        <View style={styles.mapCardText}>
          <ThemedText type="smallBold" style={styles.mapCardName}>
            {name ?? '교회 위치'}
          </ThemedText>
          <ThemedText type="caption" style={styles.mapCardAddr} numberOfLines={2}>
            {address}
          </ThemedText>
        </View>
        <View style={styles.mapCardCta}>
          <Ionicons name="map" size={16} color="#FFFFFF" />
          <ThemedText type="caption" style={styles.mapCardName}>
            지도 열기
          </ThemedText>
        </View>
      </LinearGradient>
    </Pressable>
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
  mapCard: { borderRadius: Radius.medium, overflow: 'hidden' },
  mapCardBg: { minHeight: 132, padding: Spacing.four, flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  mapPin: {
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCardText: { flex: 1, gap: 2 },
  mapCardName: { color: '#FFFFFF' },
  mapCardAddr: { color: 'rgba(255,255,255,0.85)', lineHeight: 18 },
  mapCardCta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
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

import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { HeroBanner } from '@/components/hero-banner';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui';
import { ChurchVision } from '@/constants/church';
import { LocalPhotos } from '@/constants/photos';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function VisionScreen() {
  const theme = useTheme();
  // 첫 항목은 펼친 상태로 시작합니다.
  const [open, setOpen] = useState<Set<number>>(new Set([0]));

  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <Screen>
      <Stack.Screen options={{ title: '교회 비전' }} />

      <HeroBanner imageSource={LocalPhotos.vision} base="navy" aspectRatio={537 / 500} style={styles.hero}>
        <ThemedText type="caption" style={styles.heroTag}>
          우리의 비전
        </ThemedText>
        <ThemedText type="subtitle" style={styles.heroTitle}>
          {ChurchVision.headline}
        </ThemedText>
        <ThemedText type="small" style={styles.heroVerse}>
          {ChurchVision.subtitle}
        </ThemedText>
      </HeroBanner>

      <View style={styles.list}>
        {ChurchVision.communities.map((c, i) => {
          const expanded = open.has(i);
          return (
            <Card key={c.no} elevated>
              <Pressable onPress={() => toggle(i)} style={styles.header}>
                <View style={[styles.noBadge, { backgroundColor: theme.primary }]}>
                  <ThemedText type="caption" style={{ color: theme.onPrimary, fontWeight: '800' }}>
                    {c.no}
                  </ThemedText>
                </View>
                <ThemedText type="smallBold" style={styles.flex}>
                  {c.title}
                </ThemedText>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textMuted} />
              </Pressable>
              {expanded ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.desc}>
                  {c.desc}
                </ThemedText>
              ) : null}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: {},
  heroTag: { color: '#fff', fontWeight: '700', letterSpacing: 0.5 },
  heroTitle: { color: '#fff', marginTop: Spacing.one },
  heroVerse: { color: 'rgba(255,255,255,0.92)', marginTop: Spacing.one, fontWeight: '600' },
  list: { gap: Spacing.two },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  noBadge: { width: 32, height: 32, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' },
  desc: { marginTop: Spacing.three, lineHeight: 22 },
});

import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { HeroBanner } from '@/components/hero-banner';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui';
import { ChurchVision } from '@/constants/church';
import { Photos } from '@/constants/photos';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function VisionScreen() {
  const theme = useTheme();

  return (
    <Screen>
      <Stack.Screen options={{ title: '교회 비전' }} />

      <HeroBanner imageUrl={Photos.heroWorship} base="navy" height={200} style={styles.hero}>
        <ThemedText type="caption" style={styles.heroTag}>
          우리의 비전
        </ThemedText>
        <ThemedText type="subtitle" style={styles.heroTitle} numberOfLines={3}>
          {ChurchVision.headline}
        </ThemedText>
        <ThemedText type="small" style={styles.heroVerse}>
          {ChurchVision.verse}
        </ThemedText>
      </HeroBanner>

      <Card elevated>
        <ThemedText type="body">{ChurchVision.intro}</ThemedText>
      </Card>

      <View style={styles.points}>
        {ChurchVision.points.map((p) => (
          <Card key={p.title} elevated>
            <View style={styles.pointRow}>
              <View style={[styles.pointIcon, { backgroundColor: theme.backgroundSelected }]}>
                <Ionicons name={p.icon as React.ComponentProps<typeof Ionicons>['name']} size={20} color={theme.primary} />
              </View>
              <View style={styles.flex}>
                <ThemedText type="smallBold">{p.title}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {p.desc}
                </ThemedText>
              </View>
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: {},
  heroTag: { color: '#fff', fontWeight: '700', letterSpacing: 0.5 },
  heroTitle: { color: '#fff', marginTop: Spacing.one, lineHeight: 28 },
  heroVerse: { color: 'rgba(255,255,255,0.92)', marginTop: Spacing.one, fontWeight: '600' },
  points: { gap: Spacing.two },
  pointRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  pointIcon: { width: 40, height: 40, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center' },
});

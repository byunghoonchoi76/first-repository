import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChurchInfo } from '@/constants/church';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { dataMode } from '@/lib/data';

/** 앱을 처음 열었을 때 보여 주는 시작 화면 — 교회 표어 위에 로그인·회원가입·손님 진입. */
export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { chooseGuest } = useAuth();
  const isSupabase = dataMode === 'supabase';

  const startAsGuest = async () => {
    await chooseGuest();
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.root}>
      {/* 표어 이미지의 붉은 배경을 닮은 그라데이션 (가운데가 밝고 위·아래가 짙게) */}
      <LinearGradient
        colors={['#5E1410', '#A6362A', '#B23C2E', '#7A1C14', '#4E100C']}
        locations={[0, 0.32, 0.5, 0.78, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.content, { paddingTop: insets.top + Spacing.six, paddingBottom: insets.bottom + Spacing.four }]}>
        <View style={styles.sloganBlock}>
          <Text style={styles.slogan}>두려워하지 말라,</Text>
          <Text style={styles.slogan}>강하고</Text>
          <Text style={styles.slogan}>담대하라</Text>
          <Text style={styles.verse}>{ChurchInfo.sloganVerse}</Text>
          <View style={styles.rule} />
          <Text style={styles.english}>Do not be afraid,</Text>
          <Text style={styles.english}>Be strong and courageous</Text>
        </View>

        <View style={styles.actions}>
          {isSupabase ? (
            <>
              <SolidButton label="로그인" onPress={() => router.push('/sign-in')} />
              <OutlineButton
                label="회원가입"
                onPress={() => router.push({ pathname: '/sign-in', params: { mode: 'signUp' } })}
              />
            </>
          ) : (
            <SolidButton label="이름으로 시작하기" onPress={() => router.push('/sign-in')} />
          )}
          <Pressable onPress={() => void startAsGuest()} hitSlop={8} style={styles.guestBtn}>
            <Text style={styles.guestText}>손님으로 둘러보기</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function SolidButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.solidBtn, pressed && styles.pressed]}>
      <Text style={styles.solidText}>{label}</Text>
    </Pressable>
  );
}

function OutlineButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.outlineBtn, pressed && styles.pressed]}>
      <Text style={styles.outlineText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#5E1410' },
  content: { flex: 1, paddingHorizontal: Spacing.four, justifyContent: 'space-between' },
  sloganBlock: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  slogan: {
    color: '#FFFFFF',
    fontFamily: 'Nanum Brush Script',
    fontSize: 58,
    lineHeight: 64,
    letterSpacing: 1,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  verse: { color: 'rgba(255,255,255,0.9)', fontSize: 15, marginTop: Spacing.three, letterSpacing: 1 },
  rule: {
    width: 44,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 2,
    marginTop: Spacing.four,
    marginBottom: Spacing.three,
  },
  english: {
    color: 'rgba(255,255,255,0.82)',
    fontFamily: 'EB Garamond, serif',
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: 2,
    textAlign: 'center',
    fontVariant: ['small-caps'],
  },
  actions: { gap: Spacing.two },
  solidBtn: {
    minHeight: 52,
    borderRadius: Radius.medium,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  solidText: { color: '#8A1F16', fontSize: 16, fontWeight: '800' },
  outlineBtn: {
    minHeight: 52,
    borderRadius: Radius.medium,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  guestBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  guestText: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '600', textDecorationLine: 'underline' },
  pressed: { opacity: 0.85 },
});

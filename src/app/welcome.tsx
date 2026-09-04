import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { ChurchLogoWhite } from '@/components/church-logo';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui';
import { ChurchInfo } from '@/constants/church';
import { Gradients, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { dataMode } from '@/lib/data';

/** 앱을 처음 열었을 때 보여 주는 시작 화면 — 로그인 · 회원가입 · 손님으로 둘러보기. */
export default function WelcomeScreen() {
  const router = useRouter();
  const { chooseGuest } = useAuth();
  const isSupabase = dataMode === 'supabase';

  const startAsGuest = async () => {
    await chooseGuest();
    router.replace('/(tabs)');
  };

  return (
    <Screen contentStyle={styles.content}>
      <LinearGradient
        colors={Gradients.navy}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}>
        <ChurchLogoWhite width={200} />
        <ThemedText type="title" style={styles.slogan}>
          {ChurchInfo.slogan}
        </ThemedText>
        <ThemedText type="small" style={styles.verse}>
          {ChurchInfo.sloganVerse}
        </ThemedText>
      </LinearGradient>

      <View style={styles.intro}>
        <ThemedText type="heading" style={styles.introTitle}>
          환영합니다
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.introText}>
          주보 · 설교 · 기도 · 소식을 한곳에서 만나 보세요. 로그인하면 나의 기도시간이 계정에 저장되어
          기기를 바꿔도 이어집니다.
        </ThemedText>
      </View>

      <View style={styles.actions}>
        {isSupabase ? (
          <>
            <Button label="로그인" icon="log-in-outline" onPress={() => router.push('/sign-in')} />
            <Button
              label="회원가입"
              icon="person-add-outline"
              variant="secondary"
              onPress={() => router.push({ pathname: '/sign-in', params: { mode: 'signUp' } })}
            />
          </>
        ) : (
          <Button label="이름으로 시작하기" icon="log-in-outline" onPress={() => router.push('/sign-in')} />
        )}

        <Button label="손님으로 둘러보기" variant="ghost" onPress={() => void startAsGuest()} />

        <View style={styles.guestNote}>
          <Ionicons name="information-circle-outline" size={15} color="#9C9384" />
          <ThemedText type="caption" themeColor="textMuted" style={styles.flex}>
            가입하지 않아도 앱의 기본 기능을 자유롭게 이용할 수 있어요. 로그인은 나중에 &lsquo;더보기&rsquo;에서
            언제든 할 수 있습니다.
          </ThemedText>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: Spacing.four },
  hero: {
    borderRadius: Radius.large,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  slogan: { color: '#FFFFFF', textAlign: 'center', marginTop: Spacing.two },
  verse: { color: 'rgba(255,255,255,0.82)' },
  intro: { gap: Spacing.two, alignItems: 'center' },
  introTitle: { textAlign: 'center' },
  introText: { textAlign: 'center', lineHeight: 21 },
  actions: { gap: Spacing.two },
  guestNote: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
});

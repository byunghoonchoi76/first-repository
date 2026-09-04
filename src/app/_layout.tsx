import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/lib/auth';

SplashScreen.preventAutoHideAsync();

/**
 * 로그인/손님 선택 여부에 따라 시작 화면(welcome)과 앱을 오가게 합니다.
 * - 로그인했거나 '손님으로 둘러보기'를 고른 사용자는 바로 앱으로.
 * - 아직 아무것도 고르지 않은 새 사용자는 시작 화면으로.
 */
function useStartupGate() {
  const { user, loading, guestAck } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const ready = !loading;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const onWelcome = segments[0] === 'welcome';
    // 아직 로그인/손님을 정하지 않아도 로그인·회원가입 화면은 열 수 있어야 합니다.
    const onAuthFlow = onWelcome || segments[0] === 'sign-in';
    const decided = !!user || guestAck === true;
    if (!decided && !onAuthFlow) {
      router.replace('/welcome');
    } else if (decided && onWelcome) {
      router.replace('/(tabs)');
    }
  }, [ready, user, guestAck, segments, router]);
}

export default function RootLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const palette = isDark ? Colors.dark : Colors.light;

  const navigationTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          primary: palette.primary,
          background: palette.background,
          card: palette.backgroundElement,
          text: palette.text,
          border: palette.border,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: palette.primary,
          background: palette.background,
          card: palette.backgroundElement,
          text: palette.text,
          border: palette.border,
        },
      };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider value={navigationTheme}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <RootNavigator />
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  useStartupGate();
  return (
    <Stack screenOptions={{ headerBackTitle: '뒤로' }}>
      <Stack.Screen name="welcome" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="services" options={{ title: '예배 안내' }} />
      <Stack.Screen name="staff" options={{ title: '섬기는 사람들' }} />
      <Stack.Screen name="location" options={{ title: '교회 주소' }} />
      <Stack.Screen name="giving" options={{ title: '헌금 안내' }} />
      <Stack.Screen name="new-family" options={{ title: '새가족 등록' }} />
      <Stack.Screen name="admin/new-families" options={{ title: '새가족 명단' }} />
      <Stack.Screen name="bulletins" options={{ title: '주보' }} />
      <Stack.Screen name="bulletin/[id]" options={{ title: '주보' }} />
      <Stack.Screen name="news/[id]" options={{ title: '공지사항' }} />
      <Stack.Screen name="sermons/[id]" options={{ title: '설교' }} />
      <Stack.Screen name="groups/[id]" options={{ title: '소그룹' }} />
      <Stack.Screen name="prayer/new" options={{ title: '기도제목 나누기', presentation: 'modal' }} />
      <Stack.Screen name="settings" options={{ title: '더보기' }} />
      <Stack.Screen name="sign-in" options={{ title: '로그인', presentation: 'modal' }} />
      <Stack.Screen name="admin/index" options={{ title: '관리자' }} />
      <Stack.Screen name="admin/bulletin/[id]" options={{ title: '주보 등록' }} />
      <Stack.Screen name="admin/group/[id]" options={{ title: '소그룹 등록' }} />
      <Stack.Screen name="admin/staff/[id]" options={{ title: '섬기는 분 등록' }} />
      <Stack.Screen name="admin/communal/[id]" options={{ title: '공동 기도제목' }} />
      <Stack.Screen name="admin/announcement/[id]" options={{ title: '공지 작성' }} />
      <Stack.Screen name="admin/sermon/[id]" options={{ title: '설교 등록' }} />
    </Stack>
  );
}

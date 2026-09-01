import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/lib/auth';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const palette = isDark ? Colors.dark : Colors.light;

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

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
          <Stack screenOptions={{ headerBackTitle: '뒤로' }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="services" options={{ title: '예배 안내' }} />
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
            <Stack.Screen name="admin/announcement/[id]" options={{ title: '공지 작성' }} />
            <Stack.Screen name="admin/sermon/[id]" options={{ title: '설교 등록' }} />
          </Stack>
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

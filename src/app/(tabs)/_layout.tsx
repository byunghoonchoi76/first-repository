import { Ionicons } from '@expo/vector-icons';
import { Link, Tabs } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, type ColorValue } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** 한글 받침까지 온전히 보이도록 탭 라벨을 직접 그립니다. */
function tabLabel(label: string) {
  return ({ color }: { color: ColorValue }) => (
    <Text style={[styles.tabLabel, { color }]}>{label}</Text>
  );
}

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: [
          { backgroundColor: theme.backgroundElement, borderTopColor: theme.border },
          // 웹에서는 안전영역 여백이 없어 라벨이 잘리므로 높이를 직접 잡아 줍니다.
          Platform.OS === 'web' ? { height: 70, paddingTop: 8, paddingBottom: 12 } : null,
        ],
        // 기본 라벨은 한 줄 높이가 글자 크기에 맞춰 잘려 한글 받침이 사라지므로
        // 탭마다 직접 만든 라벨을 사용합니다.
        tabBarLabelStyle: { fontSize: 11, lineHeight: 18 },
        headerStyle: { backgroundColor: theme.backgroundElement },
        headerTitleStyle: { color: theme.text, fontSize: 17, fontWeight: '700' },
        headerRight: () => (
          <Link href="/settings" asChild>
            <Pressable hitSlop={8} style={styles.headerButton}>
              <Ionicons name="ellipsis-horizontal-circle-outline" size={22} color={theme.text} />
            </Pressable>
          </Link>
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarLabel: tabLabel('홈'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: '소식',
          tabBarLabel: tabLabel('소식'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="megaphone-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sermons"
        options={{
          title: '설교',
          tabBarLabel: tabLabel('설교'),
          tabBarIcon: ({ color, size }) => <Ionicons name="play-circle-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="prayer"
        options={{
          title: '기도',
          tabBarLabel: tabLabel('기도'),
          tabBarIcon: ({ color, size }) => <Ionicons name="flower-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: '소그룹',
          tabBarLabel: tabLabel('소그룹'),
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerButton: { marginRight: Spacing.three },
  tabLabel: { fontSize: 11, lineHeight: 16, textAlign: 'center' },
});

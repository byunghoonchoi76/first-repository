import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button, Card, EmptyState, ErrorState, LoadingState } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { dataMode, repository, type GroupMessage, type SmallGroup } from '@/lib/data';
import { formatTime } from '@/lib/format';

const POLL_INTERVAL_MS = 5000;

export default function GroupRoomScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = String(id);
  const { user } = useAuth();
  const needsSignIn = dataMode === 'supabase' && !user;

  const [group, setGroup] = useState<SmallGroup | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const listRef = useRef<FlatList<GroupMessage>>(null);

  const load = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setLoading(true);
      try {
        const [foundGroup, list] = await Promise.all([
          repository.getGroup(groupId),
          repository.listGroupMessages(groupId),
        ]);
        setGroup(foundGroup);
        setMessages(list);
        setError(undefined);
      } catch (e) {
        setError(e instanceof Error ? e.message : '대화를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [groupId],
  );

  useEffect(() => {
    if (needsSignIn) {
      setLoading(false);
      return;
    }
    void load(true);
    // 새 메시지를 주기적으로 확인합니다.
    const timer = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load, needsSignIn]);

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    try {
      const created = await repository.sendGroupMessage(groupId, user?.name ?? '성도', body);
      setMessages((current) => [...current, created]);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (e) {
      setError(e instanceof Error ? e.message : '메시지를 보내지 못했습니다.');
    }
  };

  // Supabase 를 쓰는 경우 소그룹 대화는 로그인한 성도만 볼 수 있습니다.
  if (needsSignIn) {
    return (
      <View style={[styles.fill, styles.gate, { backgroundColor: theme.background }]}>
        <Card>
          <EmptyState icon="lock-closed-outline" message="소그룹 대화는 로그인 후 이용할 수 있습니다." />
          <Button label="로그인하기" icon="log-in-outline" onPress={() => router.push('/sign-in')} />
        </Card>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.fill, { backgroundColor: theme.background }]}>
        <LoadingState />
      </View>
    );
  }

  if (error && messages.length === 0) {
    return (
      <View style={[styles.fill, { backgroundColor: theme.background }]}>
        <ErrorState message={error} onRetry={() => void load(true)} />
      </View>
    );
  }

  const myName = user?.name ?? '성도';

  return (
    <KeyboardAvoidingView
      style={[styles.fill, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      <Stack.Screen options={{ title: group?.name ?? '소그룹' }} />

      {group ? (
        <View style={[styles.roomHeader, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <ThemedText type="caption" themeColor="textSecondary">
            {group.meetingInfo} · {group.leader}
          </ThemedText>
        </View>
      ) : null}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <ThemedText type="small" themeColor="textMuted" style={styles.emptyText}>
            첫 인사를 남겨 보세요.
          </ThemedText>
        }
        renderItem={({ item }) => {
          const mine = item.author === myName;
          return (
            <View style={[styles.messageRow, mine && styles.messageRowMine]}>
              <View style={styles.bubbleGroup}>
                {!mine ? (
                  <ThemedText type="caption" themeColor="textSecondary">
                    {item.author}
                  </ThemedText>
                ) : null}
                <View
                  style={[
                    styles.bubble,
                    {
                      backgroundColor: mine ? theme.primary : theme.backgroundElement,
                      borderColor: mine ? theme.primary : theme.border,
                    },
                  ]}>
                  <ThemedText type="small" style={{ color: mine ? theme.onPrimary : theme.text }}>
                    {item.body}
                  </ThemedText>
                </View>
                <ThemedText type="caption" themeColor="textMuted" style={mine ? styles.timeMine : undefined}>
                  {formatTime(item.createdAt)}
                </ThemedText>
              </View>
            </View>
          );
        }}
      />

      <View
        style={[
          styles.composer,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
            paddingBottom: Math.max(insets.bottom, Spacing.two),
          },
        ]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="메시지를 입력하세요"
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
          multiline
          onSubmitEditing={() => void send()}
        />
        <Pressable
          onPress={() => void send()}
          style={({ pressed }) => [
            styles.sendButton,
            { backgroundColor: theme.primary, opacity: pressed || !draft.trim() ? 0.6 : 1 },
          ]}>
          <Ionicons name="arrow-up" size={18} color={theme.onPrimary} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  gate: { justifyContent: 'center', padding: Spacing.three },
  roomHeader: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  listContent: {
    padding: Spacing.three,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  emptyText: { textAlign: 'center', paddingVertical: Spacing.five },
  messageRow: { flexDirection: 'row' },
  messageRowMine: { justifyContent: 'flex-end' },
  bubbleGroup: { maxWidth: '80%', gap: 2 },
  bubble: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
  },
  timeMine: { textAlign: 'right' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 42,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  sendButton: { width: 42, height: 42, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
});

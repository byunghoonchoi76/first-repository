import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
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
import { dataMode, repository, type GroupMessage, type GroupRead, type MyGroupMembership, type SmallGroup } from '@/lib/data';
import { formatTime } from '@/lib/format';
import { uploadChatImage } from '@/lib/storage';

const POLL_INTERVAL_MS = 5000;

export default function GroupRoomScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = String(id);
  const { user, isAdmin } = useAuth();
  const needsSignIn = dataMode === 'supabase' && !user;

  const [group, setGroup] = useState<SmallGroup | null>(null);
  const [membership, setMembership] = useState<MyGroupMembership | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [reads, setReads] = useState<GroupRead[]>([]);
  const [draft, setDraft] = useState('');
  // 보내기 전 첨부한 사진(업로드된 공개 주소)
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const listRef = useRef<FlatList<GroupMessage>>(null);
  // 최신 메시지가 바뀔 때만 '읽음'을 서버에 표시하기 위한 기준
  const lastMarkedRef = useRef<string | null>(null);

  const canParticipate = membership?.isMember ?? false;
  // 초대되지 않은 사람(관리자 제외)은 입장할 수 없습니다.
  const blocked = dataMode === 'supabase' && !!membership && !membership.isMember && !isAdmin;

  const load = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setLoading(true);
      try {
        const mine = await repository.getMyGroupMembership(groupId);
        setMembership(mine);
        if (dataMode === 'supabase' && !mine.isMember && !isAdmin) {
          // 멤버가 아니면 대화를 불러오지 않습니다(서버에서도 막혀 있습니다).
          const foundGroup = await repository.getGroup(groupId);
          setGroup(foundGroup);
          setError(undefined);
          return;
        }
        const [foundGroup, list, readList] = await Promise.all([
          repository.getGroup(groupId),
          repository.listGroupMessages(groupId),
          repository.listGroupReads(groupId).catch(() => [] as GroupRead[]),
        ]);
        setGroup(foundGroup);
        setMessages(list);
        // 내 읽음 위치는 항상 최신으로 반영(다른 멤버 메시지의 '안 읽음'이 바로 줄어들도록)
        const uid = user?.id;
        setReads(
          uid
            ? [...readList.filter((r) => r.userId !== uid), { userId: uid, lastReadAt: new Date().toISOString() }]
            : readList,
        );
        setError(undefined);
        // 최신 메시지가 바뀌었을 때만 서버에 '여기까지 읽음' 표시
        const latestId = list.length ? list[list.length - 1].id : null;
        if (latestId && lastMarkedRef.current !== latestId) {
          lastMarkedRef.current = latestId;
          void repository.markGroupRead(groupId).catch(() => {});
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '대화를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    },
    [groupId, isAdmin, user?.id],
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

  const attachImage = async () => {
    if (pendingImage || attaching) return;
    setError(undefined);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('사진 접근을 허용해 주셔야 사진을 보낼 수 있습니다.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      base64: Platform.OS !== 'web',
    });
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];
    setAttaching(true);
    try {
      const url = await uploadChatImage({
        uri: asset.uri,
        base64: asset.base64,
        mimeType: asset.mimeType,
        fileName: asset.fileName ?? undefined,
      });
      setPendingImage(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : '사진을 올리지 못했습니다.');
    } finally {
      setAttaching(false);
    }
  };

  const send = async () => {
    const body = draft.trim();
    const image = pendingImage;
    if (!body && !image) return;
    setError(undefined);
    setDraft('');
    setPendingImage(null);
    try {
      const created = await repository.sendGroupMessage(groupId, user?.name ?? '성도', body, image ?? undefined);
      setMessages((current) => [...current, created]);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (e) {
      // 전송에 실패하면 작성한 내용·사진을 되돌려 재시도할 수 있게 합니다.
      setDraft((cur) => (cur ? cur : body));
      setPendingImage((cur) => cur ?? image);
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

  // 초대되지 않은 사람은 입장할 수 없습니다.
  if (blocked) {
    return (
      <View style={[styles.fill, styles.gate, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: group?.name ?? '소통방' }} />
        <Card>
          <EmptyState
            icon="lock-closed-outline"
            message="이 소통방은 초대된 분만 입장할 수 있어요. 리더에게 초대를 요청해 주세요."
          />
          <Button label="돌아가기" icon="arrow-back-outline" variant="secondary" onPress={() => router.back()} />
        </Card>
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

  // 카톡식 '안 읽은 사람 수' — 이 방 멤버 중 글쓴이를 뺀 사람 가운데, 아직 이 글 시각까지 읽지 않은 수
  const memberCount = group?.memberCount ?? 0;
  const unreadCountFor = (m: GroupMessage): number => {
    const others = memberCount - 1; // 글쓴이 본인 제외
    if (others <= 0) return 0;
    const created = new Date(m.createdAt).getTime();
    let readers = 0;
    for (const r of reads) {
      if (m.authorId && r.userId === m.authorId) continue; // 글쓴이는 셈에서 제외
      if (new Date(r.lastReadAt).getTime() >= created) readers += 1;
    }
    return Math.max(0, others - readers);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.fill, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      <Stack.Screen
        options={{
          title: group?.name ?? '소통방',
          headerRight: () => (
            <View style={styles.headerRight}>
              <Pressable
                onPress={() => router.push(`/group-members/${groupId}`)}
                hitSlop={8}
                accessibilityLabel="멤버·알림">
                <Ionicons name="people-outline" size={22} color={theme.text} />
              </Pressable>
              {isAdmin ? (
                <Pressable
                  onPress={() => router.push(`/admin/group/${groupId}`)}
                  hitSlop={8}
                  accessibilityLabel="소통방 수정">
                  <Ionicons name="create-outline" size={20} color={theme.text} />
                </Pressable>
              ) : null}
            </View>
          ),
        }}
      />

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
          const mine = item.authorId && user?.id ? item.authorId === user.id : item.author === myName;
          const unread = unreadCountFor(item);
          return (
            <View style={[styles.messageRow, mine && styles.messageRowMine]}>
              <View style={styles.bubbleGroup}>
                {!mine ? (
                  <ThemedText type="caption" themeColor="textSecondary">
                    {item.author}
                  </ThemedText>
                ) : null}
                {item.imageUrl ? <ChatImage url={item.imageUrl} mine={mine} /> : null}
                {item.body ? (
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
                ) : null}
                <View style={[styles.metaRow, mine && styles.metaRowMine]}>
                  {unread > 0 ? (
                    <ThemedText type="caption" style={[styles.unread, { color: theme.accent }]}>
                      {unread}
                    </ThemedText>
                  ) : null}
                  <ThemedText type="caption" themeColor="textMuted">
                    {formatTime(item.createdAt)}
                  </ThemedText>
                </View>
              </View>
            </View>
          );
        }}
      />

      {canParticipate ? (
        <View
          style={[
            styles.composerWrap,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
              paddingBottom: Math.max(insets.bottom, Spacing.two),
            },
          ]}>
          {error ? (
            <ThemedText type="caption" themeColor="danger" style={styles.composerError}>
              {error}
            </ThemedText>
          ) : attaching ? (
            <ThemedText type="caption" themeColor="textMuted" style={styles.composerError}>
              사진 올리는 중…
            </ThemedText>
          ) : null}
          {pendingImage ? (
            <View style={styles.pendingRow}>
              <Image source={{ uri: pendingImage }} style={styles.pendingThumb} contentFit="cover" />
              <Pressable onPress={() => setPendingImage(null)} style={[styles.pendingX, { backgroundColor: theme.background }]}>
                <Ionicons name="close" size={14} color={theme.text} />
              </Pressable>
            </View>
          ) : null}
          <View style={styles.composerRow}>
            <Pressable
              onPress={() => void attachImage()}
              disabled={attaching || !!pendingImage}
              hitSlop={6}
              style={styles.attachBtn}
              accessibilityLabel="사진 첨부">
              <Ionicons
                name={attaching ? 'hourglass-outline' : 'image-outline'}
                size={24}
                color={pendingImage ? theme.textMuted : theme.primary}
              />
            </Pressable>
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
                { backgroundColor: theme.primary, opacity: pressed || (!draft.trim() && !pendingImage) ? 0.6 : 1 },
              ]}>
              <Ionicons name="arrow-up" size={18} color={theme.onPrimary} />
            </Pressable>
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.readonly,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border, paddingBottom: Math.max(insets.bottom, Spacing.two) },
          ]}>
          <ThemedText type="caption" themeColor="textMuted" style={styles.readonlyText}>
            관리자로 보는 중입니다. 대화에 참여하려면 이 소통방의 멤버로 참여하세요.
          </ThemedText>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

/** 말풍선 안 사진 — 사진 비율 그대로, 최대 220px 폭으로 보여 줍니다. */
function ChatImage({ url, mine }: { url: string; mine: boolean }) {
  const [ratio, setRatio] = useState(1);
  return (
    <Image
      source={{ uri: url }}
      style={[styles.msgImage, { aspectRatio: ratio, alignSelf: mine ? 'flex-end' : 'flex-start' }]}
      contentFit="cover"
      transition={120}
      onLoad={(e) => {
        const { width, height } = e.source ?? {};
        if (width && height) setRatio(width / height);
      }}
    />
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
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaRowMine: { justifyContent: 'flex-end' },
  unread: { fontWeight: '700' },
  msgImage: { width: 220, maxWidth: '100%', borderRadius: Radius.medium, backgroundColor: 'rgba(0,0,0,0.05)' },
  composerWrap: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  composerError: { paddingHorizontal: Spacing.one, paddingBottom: Spacing.one },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  attachBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  pendingRow: { position: 'relative', alignSelf: 'flex-start' },
  pendingThumb: { width: 72, height: 72, borderRadius: Radius.medium },
  pendingX: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginRight: Spacing.three },
  readonly: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth },
  readonlyText: { textAlign: 'center' },
});

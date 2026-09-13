import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, EmptyState, ListRow, SectionHeader } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { dataMode, repository, useAsyncData } from '@/lib/data';
import { formatDate, formatRelative } from '@/lib/format';
import { fetchLiveStatusRaw, useLiveOverride, type LiveOverride } from '@/lib/live-status';

export default function AdminHomeScreen() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const bulletins = useAsyncData(() => repository.listBulletins());
  const groups = useAsyncData(() => repository.listGroups());
  const staff = useAsyncData(() => repository.listStaff());
  const announcements = useAsyncData(() => repository.listAnnouncements());
  const sermons = useAsyncData(() => repository.listSermons());
  const memberCount = useAsyncData(() => repository.countMembers());

  const reloadAll = useCallback(() => {
    bulletins.reload();
    groups.reload();
    staff.reload();
    announcements.reload();
    sermons.reload();
    memberCount.reload();
  }, [bulletins, groups, staff, announcements, sermons, memberCount]);

  useFocusEffect(
    useCallback(() => {
      reloadAll();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  if (!isAdmin) {
    return (
      <Screen>
        <EmptyState icon="lock-closed-outline" message="관리자만 볼 수 있는 화면입니다." />
        <Button label="로그인 화면으로" variant="secondary" onPress={() => router.push('/sign-in')} />
      </Screen>
    );
  }

  const stats: { label: string; value: number; icon: React.ComponentProps<typeof Ionicons>['name']; onPress?: () => void }[] = [
    { label: '주보', value: (bulletins.data ?? []).length, icon: 'book-outline' },
    { label: '공지', value: (announcements.data ?? []).length, icon: 'document-text-outline' },
    { label: '소통방', value: (groups.data ?? []).length, icon: 'people-outline' },
    { label: '가입자', value: memberCount.data ?? 0, icon: 'person-add-outline', onPress: () => router.push('/admin/members') },
    { label: '설교', value: (sermons.data ?? []).length, icon: 'play-circle-outline' },
  ];

  return (
    <Screen onRefresh={reloadAll}>
      {dataMode === 'sample' ? (
        <Card>
          <Badge label="샘플 모드" tone="accent" />
          <ThemedText type="small" themeColor="textSecondary">
            지금 작성한 내용은 이 기기에만 저장됩니다. Supabase 를 연결하면 모든 성도에게 함께 보입니다.
          </ThemedText>
        </Card>
      ) : null}

      <DashboardHeader stats={stats} />

      <LiveOverrideCard />

      <View>
        <SectionHeader title="주보" actionLabel="새로 등록" onAction={() => router.push('/admin/bulletin/new')} />
        <ThemedText type="caption" themeColor="textMuted" style={{ marginBottom: 8 }}>
          지난 주보를 모두 보려면 홈 화면의 주보 메뉴를 눌러 주세요.
        </ThemedText>
        <Card>
          {(bulletins.data ?? []).slice(0, 6).map((item) => (
            <ListRow
              key={item.id}
              icon="book-outline"
              title={`${formatDate(item.serviceDate)} · ${item.sermonTitle}`}
              subtitle={`${item.scripture} · ${item.preacher}`}
              onPress={() => router.push(`/admin/bulletin/${item.id}`)}
            />
          ))}
          {(bulletins.data ?? []).length === 0 ? (
            <EmptyState icon="book-outline" message="등록된 주보가 없습니다." />
          ) : null}
        </Card>
      </View>

      <View>
        <SectionHeader
          title="공지사항"
          actionLabel="새로 작성"
          onAction={() => router.push('/admin/announcement/new')}
        />
        <Card>
          {(announcements.data ?? []).slice(0, 8).map((item) => (
            <ListRow
              key={item.id}
              icon={item.pinned ? 'pin' : 'document-text-outline'}
              title={item.title}
              subtitle={`${item.category} · ${item.author} · ${formatRelative(item.publishedAt)}`}
              onPress={() => router.push(`/admin/announcement/${item.id}`)}
            />
          ))}
          {(announcements.data ?? []).length === 0 ? (
            <EmptyState icon="document-text-outline" message="등록된 공지가 없습니다." />
          ) : null}
        </Card>
      </View>

      <View>
        <SectionHeader title="새가족 등록 명단" actionLabel="전체 보기" onAction={() => router.push('/admin/new-families')} />
        <Card>
          <ListRow
            icon="person-add-outline"
            title="새가족 등록 신청 보기"
            subtitle="방문하신 분들이 남긴 등록 신청을 확인합니다"
            onPress={() => router.push('/admin/new-families')}
          />
        </Card>
      </View>

      <View>
        <SectionHeader title="섬기는 사람들" actionLabel="새로 등록" onAction={() => router.push('/admin/staff/new')} />
        <Card>
          {(staff.data ?? []).map((item) => (
            <ListRow
              key={item.id}
              icon="person-outline"
              title={`${item.name} · ${item.role}`}
              subtitle={item.detail || undefined}
              onPress={() => router.push(`/admin/staff/${item.id}`)}
            />
          ))}
          {(staff.data ?? []).length === 0 ? (
            <EmptyState icon="people-outline" message="등록된 정보가 없습니다." />
          ) : null}
        </Card>
      </View>

      <View>
        <SectionHeader title="소통방" actionLabel="새로 등록" onAction={() => router.push('/admin/group/new')} />
        <ThemedText type="caption" themeColor="textMuted" style={{ marginBottom: 8 }}>
          소통방을 만들고 리더를 지정하면, 리더가 멤버를 초대해 비공개로 운영합니다.
        </ThemedText>
        <Card>
          {(groups.data ?? []).map((item) => (
            <ListRow
              key={item.id}
              icon="people-outline"
              title={item.name}
              subtitle={`${item.leader || '리더 미지정'} · 멤버 ${item.memberCount}명`}
              onPress={() => router.push(`/admin/group/${item.id}`)}
            />
          ))}
          {(groups.data ?? []).length === 0 ? (
            <EmptyState icon="people-outline" message="등록된 소통방이 없습니다." />
          ) : null}
        </Card>
      </View>

      <View>
        <SectionHeader title="설교" actionLabel="새로 등록" onAction={() => router.push('/admin/sermon/new')} />
        <Card>
          {(sermons.data ?? []).slice(0, 8).map((item) => (
            <ListRow
              key={item.id}
              icon={item.mediaType === 'video' ? 'videocam-outline' : 'headset-outline'}
              title={item.title}
              subtitle={`${formatDate(item.date)} · ${item.preacher}`}
              onPress={() => router.push(`/admin/sermon/${item.id}`)}
            />
          ))}
          {(sermons.data ?? []).length === 0 ? (
            <EmptyState icon="play-circle-outline" message="등록된 설교가 없습니다." />
          ) : null}
        </Card>
      </View>
    </Screen>
  );
}

/** 관리 현황 요약 — 한눈에 보는 등록 개수 */
function DashboardHeader({
  stats,
}: {
  stats: { label: string; value: number; icon: React.ComponentProps<typeof Ionicons>['name']; onPress?: () => void }[];
}) {
  const theme = useTheme();
  return (
    <View>
      <SectionHeader title="관리 현황" />
      <Card style={styles.statRow}>
        {stats.map((s, i) => (
          <Pressable
            key={s.label}
            onPress={s.onPress}
            disabled={!s.onPress}
            style={({ pressed }) => [styles.statCell, pressed && s.onPress ? { opacity: 0.6 } : null]}>
            {i > 0 ? <View style={[styles.statDivider, { backgroundColor: theme.border }]} /> : null}
            <Ionicons name={s.icon} size={16} color={theme.primary} />
            <ThemedText type="heading">{s.value}</ThemedText>
            <View style={styles.statLabelRow}>
              <ThemedText type="caption" themeColor="textMuted">
                {s.label}
              </ThemedText>
              {s.onPress ? <Ionicons name="chevron-forward" size={11} color={theme.textMuted} /> : null}
            </View>
          </Pressable>
        ))}
      </Card>
    </View>
  );
}

/** 실시간 방송 표시 강제 스위치 (자동 / 강제 켜기 / 강제 끄기) */
const LIVE_OPTIONS: { mode: LiveOverride; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { mode: 'auto', label: '자동', icon: 'sync-outline' },
  { mode: 'on', label: '강제 켜기', icon: 'radio-outline' },
  { mode: 'off', label: '강제 끄기', icon: 'close-circle-outline' },
];

const LIVE_HINTS: Record<LiveOverride, string> = {
  auto: '유튜브 방송을 자동으로 감지해, 실제 방송 중일 때만 LIVE 배지를 켭니다.',
  on: '지금 모든 성도 화면에 LIVE 배지가 켜집니다. 예배가 끝나면 다시 꺼 주세요.',
  off: 'LIVE 배지를 항상 숨깁니다.',
};

/** 진단 응답을 사람이 읽기 쉬운 줄로 요약합니다. */
function summarizeDiag(raw: Record<string, unknown>): string {
  if (typeof raw.error === 'string') return `오류: ${raw.error}`;
  const diag = (raw.diag ?? {}) as Record<string, unknown>;
  const lines = [
    `방송 감지: ${raw.live ? '예 (LIVE)' : '아니오'}`,
    `판정 방식: ${raw.source === 'api' ? '공식 API' : '스크랩'}`,
    `API 키 설정: ${raw.keyed ? '있음' : '없음 ← live-status에 YOUTUBE_API_KEY 필요'}`,
    `스크랩 HTTP: ${diag.scrapeHttp ?? '-'}${diag.scrapeHttp === 200 ? '' : ' (200이 아니면 유튜브가 서버 접근 차단)'}`,
    `스크랩 라이브: ${diag.scrapeLive === undefined ? '-' : diag.scrapeLive ? '예' : '아니오'}`,
    `예배 시간대: ${diag.inWindow ? '예' : '아니오'}`,
  ];
  if (diag.apiChecked) {
    lines.push(`API 라이브: ${diag.apiLive === undefined ? '-' : diag.apiLive ? '예' : '아니오'}`);
    if (diag.apiError) lines.push(`API 오류: ${String(diag.apiError)}`);
  }
  if (typeof raw.note === 'string' && raw.note) lines.push(`메모: ${raw.note}`);
  return lines.join('\n');
}

function LiveOverrideCard() {
  const theme = useTheme();
  const { mode, setMode, loading, saving, error } = useLiveOverride();
  const [diag, setDiag] = useState<string>();
  const [checking, setChecking] = useState(false);

  const runDiag = async () => {
    setChecking(true);
    try {
      setDiag(summarizeDiag(await fetchLiveStatusRaw()));
    } finally {
      setChecking(false);
    }
  };

  return (
    <View>
      <SectionHeader title="실시간 방송 표시" />
      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          홈 화면 ‘실시간 예배’의 LIVE 배지를 어떻게 표시할지 정합니다.
        </ThemedText>
        <View style={styles.liveRow}>
          {LIVE_OPTIONS.map((option) => {
            const active = mode === option.mode;
            return (
              <Pressable
                key={option.mode}
                disabled={loading || saving}
                onPress={() => void setMode(option.mode)}
                style={[
                  styles.liveChip,
                  {
                    backgroundColor: active ? theme.primary : theme.backgroundElement,
                    borderColor: active ? theme.primary : theme.border,
                    opacity: loading || saving ? 0.6 : 1,
                  },
                ]}>
                <Ionicons name={option.icon} size={18} color={active ? theme.onPrimary : theme.textSecondary} />
                <ThemedText type="smallBold" style={{ color: active ? theme.onPrimary : theme.text }}>
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
        <ThemedText type="caption" themeColor="textMuted" style={styles.liveHint}>
          {LIVE_HINTS[mode]}
        </ThemedText>
        {error ? (
          <ThemedText type="caption" themeColor="danger" style={styles.liveHint}>
            {error}
          </ThemedText>
        ) : null}

        <View style={styles.diagBox}>
          <Button
            label="라이브 감지 진단"
            icon="pulse-outline"
            variant="ghost"
            loading={checking}
            onPress={() => void runDiag()}
          />
          {diag ? (
            <View style={[styles.diagOutput, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText type="caption" themeColor="textSecondary" style={styles.diagText}>
                {diag}
              </ThemedText>
            </View>
          ) : (
            <ThemedText type="caption" themeColor="textMuted" style={styles.liveHint}>
              지금 서버가 유튜브 방송을 어떻게 판별하는지 확인합니다. (배지가 안 뜰 때 원인 파악용)
            </ThemedText>
          )}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  statRow: { flexDirection: 'row', alignItems: 'stretch', paddingVertical: Spacing.three },
  statCell: { flex: 1, alignItems: 'center', gap: 2, position: 'relative' },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  statDivider: { position: 'absolute', left: 0, top: '15%', bottom: '15%', width: StyleSheet.hairlineWidth },
  liveRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three },
  liveChip: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
  },
  liveHint: { marginTop: Spacing.two, lineHeight: 17 },
  diagBox: { marginTop: Spacing.three, gap: Spacing.one },
  diagOutput: { padding: Spacing.three, borderRadius: Radius.medium, borderWidth: StyleSheet.hairlineWidth },
  diagText: { lineHeight: 18 },
});

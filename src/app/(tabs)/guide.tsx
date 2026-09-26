import { useRouter } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Card, ListRow, SectionHeader } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { repository, useAsyncData } from '@/lib/data';
import { useTheme } from '@/hooks/use-theme';

/** 교회 안내 — 예배·섬김·오시는 길·함께하기를 한곳에 모은 안내 허브 */
export default function GuideScreen() {
  const router = useRouter();
  const theme = useTheme();
  const profile = useAsyncData(() => repository.getChurchProfile());
  const church = profile.data;

  const Divider = () => <View style={[styles.divider, { backgroundColor: theme.border }]} />;

  return (
    <Screen onRefresh={profile.reload}>
      {/* 교회 소개 */}
      <Card elevated>
        <ThemedText type="title">{church?.name ?? '교회 안내'}</ThemedText>
        {church?.slogan ? (
          <ThemedText type="small" themeColor="textSecondary">
            {church.slogan}
            {church.sloganVerse ? ` (${church.sloganVerse})` : ''}
          </ThemedText>
        ) : null}
        {church?.pastor ? (
          <ThemedText type="caption" themeColor="textMuted">
            {church.pastor}
          </ThemedText>
        ) : null}
      </Card>

      {/* 예배와 섬김 */}
      <View>
        <SectionHeader title="예배와 섬김" accent />
        <Card>
          <ListRow icon="time-outline" title="예배 안내" subtitle="주일예배 · 새벽예배 · 교육부서 시간표" onPress={() => router.push('/services')} />
          <Divider />
          <ListRow icon="people-outline" title="섬기는 사람들" subtitle="교역자와 직분자를 소개합니다" onPress={() => router.push('/staff')} />
          <Divider />
          <ListRow icon="flag-outline" title="교회 비전" subtitle="우리 교회가 나아갈 방향" onPress={() => router.push('/vision')} />
        </Card>
      </View>

      {/* 오시는 길 · 연락 */}
      <View>
        <SectionHeader title="오시는 길 · 연락" accent />
        <Card>
          <ListRow icon="location-outline" title="오시는 길" subtitle={church?.address || '지도 · 내비게이션'} onPress={() => router.push('/location')} />
          {church?.phone ? (
            <>
              <Divider />
              <ListRow icon="call-outline" title="전화" subtitle={church.phone} onPress={() => void Linking.openURL(`tel:${church.phone}`)} />
            </>
          ) : null}
          {church?.email ? (
            <>
              <Divider />
              <ListRow icon="mail-outline" title="이메일" subtitle={church.email} onPress={() => void Linking.openURL(`mailto:${church.email}`)} />
            </>
          ) : null}
        </Card>
      </View>

      {/* 함께하기 */}
      <View>
        <SectionHeader title="함께하기" accent />
        <Card>
          <ListRow icon="card-outline" title="온라인 헌금" subtitle={church?.offeringAccount || '헌금으로 함께 섬겨요'} onPress={() => router.push('/giving')} />
          <Divider />
          <ListRow icon="person-add-outline" title="새가족 등록" subtitle="처음 오신 분을 환영합니다" onPress={() => router.push('/new-family')} />
          {church?.youtubeUrl ? (
            <>
              <Divider />
              <ListRow icon="logo-youtube" title="유튜브 채널" subtitle="예배와 설교 영상 보기" onPress={() => void Linking.openURL(church.youtubeUrl)} />
            </>
          ) : null}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  divider: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.one },
});

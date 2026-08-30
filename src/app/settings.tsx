import { useRouter } from 'expo-router';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, ListRow, SectionHeader } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { dataMode, repository, useAsyncData } from '@/lib/data';
import { resetSampleData } from '@/lib/data/sample-repository';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, isAdmin, signOut } = useAuth();
  const profile = useAsyncData(() => repository.getChurchProfile());

  const church = profile.data;

  return (
    <Screen>
      <Card>
        {user ? (
          <>
            <ThemedText type="heading">{user.name}님</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {user.email ?? (isAdmin ? '관리자 계정' : '성도 계정')}
            </ThemedText>
            {isAdmin ? <Badge label="관리자" tone="accent" /> : null}
            <Button label="로그아웃" variant="ghost" icon="log-out-outline" onPress={() => void signOut()} />
          </>
        ) : (
          <>
            <ThemedText type="heading">로그인이 필요합니다</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              로그인하면 이름으로 기도제목을 나누고 소그룹 대화에 참여할 수 있습니다.
            </ThemedText>
            <Button label="로그인" icon="log-in-outline" onPress={() => router.push('/sign-in')} />
          </>
        )}
      </Card>

      {isAdmin ? (
        <Card>
          <ThemedText type="heading">관리자</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            공지와 설교를 등록하고 수정할 수 있습니다.
          </ThemedText>
          <Button label="관리자 화면 열기" icon="construct-outline" onPress={() => router.push('/admin')} />
        </Card>
      ) : null}

      <View>
        <SectionHeader title="교회 정보" />
        <Card>
          <ThemedText type="heading">{church?.name ?? ''}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {church?.slogan ?? ''}
          </ThemedText>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <ListRow icon="person-outline" title="담임목사" subtitle={church?.pastor} />
          <ListRow
            icon="location-outline"
            title="주소"
            subtitle={church?.address}
            onPress={
              church?.address
                ? () =>
                    void Linking.openURL(
                      Platform.select({
                        ios: `http://maps.apple.com/?q=${encodeURIComponent(church.address)}`,
                        default: `https://maps.google.com/?q=${encodeURIComponent(church.address)}`,
                      }),
                    )
                : undefined
            }
          />
          <ListRow
            icon="call-outline"
            title="전화"
            subtitle={church?.phone}
            onPress={church?.phone ? () => void Linking.openURL(`tel:${church.phone}`) : undefined}
          />
          <ListRow
            icon="mail-outline"
            title="이메일"
            subtitle={church?.email}
            onPress={church?.email ? () => void Linking.openURL(`mailto:${church.email}`) : undefined}
          />
          <ListRow icon="card-outline" title="헌금 계좌" subtitle={church?.offeringAccount} />
        </Card>
      </View>

      <View>
        <SectionHeader title="앱 정보" />
        <Card>
          <ListRow
            icon="server-outline"
            title="데이터 모드"
            subtitle={
              dataMode === 'supabase'
                ? 'Supabase 에 연결되어 있습니다.'
                : '샘플 데이터로 동작 중입니다. 추가한 내용은 이 기기에만 저장됩니다.'
            }
            right={<Badge label={dataMode === 'supabase' ? 'Supabase' : '샘플'} tone={dataMode === 'supabase' ? 'success' : 'textSecondary'} />}
          />
          <ListRow icon="information-circle-outline" title="버전" subtitle="1.0.0" />
          {dataMode === 'sample' ? (
            <Button
              label="샘플 데이터 초기화"
              variant="ghost"
              icon="refresh-outline"
              onPress={() => {
                void resetSampleData().then(() => profile.reload());
              }}
            />
          ) : null}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  divider: { height: StyleSheet.hairlineWidth, marginVertical: Spacing.one },
});

import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Badge, Button, Card, ListRow, SectionHeader } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { dataMode, repository, useAsyncData } from '@/lib/data';
import { resetSampleData } from '@/lib/data/sample-repository';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, isAdmin, signOut } = useAuth();
  const profile = useAsyncData(() => repository.getChurchProfile());

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
            <Button label="내 정보 수정" variant="secondary" icon="create-outline" onPress={() => router.push('/profile')} />
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

      <View>
        <SectionHeader title="알림" />
        <Card>
          <ListRow
            icon="notifications-outline"
            title="기도 알림"
            subtitle="정한 요일·시간에 기도 알림을 받아요"
            onPress={() => router.push('/reminders')}
          />
        </Card>
      </View>

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
        <SectionHeader title="교회 안내" />
        <Card>
          <ListRow
            icon="information-circle-outline"
            title="교회 안내 보기"
            subtitle="예배 안내 · 섬기는 사람들 · 오시는 길 · 헌금"
            onPress={() => router.push('/guide')}
          />
        </Card>
      </View>

      <View>
        <SectionHeader title="약관 · 정책" />
        <Card>
          <ListRow
            icon="shield-checkmark-outline"
            title="개인정보처리방침"
            onPress={() => router.push('/privacy')}
          />
          <ListRow icon="document-text-outline" title="이용약관" onPress={() => router.push('/terms')} />
          <ListRow
            icon="mail-unread-outline"
            title="이메일무단수집거부"
            onPress={() => router.push('/email-refusal')}
          />
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

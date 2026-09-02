import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, EmptyState, LoadingState, SectionHeader } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { parseAccount } from '@/lib/account';
import { repository, useAsyncData } from '@/lib/data';

/** 헌금 안내 화면 — 계좌 복사와 (있으면) 온라인 헌금 링크. */
export default function GivingScreen() {
  const theme = useTheme();
  const profile = useAsyncData(() => repository.getChurchProfile());
  const [copied, setCopied] = useState(false);

  if (profile.loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  const church = profile.data;
  const account = church?.offeringAccount ? parseAccount(church.offeringAccount) : null;

  const copyAccount = async () => {
    if (!account) return;
    await Clipboard.setStringAsync(account.copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openGiving = async () => {
    if (!church?.givingUrl) return;
    if (Platform.OS === 'web') {
      await Linking.openURL(church.givingUrl);
    } else {
      await WebBrowser.openBrowserAsync(church.givingUrl);
    }
  };

  return (
    <Screen>
      <ThemedText type="small" themeColor="textSecondary" style={styles.intro}>
        정성으로 드리는 헌금에 감사드립니다. 아래 계좌로 보내실 수 있습니다.
      </ThemedText>

      {account ? (
        <Card style={[styles.accountCard, { borderColor: theme.primary }]}>
          <View style={styles.accountRow}>
            <View style={[styles.bankChip, { backgroundColor: theme.backgroundSelected }]}>
              <Ionicons name="card" size={18} color={theme.primary} />
            </View>
            <View style={styles.flex}>
              {account.bank ? (
                <ThemedText type="caption" themeColor="textSecondary">
                  {account.bank}
                </ThemedText>
              ) : null}
              <ThemedText type="subtitle" style={styles.number}>
                {account.number || church?.offeringAccount}
              </ThemedText>
              {account.holder ? (
                <ThemedText type="caption" themeColor="textMuted">
                  예금주 {account.holder}
                </ThemedText>
              ) : null}
            </View>
          </View>

          <Button
            label={copied ? '복사되었습니다 ✓' : '계좌번호 복사'}
            icon={copied ? 'checkmark' : 'copy-outline'}
            onPress={() => void copyAccount()}
          />
          <ThemedText type="caption" themeColor="textMuted" style={styles.hint}>
            계좌번호를 복사한 뒤, 쓰시는 은행·간편결제(카카오페이·토스) 앱에서 붙여넣어 보내 주세요.
          </ThemedText>
        </Card>
      ) : (
        <EmptyState icon="card-outline" message="등록된 헌금 계좌가 없습니다." />
      )}

      {church?.givingUrl ? (
        <View>
          <SectionHeader title="온라인 헌금" />
          <Card>
            <ThemedText type="small" themeColor="textSecondary">
              카드·간편결제로 바로 헌금하고 기부금영수증을 받으실 수 있습니다.
            </ThemedText>
            <Button label="온라인 헌금하기" icon="open-outline" onPress={() => void openGiving()} />
          </Card>
        </View>
      ) : null}

      <Card style={styles.noteCard}>
        <ThemedText type="caption" themeColor="textMuted">
          헌금 종류(주정헌금·감사헌금·선교헌금 등)는 보내실 때 입금자명이나 메모에 적어 주시면 정리에 도움이 됩니다.
          문의는 교회 사무실로 연락해 주세요.
        </ThemedText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  intro: { marginBottom: Spacing.one },
  accountCard: { borderWidth: 1, gap: Spacing.three },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  bankChip: {
    width: 40,
    height: 40,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: { letterSpacing: 0.5 },
  hint: { lineHeight: 18 },
  noteCard: { backgroundColor: 'transparent' },
});

import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Card, EmptyState, LoadingState } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { parseAccount, type ParsedAccount } from '@/lib/account';
import { repository, useAsyncData } from '@/lib/data';

/** 헌금 종류 — 종류마다 입금자란에 붙일 약자와 짧은 안내. (교회 상황에 맞게 편집하세요) */
const OFFERING_TYPES: { key: string; abbr: string; desc: string }[] = [
  { key: '십일조', abbr: '십', desc: '모든 것이 하나님께로 왔음을 인정하며, 소득의 십 분의 일을 드리는 헌금입니다.' },
  { key: '주일헌금', abbr: '주', desc: '주일 예배로 나아와 감사함으로 드리는 헌금입니다.' },
  { key: '감사헌금', abbr: '감', desc: '삶 속에 베푸신 은혜에 감사하며 드리는 헌금입니다.' },
  { key: '절기헌금', abbr: '절', desc: '맥추·추수·성탄 등 절기를 기념하며 드리는 헌금입니다.' },
  { key: '선교헌금', abbr: '선', desc: '국내외 선교와 전도, 이웃 섬김을 위해 드리는 헌금입니다.' },
  { key: '건축헌금', abbr: '건', desc: '예배와 사역의 공간을 세우기 위해 드리는 헌금입니다.' },
  { key: '주정헌금', abbr: '주정', desc: '주일을 정하여 정기적으로 드리는 헌금입니다.' },
];

/** 은행 앱 — 계좌번호를 복사한 뒤 앱을 엽니다. 토스는 계좌 자동입력을 시도합니다. */
const BANK_APPS: { key: string; label: string; short: string; badge?: string; color: string; text: string; scheme: (a: ParsedAccount) => string | null }[] = [
  {
    key: 'toss', label: '토스', short: '토스', badge: '계좌 자동입력', color: '#0064FF', text: '#fff',
    scheme: (a) => (a.number ? `supertoss://send?bank=${encodeURIComponent(a.bank || '')}&accountNo=${a.number.replace(/\D/g, '')}` : 'supertoss://'),
  },
  { key: 'kakao', label: '카카오뱅크', short: '카카오', color: '#FFE300', text: '#3C1E1E', scheme: () => 'kakaobank://' },
  { key: 'kb', label: '국민은행', short: '국민', color: '#6B5B4E', text: '#fff', scheme: () => 'kbbank://' },
  { key: 'shinhan', label: '신한은행', short: '신한', color: '#0046FF', text: '#fff', scheme: () => 'shinhan-sr-ansimclick://' },
  { key: 'woori', label: '우리은행', short: '우리', color: '#0067AC', text: '#fff', scheme: () => 'NewSmartPib://' },
  { key: 'hana', label: '하나은행', short: '하나', color: '#008485', text: '#fff', scheme: () => 'hanabank://' },
  { key: 'nh', label: '농협은행', short: '농협', color: '#12A54C', text: '#fff', scheme: () => 'nhallonebank://' },
  { key: 'kbank', label: '케이뱅크', short: '케뱅', color: '#3300FF', text: '#fff', scheme: () => 'kbankwithme://' },
  { key: 'ibk', label: '기업은행', short: '기업', color: '#0B3F8F', text: '#fff', scheme: () => 'ibkonebank://' },
  { key: 'etc', label: '다른 은행', short: '기타', color: '#8A8F98', text: '#fff', scheme: () => null },
];

export default function GivingScreen() {
  const theme = useTheme();
  const profile = useAsyncData(() => repository.getChurchProfile());

  const [typeIdx, setTypeIdx] = useState(0);
  const [accIdx, setAccIdx] = useState(0);
  const [name, setName] = useState('');
  const [birth, setBirth] = useState('');
  const [toast, setToast] = useState('');

  if (profile.loading && !profile.data) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  const church = profile.data;
  const accounts = (church?.offeringAccount ?? '')
    .split(/\r?\n|;/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parseAccount);
  const account = accounts[accIdx] ?? accounts[0] ?? null;
  const type = OFFERING_TYPES[typeIdx];

  const depositor = name.trim() ? `${name.trim()}${birth.trim()}${type.abbr}` : '';

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  const copy = async (text: string, msg: string) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    flash(msg);
  };

  const openBankApp = async (bank: (typeof BANK_APPS)[number]) => {
    if (account?.copyText) await Clipboard.setStringAsync(account.copyText);
    const scheme = bank.scheme(account ?? ({ bank: '', number: '', holder: '', copyText: '' } as ParsedAccount));
    if (!scheme) {
      flash('계좌번호가 복사되었어요. 쓰시는 은행 앱에서 붙여넣어 송금해 주세요.');
      return;
    }
    flash('계좌번호가 복사되었어요. 송금 화면에서 붙여넣어 주세요.');
    try {
      await Linking.openURL(scheme);
    } catch {
      // 앱이 없거나 열 수 없으면 복사만으로 안내합니다.
    }
  };

  if (!church) {
    return (
      <Screen>
        <EmptyState icon="card-outline" message="교회 정보를 불러오지 못했습니다." />
      </Screen>
    );
  }

  return (
    <Screen>
      <ThemedText type="title">온라인 헌금</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.intro}>
        정성으로 드리는 헌금에 감사드립니다.
      </ThemedText>

      {/* ① 헌금 종류 */}
      <StepHeader n={1} title="헌금 종류를 선택하세요" theme={theme} />
      <View style={styles.chipWrap}>
        {OFFERING_TYPES.map((t, i) => {
          const on = i === typeIdx;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTypeIdx(i)}
              style={[styles.chip, { backgroundColor: on ? theme.primary : theme.backgroundElement, borderColor: on ? theme.primary : theme.border }]}>
              <ThemedText type="smallBold" style={{ color: on ? theme.onPrimary : theme.textSecondary }}>
                {t.key}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={styles.desc}>
        {type.desc}
      </ThemedText>

      {/* ② 입금 계좌 */}
      <StepHeader n={2} title="입금 계좌" theme={theme} />
      {accounts.length === 0 ? (
        <EmptyState icon="card-outline" message="등록된 헌금 계좌가 없습니다." />
      ) : (
        <>
          {accounts.length > 1 ? (
            <View style={styles.accWrap}>
              {accounts.map((a, i) => {
                const on = i === accIdx;
                return (
                  <Pressable
                    key={i}
                    onPress={() => setAccIdx(i)}
                    style={[styles.accPick, { borderColor: on ? theme.primary : theme.border, backgroundColor: theme.backgroundElement }]}>
                    <ThemedText type="caption" themeColor="textSecondary">
                      {a.bank || '계좌'}
                    </ThemedText>
                    <ThemedText type="smallBold" numberOfLines={1}>
                      {a.number || a.copyText}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

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
                    {account.number || account.copyText}
                  </ThemedText>
                  {account.holder ? (
                    <ThemedText type="caption" themeColor="textMuted">
                      예금주 {account.holder}
                    </ThemedText>
                  ) : null}
                </View>
              </View>
              <Pressable
                onPress={() => void copy(account.copyText, '계좌번호가 복사되었어요.')}
                style={({ pressed }) => [styles.primaryBtn, { backgroundColor: theme.primary, opacity: pressed ? 0.9 : 1 }]}>
                <Ionicons name="copy-outline" size={16} color={theme.onPrimary} />
                <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
                  계좌번호 복사
                </ThemedText>
              </Pressable>
            </Card>
          ) : null}
        </>
      )}

      {/* ③ 입금자명 만들기 */}
      <StepHeader n={3} title="입금자란에 이렇게 적어 주세요" theme={theme} />
      <Card>
        <ThemedText type="caption" themeColor="textSecondary">
          이름
        </ThemedText>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="홍길동"
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { borderColor: theme.border, backgroundColor: theme.backgroundElement, color: theme.text }]}
          returnKeyType="done"
        />
        <ThemedText type="caption" themeColor="textSecondary" style={styles.mt}>
          생년월일 6자리
        </ThemedText>
        <TextInput
          value={birth}
          onChangeText={(v) => setBirth(v.replace(/\D/g, '').slice(0, 6))}
          placeholder="901231"
          placeholderTextColor={theme.textMuted}
          keyboardType="number-pad"
          maxLength={6}
          style={[styles.input, { borderColor: theme.border, backgroundColor: theme.backgroundElement, color: theme.text }]}
        />

        <View style={[styles.depositorBox, { borderColor: theme.border, backgroundColor: theme.backgroundSelected }]}>
          <View style={styles.flex}>
            <ThemedText type="caption" themeColor="textMuted">
              입금자명
            </ThemedText>
            <ThemedText type="subtitle" themeColor={depositor ? 'primary' : 'textMuted'}>
              {depositor || '이름을 입력하면 만들어집니다'}
            </ThemedText>
          </View>
          <Pressable
            disabled={!depositor}
            onPress={() => void copy(depositor, '입금자명이 복사되었어요.')}
            style={({ pressed }) => [styles.smallBtn, { backgroundColor: theme.primary, opacity: !depositor ? 0.4 : pressed ? 0.9 : 1 }]}>
            <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
              복사
            </ThemedText>
          </Pressable>
        </View>
      </Card>

      {/* ④ 은행 앱 선택 */}
      <StepHeader n={4} title="사용하시는 은행 앱을 선택하세요" theme={theme} />
      <ThemedText type="small" themeColor="textSecondary" style={styles.desc}>
        계좌번호가 자동으로 복사된 뒤 앱이 열립니다. 송금 화면에서 붙여넣기 해주세요.
      </ThemedText>
      <View style={styles.bankGrid}>
        {BANK_APPS.map((b) => (
          <Pressable
            key={b.key}
            onPress={() => void openBankApp(b)}
            style={({ pressed }) => [styles.bankBtn, { borderColor: theme.border, backgroundColor: theme.backgroundElement, opacity: pressed ? 0.85 : 1 }]}>
            <View style={[styles.bankLogo, { backgroundColor: b.color }]}>
              <ThemedText type="caption" style={{ color: b.text, fontWeight: '800' }}>
                {b.short}
              </ThemedText>
            </View>
            <View style={styles.flex}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {b.label}
              </ThemedText>
              {b.badge ? (
                <ThemedText type="caption" themeColor="primary" style={styles.bold}>
                  {b.badge}
                </ThemedText>
              ) : null}
            </View>
          </Pressable>
        ))}
      </View>

      {/* 안내 */}
      <Card style={[styles.guideCard, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="smallBold">알려드립니다</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.mt}>
          · 입금자란에 <ThemedText type="small" themeColor="primary" style={styles.bold}>이름 · 생년월일 · 헌금종류</ThemedText>를 꼭
          기록해 주세요. 기록이 없으면 헌금 내역 확인이 어렵습니다. (예: {name.trim() || '홍길동'}
          {birth.trim() || '901231'}
          {type.abbr})
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted" style={styles.mt}>
          · 문의는 교회 사무실로 연락해 주세요.
        </ThemedText>
      </Card>

      {church.givingUrl ? (
        <Pressable
          onPress={() =>
            Platform.OS === 'web' ? void Linking.openURL(church.givingUrl) : void WebBrowser.openBrowserAsync(church.givingUrl)
          }
          style={({ pressed }) => [styles.linkBtn, { borderColor: theme.primary, opacity: pressed ? 0.9 : 1 }]}>
          <Ionicons name="open-outline" size={16} color={theme.primary} />
          <ThemedText type="smallBold" themeColor="primary">
            카드 · 간편결제로 헌금하기
          </ThemedText>
        </Pressable>
      ) : null}

      {toast ? (
        <View style={[styles.toast, { backgroundColor: theme.text }]}>
          <ThemedText type="caption" style={{ color: theme.background, textAlign: 'center' }}>
            {toast}
          </ThemedText>
        </View>
      ) : null}
    </Screen>
  );
}

function StepHeader({ n, title, theme }: { n: number; title: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.stepHead}>
      <View style={[styles.stepNum, { backgroundColor: theme.primary }]}>
        <ThemedText type="caption" style={styles.stepNumText}>
          {n}
        </ThemedText>
      </View>
      <ThemedText type="heading">{title}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  intro: { marginBottom: Spacing.two },
  bold: { fontWeight: '700' },
  mt: { marginTop: Spacing.two },

  stepHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.three, marginBottom: Spacing.one },
  stepNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: '#fff', fontWeight: '800' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.pill, borderWidth: StyleSheet.hairlineWidth },
  desc: { marginTop: Spacing.two, lineHeight: 20 },

  accWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginBottom: Spacing.two },
  accPick: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.medium, borderWidth: 1, minWidth: 150 },
  accountCard: { borderWidth: 1, gap: Spacing.three },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  bankChip: { width: 40, height: 40, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' },
  number: { letterSpacing: 0.5 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Radius.medium,
  },

  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    fontSize: 16,
    marginTop: 4,
  },
  depositorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderRadius: Radius.medium,
    padding: Spacing.three,
    marginTop: Spacing.three,
  },
  smallBtn: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.pill },

  bankGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.two },
  bankBtn: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.two + 2,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bankLogo: { width: 40, height: 40, borderRadius: Radius.small, alignItems: 'center', justifyContent: 'center' },

  guideCard: { borderWidth: StyleSheet.hairlineWidth, gap: 2, marginTop: Spacing.three },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
    marginTop: Spacing.two,
  },
  toast: { position: 'absolute', left: Spacing.four, right: Spacing.four, bottom: Spacing.four, padding: Spacing.three, borderRadius: Radius.medium },
});

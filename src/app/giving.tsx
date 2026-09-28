import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
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

const HERO_IMAGE = require('@/assets/images/giving.jpg');

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

/**
 * 은행 앱 — 계좌번호를 복사한 뒤 앱을 엽니다. 토스는 계좌 자동입력을 시도합니다.
 *
 * 안드로이드 브라우저에서는 커스텀 스킴(kbbank:// 등)이 무시되는 경우가 많아,
 * 앱을 확실히 여는 intent:// (패키지명 기반, 미설치 시 플레이스토어로 이동)를 사용합니다.
 * iOS 는 패키지 실행이 불가하므로 커스텀 스킴을 사용합니다.
 *
 * pkg: 안드로이드 패키지명(플레이스토어에서 확인), scheme: iOS 커스텀 스킴 이름.
 * send: 토스처럼 앱 화면·계좌를 자동 입력할 때 쓰는 경로/쿼리(scheme:// 뒤에 붙는 부분).
 */
type BankApp = {
  key: string;
  label: string;
  short: string;
  badge?: string;
  color: string;
  text: string;
  pkg?: string;
  scheme?: string;
  send?: (a: ParsedAccount) => string;
};

const BANK_APPS: BankApp[] = [
  {
    key: 'toss', label: '토스', short: '토스', badge: '계좌 자동입력', color: '#0064FF', text: '#fff',
    pkg: 'viva.republica.toss', scheme: 'supertoss',
    send: (a) => (a.number ? `send?bank=${encodeURIComponent(a.bank || '')}&accountNo=${a.number.replace(/\D/g, '')}` : ''),
  },
  { key: 'kakao', label: '카카오뱅크', short: '카카오', color: '#FFE300', text: '#3C1E1E', pkg: 'com.kakaobank.channel', scheme: 'kakaobank' },
  { key: 'kb', label: '국민은행', short: '국민', color: '#6B5B4E', text: '#fff', pkg: 'com.kbstar.kbbank', scheme: 'kbbank' },
  { key: 'shinhan', label: '신한은행', short: '신한', color: '#0046FF', text: '#fff', pkg: 'com.shinhan.sbanking', scheme: 'shinhan-sr-ansimclick' },
  { key: 'woori', label: '우리은행', short: '우리', color: '#0067AC', text: '#fff', pkg: 'com.wooribank.smart.npib', scheme: 'NewSmartPib' },
  { key: 'hana', label: '하나은행', short: '하나', color: '#008485', text: '#fff', pkg: 'com.hanabank.oqf', scheme: 'hanabank' },
  { key: 'nh', label: '농협은행', short: '농협', color: '#12A54C', text: '#fff', pkg: 'nh.smart.banking', scheme: 'nhsmartbanking' },
  { key: 'kbank', label: '케이뱅크', short: '케뱅', color: '#3300FF', text: '#fff', pkg: 'com.kbankwith.smartbank', scheme: 'kbankwithme' },
  { key: 'ibk', label: '기업은행', short: '기업', color: '#0B3F8F', text: '#fff', pkg: 'com.ibk.android.ionebank', scheme: 'ibkonebank' },
  { key: 'etc', label: '다른 은행', short: '기타', color: '#8A8F98', text: '#fff' },
];

/** 웹(PWA)에서 현재 브라우저가 안드로이드인지 판별합니다. */
function isAndroidWeb(): boolean {
  return (
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    /android/i.test(navigator.userAgent || '')
  );
}

/** 은행 앱을 여는 URL 을 만듭니다. (안드로이드: intent://, 그 외: 커스텀 스킴) */
function buildBankUrl(bank: BankApp, path: string): string | null {
  if (!bank.pkg && !bank.scheme) return null;
  if (isAndroidWeb() && bank.pkg) {
    const fallback = encodeURIComponent(`https://play.google.com/store/apps/details?id=${bank.pkg}`);
    const head = path ? `intent://${path}` : 'intent://';
    // 경로가 있으면(토스 자동입력 등) 해당 스킴으로, 없으면 패키지 실행만으로 앱을 엽니다.
    const schemePart = path && bank.scheme ? `scheme=${bank.scheme};` : '';
    return `${head}#Intent;${schemePart}package=${bank.pkg};S.browser_fallback_url=${fallback};end`;
  }
  if (!bank.scheme) return null;
  return path ? `${bank.scheme}://${path}` : `${bank.scheme}://`;
}

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
  // 토스는 유일하게 '송금 화면 + 계좌 자동입력'으로 바로 들어가므로 눈에 띄게 따로 둡니다.
  const toss = BANK_APPS.find((b) => b.key === 'toss');

  // 입금자명 순서: 헌금종류 앞글자 → 이름 → 생년 (예: 십최병훈850312)
  const depositor = name.trim() ? `${type.abbr}${name.trim()}${birth.trim()}` : '';

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  const copy = async (text: string, msg: string) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    flash(msg);
  };

  const openBankApp = async (bank: BankApp) => {
    if (account?.copyText) await Clipboard.setStringAsync(account.copyText);
    const acc = account ?? ({ bank: '', number: '', holder: '', copyText: '' } as ParsedAccount);
    const path = bank.send ? bank.send(acc) : '';
    const url = buildBankUrl(bank, path);
    if (!url) {
      flash('계좌번호가 복사되었어요. 쓰시는 은행 앱에서 붙여넣어 송금해 주세요.');
      return;
    }
    flash('계좌번호가 복사되었어요. 송금 화면에서 붙여넣어 주세요.');
    try {
      await Linking.openURL(url);
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
      <View style={styles.hero}>
        <Image source={HERO_IMAGE} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']}
          style={StyleSheet.absoluteFill}
        />
        <ThemedText style={styles.heroTitle}>온라인 헌금</ThemedText>
      </View>
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
          생년 2자리
        </ThemedText>
        <TextInput
          value={birth}
          onChangeText={(v) => setBirth(v.replace(/\D/g, '').slice(0, 2))}
          placeholder="76"
          placeholderTextColor={theme.textMuted}
          keyboardType="number-pad"
          maxLength={2}
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

      {/* ④ 송금하기 */}
      <StepHeader n={4} title="송금하기" theme={theme} />

      {/* 토스: 계좌 자동입력으로 송금 화면에 바로 진입 */}
      {toss ? (
        <Pressable
          onPress={() => void openBankApp(toss)}
          style={({ pressed }) => [styles.tossBtn, { opacity: pressed ? 0.92 : 1 }]}>
          <View style={[styles.bankLogo, { backgroundColor: toss.color }]}>
            <ThemedText type="caption" style={{ color: toss.text, fontWeight: '800' }}>
              {toss.short}
            </ThemedText>
          </View>
          <View style={styles.flex}>
            <ThemedText type="smallBold" style={{ color: '#fff' }}>
              토스로 바로 송금
            </ThemedText>
            <ThemedText type="caption" style={{ color: 'rgba(255,255,255,0.92)' }}>
              은행·계좌가 자동 입력된 송금 화면으로 바로 들어가요
            </ThemedText>
          </View>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </Pressable>
      ) : null}

      <ThemedText type="small" themeColor="textSecondary" style={styles.desc}>
        또는 사용하시는 은행 앱을 선택하세요. 계좌번호가 자동으로 복사되어 앱이 열리며, 송금 화면에서 붙여넣기 하시면 됩니다.
      </ThemedText>
      <View style={styles.bankGrid}>
        {BANK_APPS.filter((b) => b.key !== 'toss').map((b) => (
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
          · 입금자란에 <ThemedText type="small" themeColor="primary" style={styles.bold}>헌금종류 · 이름 · 생년</ThemedText>을 꼭
          기록해 주세요. 기록이 없으면 헌금 내역 확인이 어렵습니다. (예: {type.abbr}
          {name.trim() || '홍길동'}
          {birth.trim() || '76'})
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
  hero: {
    width: '100%',
    height: 170,
    borderRadius: Radius.large,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
    padding: Spacing.four,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  intro: { marginTop: Spacing.two, marginBottom: Spacing.two },
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

  tossBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    backgroundColor: '#0064FF',
    marginTop: Spacing.two,
  },
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

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button, Card, Field } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { repository } from '@/lib/data';

const GENDERS = ['형제', '자매'];

/** 새가족 등록 — 방문하신 분이 직접 정보를 남깁니다. 로그인 없이도 가능합니다. */
export default function NewFamilyScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [referrer, setReferrer] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!name.trim() || !phone.trim()) {
      setError('이름과 연락처는 꼭 남겨 주세요.');
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      await repository.createNewFamily({
        name: name.trim(),
        phone: phone.trim(),
        gender,
        address: address.trim(),
        referrer: referrer.trim(),
        note: note.trim(),
      });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '등록하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <Screen>
        <Card style={styles.doneCard}>
          <ThemedText type="subtitle">환영합니다! 🙏</ThemedText>
          <ThemedText type="body" themeColor="textSecondary" style={styles.center}>
            등록해 주셔서 감사합니다. 교회에서 곧 반갑게 연락드리겠습니다.
          </ThemedText>
          <Button label="확인" onPress={() => router.back()} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <ThemedText type="small" themeColor="textSecondary" style={styles.intro}>
        구리 목양교회에 오신 것을 환영합니다. 아래 정보를 남겨 주시면 담당자가 반갑게 연락드리겠습니다.
      </ThemedText>

      <View style={styles.form}>
        <Field label="이름" value={name} onChangeText={setName} placeholder="성함을 적어 주세요" />
        <Field
          label="연락처"
          value={phone}
          onChangeText={setPhone}
          placeholder="010-0000-0000"
          keyboardType="phone-pad"
        />

        <View style={styles.field}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            성별 (선택)
          </ThemedText>
          <View style={styles.chipRow}>
            {GENDERS.map((option) => {
              const active = option === gender;
              return (
                <Pressable
                  key={option}
                  onPress={() => setGender(active ? '' : option)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? theme.primary : theme.backgroundElement,
                      borderColor: active ? theme.primary : theme.border,
                    },
                  ]}>
                  <ThemedText
                    type="caption"
                    style={{ color: active ? theme.onPrimary : theme.textSecondary, fontWeight: '700' }}>
                    {option}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Field label="사는 지역 (선택)" value={address} onChangeText={setAddress} placeholder="예) 구리시 인창동" />
        <Field
          label="소개자 · 방문 경로 (선택)"
          value={referrer}
          onChangeText={setReferrer}
          placeholder="예) OOO 성도 소개 / 인터넷 검색"
        />
        <Field
          label="남기고 싶은 말 (선택)"
          value={note}
          onChangeText={setNote}
          placeholder="궁금한 점이나 기도제목을 자유롭게 남겨 주세요."
          multiline
        />

        {error ? (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        ) : null}

        <Button label="등록하기" icon="send-outline" loading={saving} onPress={() => void submit()} />
        <ThemedText type="caption" themeColor="textMuted" style={styles.privacy}>
          남겨 주신 정보는 새가족 안내 목적으로만 사용되며, 교회 담당자만 확인합니다.
        </ThemedText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { lineHeight: 20 },
  form: { gap: Spacing.three },
  field: { gap: Spacing.one },
  chipRow: { flexDirection: 'row', gap: Spacing.two },
  chip: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  privacy: { textAlign: 'center', lineHeight: 18 },
  doneCard: { alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.five },
  center: { textAlign: 'center' },
});

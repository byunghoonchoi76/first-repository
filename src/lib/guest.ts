import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/**
 * '손님으로 둘러보기'를 한 번 선택하면 다음부터는 시작 화면을 다시 묻지 않도록 기억합니다.
 * (로그인한 사용자는 이 값과 무관하게 시작 화면을 건너뜁니다.)
 */
const GUEST_KEY = 'church-app/guest-ack';

export function useGuestAck() {
  // null = 아직 불러오는 중, true/false = 확인됨
  const [ack, setAck] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(GUEST_KEY)
      .then((v) => active && setAck(v === 'true'))
      .catch(() => active && setAck(false));
    return () => {
      active = false;
    };
  }, []);

  const chooseGuest = useCallback(async () => {
    await AsyncStorage.setItem(GUEST_KEY, 'true');
    setAck(true);
  }, []);

  const resetGuest = useCallback(async () => {
    await AsyncStorage.removeItem(GUEST_KEY);
    setAck(false);
  }, []);

  return { ack, chooseGuest, resetGuest };
}

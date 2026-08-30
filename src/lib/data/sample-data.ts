import { ChurchInfo } from '@/constants/church';
import type {
  Announcement,
  Bulletin,
  ChurchProfile,
  GroupMessage,
  PrayerRequest,
  Sermon,
  SmallGroup,
} from '@/lib/data/types';

/** 오늘 기준 상대 날짜를 만들어 샘플 데이터가 항상 '최근' 으로 보이게 합니다. */
function daysAgo(days: number): Date {
  const d = new Date();
  d.setHours(10, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

const dateOnly = (days: number) => daysAgo(days).toISOString().slice(0, 10);
const dateTime = (days: number) => daysAgo(days).toISOString();

/** 가장 최근 지난 주일(일요일)까지의 일수 */
function daysSinceLastSunday(): number {
  const today = new Date().getDay();
  return today === 0 ? 0 : today;
}

const lastSunday = daysSinceLastSunday();

export const sampleChurchProfile: ChurchProfile = {
  ...ChurchInfo,
  serviceTimes: [
    { id: 'st-1', name: '주일 1부 예배', schedule: '주일 오전 9:00', place: '본당' },
    {
      id: 'st-2',
      name: '주일 2부 예배',
      schedule: '주일 오전 11:00',
      place: '본당',
      note: '영유아부 운영',
    },
    { id: 'st-3', name: '주일 오후 찬양예배', schedule: '주일 오후 2:00', place: '비전홀' },
    { id: 'st-4', name: '수요 기도회', schedule: '수요일 오후 7:30', place: '본당' },
    { id: 'st-5', name: '금요 철야기도', schedule: '금요일 오후 9:00', place: '기도실' },
    { id: 'st-6', name: '새벽 기도회', schedule: '화~토 오전 5:30', place: '본당' },
  ],
};

export const sampleBulletins: Bulletin[] = [
  {
    id: 'bulletin-1',
    serviceDate: dateOnly(lastSunday),
    title: '주일 예배 주보',
    sermonTitle: '흔들리지 않는 기초',
    preacher: '김은혜 담임목사',
    scripture: '마태복음 7:24-27',
    weeklyVerse:
      '그러므로 누구든지 나의 이 말을 듣고 행하는 자는 그 집을 반석 위에 지은 지혜로운 사람 같으리니 (마 7:24)',
    order: [
      { title: '예배의 부름', detail: '시편 100:1-5 / 인도자' },
      { title: '찬송', detail: '찬송가 43장 «즐겁게 안식할 날»' },
      { title: '신앙고백', detail: '사도신경 / 다같이' },
      { title: '기도', detail: '박성실 장로' },
      { title: '성경봉독', detail: '마태복음 7:24-27' },
      { title: '찬양', detail: '시온찬양대 «주는 나의 반석»' },
      { title: '말씀', detail: '«흔들리지 않는 기초» / 김은혜 담임목사' },
      { title: '봉헌 · 광고', detail: '봉헌송 / 다같이' },
      { title: '축도', detail: '김은혜 담임목사' },
    ],
    notices: [
      '다음 주일은 성찬식이 있습니다. 마음을 준비해 주세요.',
      '새가족 환영회가 예배 후 2층 카페에서 있습니다.',
      '여름 성경학교 교사 지원을 받습니다. 교육부로 문의해 주세요.',
    ],
  },
  {
    id: 'bulletin-2',
    serviceDate: dateOnly(lastSunday + 7),
    title: '주일 예배 주보',
    sermonTitle: '함께 걷는 길',
    preacher: '이소망 부목사',
    scripture: '전도서 4:9-12',
    weeklyVerse: '두 사람이 한 사람보다 나음은 그들이 수고함으로 좋은 상을 얻을 것임이라 (전 4:9)',
    order: [
      { title: '예배의 부름', detail: '시편 133:1-3 / 인도자' },
      { title: '찬송', detail: '찬송가 221장 «주 믿는 형제들»' },
      { title: '신앙고백', detail: '사도신경 / 다같이' },
      { title: '기도', detail: '최믿음 권사' },
      { title: '성경봉독', detail: '전도서 4:9-12' },
      { title: '말씀', detail: '«함께 걷는 길» / 이소망 부목사' },
      { title: '봉헌 · 광고', detail: '봉헌송 / 다같이' },
      { title: '축도', detail: '이소망 부목사' },
    ],
    notices: ['소그룹 개편 신청을 받고 있습니다.', '주차장 공사로 이번 주 지하주차장 이용이 어렵습니다.'],
  },
];

export const sampleAnnouncements: Announcement[] = [
  {
    id: 'ann-1',
    title: '여름 수련회 신청 안내 (7/18~7/20)',
    body: `올해 여름 수련회를 강원도 평창 수양관에서 진행합니다.

· 일정: 7월 18일(금) ~ 20일(주일) 2박 3일
· 장소: 평창 새생명수양관
· 회비: 성인 9만원 / 청소년 6만원 / 초등 이하 4만원
· 신청: 교회 사무실 또는 각 소그룹 리더에게

신청 마감은 7월 6일 주일까지입니다. 은혜의 자리에 함께해 주세요.`,
    category: '행사',
    author: '교육부',
    pinned: true,
    publishedAt: dateTime(1),
  },
  {
    id: 'ann-2',
    title: '새가족 환영회 안내',
    body: '이번 주일 2부 예배 후 2층 카페에서 새가족 환영회가 있습니다. 등록하신 지 3개월 이내의 새가족은 모두 참석해 주시기 바랍니다. 간단한 다과가 준비되어 있습니다.',
    category: '공지',
    author: '새가족부',
    pinned: true,
    publishedAt: dateTime(2),
  },
  {
    id: 'ann-3',
    title: '주차장 보수 공사로 인한 안내',
    body: '지하주차장 바닥 보수 공사로 이번 주 토요일부터 2주간 지하 주차가 어렵습니다. 인근 공영주차장(도보 3분)을 이용해 주시고, 가급적 대중교통을 이용해 주시면 감사하겠습니다.',
    category: '공지',
    author: '관리부',
    pinned: false,
    publishedAt: dateTime(4),
  },
  {
    id: 'ann-4',
    title: '한 달 동안 이웃과 나눈 사랑의 김치 300박스',
    body: '지난 한 달 동안 성도님들과 함께 담근 김치 300박스를 지역 독거 어르신 가정에 전달했습니다. 수고해 주신 봉사자 여러분께 감사드립니다. 다음 나눔은 가을에 진행될 예정입니다.',
    category: '소식',
    author: '선교부',
    pinned: false,
    publishedAt: dateTime(9),
  },
  {
    id: 'ann-5',
    title: '성가대원 모집',
    body: '시온찬양대에서 함께 찬양할 새 대원을 모집합니다. 매주 주일 오전 8시 연습, 2부 예배 찬양으로 섬깁니다. 관심 있는 분은 지휘자 정찬양 집사에게 문의해 주세요.',
    category: '공지',
    author: '찬양부',
    pinned: false,
    publishedAt: dateTime(13),
  },
];

export const sampleSermons: Sermon[] = [
  {
    id: 'sermon-1',
    title: '흔들리지 않는 기초',
    preacher: '김은혜 담임목사',
    scripture: '마태복음 7:24-27',
    date: dateOnly(lastSunday),
    series: '산상수훈',
    mediaType: 'video',
    mediaUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    summary:
      '비바람은 반석 위에 지은 집과 모래 위에 지은 집에 똑같이 몰아칩니다. 차이를 만드는 것은 환경이 아니라 무엇 위에 서 있느냐입니다.',
  },
  {
    id: 'sermon-2',
    title: '함께 걷는 길',
    preacher: '이소망 부목사',
    scripture: '전도서 4:9-12',
    date: dateOnly(lastSunday + 7),
    series: '공동체',
    mediaType: 'video',
    mediaUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    summary: '혼자 빨리 가는 길보다 함께 멀리 가는 길을 택하라고 성경은 말합니다.',
  },
  {
    id: 'sermon-3',
    title: '새벽을 깨우는 기도',
    preacher: '김은혜 담임목사',
    scripture: '마가복음 1:35',
    date: dateOnly(lastSunday + 11),
    series: '기도학교',
    mediaType: 'audio',
    mediaUrl: 'https://download.samplelib.com/mp3/sample-15s.mp3',
    summary: '예수님도 새벽 미명에 한적한 곳으로 나가 기도하셨습니다. 기도는 하루의 방향을 정하는 일입니다.',
  },
  {
    id: 'sermon-4',
    title: '광야에서 부르시는 하나님',
    preacher: '이소망 부목사',
    scripture: '호세아 2:14-15',
    date: dateOnly(lastSunday + 14),
    series: '기도학교',
    mediaType: 'video',
    mediaUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    summary: '광야는 버려진 자리가 아니라 하나님이 다시 말을 거시는 자리입니다.',
  },
];

export const samplePrayerRequests: PrayerRequest[] = [
  {
    id: 'prayer-1',
    title: '어머니 수술을 앞두고 기도 부탁드립니다',
    body: '다음 주 화요일에 어머니께서 무릎 수술을 받으십니다. 수술이 잘 되고 회복이 빠르도록 함께 기도해 주세요.',
    author: '박소영',
    anonymous: false,
    answered: false,
    prayCount: 24,
    createdAt: dateTime(1),
  },
  {
    id: 'prayer-2',
    title: '진로를 놓고 지혜를 구합니다',
    body: '이직을 두고 고민 중입니다. 하나님의 뜻을 분별할 수 있도록, 조급해지지 않도록 기도 부탁드려요.',
    author: '익명',
    anonymous: true,
    answered: false,
    prayCount: 12,
    createdAt: dateTime(3),
  },
  {
    id: 'prayer-3',
    title: '아이가 건강하게 태어났습니다. 감사기도 부탁드려요',
    body: '지난달 기도 부탁드렸던 출산 건입니다. 산모와 아기 모두 건강합니다. 함께 기도해 주셔서 감사합니다.',
    author: '정한결',
    anonymous: false,
    answered: true,
    prayCount: 41,
    createdAt: dateTime(6),
  },
  {
    id: 'prayer-4',
    title: '수험생 자녀를 위해',
    body: '고3 딸이 지치지 않고 끝까지 잘 감당할 수 있도록, 무엇보다 마음의 평안을 잃지 않도록 기도 부탁드립니다.',
    author: '익명',
    anonymous: true,
    answered: false,
    prayCount: 18,
    createdAt: dateTime(8),
  },
];

export const sampleGroups: SmallGroup[] = [
  {
    id: 'group-1',
    name: '청년 1부 · 반석',
    leader: '한지훈 리더',
    meetingInfo: '매주 금요일 오후 8시 · 교육관 2층',
    description: '20~30대 청년들이 말씀을 나누고 삶을 나누는 모임입니다.',
    memberCount: 14,
    },
  {
    id: 'group-2',
    name: '주부 목장 · 뜰안',
    leader: '오정민 권사',
    meetingInfo: '매주 화요일 오전 10시 · 카페 뜰안',
    description: '자녀 양육과 일상의 고민을 말씀 안에서 함께 나눕니다.',
    memberCount: 9,
  },
  {
    id: 'group-3',
    name: '장년 성경공부 · 새벽별',
    leader: '서동원 장로',
    meetingInfo: '매주 수요일 예배 후 · 소예배실',
    description: '한 권씩 성경을 통독하며 깊이 묵상하는 모임입니다.',
    memberCount: 21,
  },
];

export const sampleGroupMessages: GroupMessage[] = [
  {
    id: 'msg-1',
    groupId: 'group-1',
    author: '한지훈 리더',
    body: '이번 주 금요일 모임은 교육관 2층에서 8시에 모입니다. 마태복음 7장 읽고 오세요!',
    createdAt: dateTime(2),
  },
  {
    id: 'msg-2',
    groupId: 'group-1',
    author: '김다인',
    body: '저는 야근이 있어서 8시 30분쯤 도착할 것 같아요 🙏',
    createdAt: dateTime(2),
  },
  {
    id: 'msg-3',
    groupId: 'group-1',
    author: '이준서',
    body: '간식은 제가 준비해 갈게요. 다들 금요일에 봬요!',
    createdAt: dateTime(1),
  },
  {
    id: 'msg-4',
    groupId: 'group-2',
    author: '오정민 권사',
    body: '화요일 모임 장소가 카페 뜰안으로 변경되었습니다. 참고해 주세요.',
    createdAt: dateTime(3),
  },
  {
    id: 'msg-5',
    groupId: 'group-3',
    author: '서동원 장로',
    body: '이번 주는 전도서 4장을 함께 나눕니다. 미리 읽어 오시면 좋겠습니다.',
    createdAt: dateTime(4),
  },
];

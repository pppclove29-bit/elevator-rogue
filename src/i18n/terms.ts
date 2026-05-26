/**
 * 게임 용어집 (한국어 표준 라벨)
 *
 * 코드 내부 용어와 UI 표시 용어를 분리하기 위한 매핑.
 * 모든 사용자 노출 텍스트는 여기 통과시킨다 (가능한 한).
 */

export const TERMS = {
  // 기본 자원
  gold:               '골드',
  goldShort:          'G',
  capacity:           '정원',
  speed:              '속도',
  loadTime:           '정차 시간',

  // 승객 / 상태
  passenger:          '승객',
  passengerWaiting:   '대기 승객',
  passengerOnboard:   '탑승 승객',
  anger:              '불만',
  angerThreshold:     '불만 임계',
  served:             '처리',
  servedAngry:        '불만 처리',
  floorFull:          '층 포화',

  // 엘리베이터
  elevator:           '엘리베이터',
  elevatorShort:      '엘베',
  broken:             '고장',
  repair:             '수리',

  // 시간 / 페이즈
  day:                '날',
  phase:              '페이즈',
  morning:            '출근',
  work:               '근무',
  lunch:              '점심',
  evening:            '퇴근',
  night:              '야간',

  // 메타
  modifier:           '오늘의 변수',
  relic:              '유물',
  skill:              '스킬',
  upgrade:            '업그레이드',
  event:              '이벤트',

  // 상점 / UI
  shop:               '상점',
  buy:                '구매',
  reroll:             '리롤',
  notEnoughGold:      '골드 부족',
  full:               '꽉 참',
  resume:             '재개',
  pause:              '일시정지',
  restart:            '재시작',
  skip:               '건너뛰기',
  take:               '선택',

  // 정책 (룰 에디터)
  policy:             '운영 정책',
  floorRange:         '운영 층 범위',
  parity:             '층 패리티',
  pickupMode:         '픽업 대상',
  unloadWhenFull:     '정원 풀이면 즉시 하차',
  parityAll:          '모두',
  parityEven:         '짝수층',
  parityOdd:          '홀수층',
  pickupAny:          '모든 호출',
  pickupLobbyOnly:    '1F(로비)에서만',
  pickupRole:         '특정 역할만',
} as const;

/** tick → 사람 친화 초 (50ms tick 기준) */
export function tickToSec(ticks: number): string {
  return `${(ticks * 0.05).toFixed(1)}초`;
}

/** 골드 표기: 18 → "18G" */
export function gold(n: number): string {
  return `${n}${TERMS.goldShort}`;
}

/** 백분율 변화 표기: 0.85 → "-15%", 1.2 → "+20%" */
export function percentDelta(multiplier: number): string {
  const pct = Math.round((multiplier - 1) * 100);
  return pct >= 0 ? `+${pct}%` : `${pct}%`;
}

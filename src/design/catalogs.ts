// 기획자용 카탈로그 데이터 (디자인 안 + 미구현 포함)
// 코드의 진실원천은 docs.html. 이 파일은 디자인 검토 카탈로그.

export type Status = 'done' | 'partial' | 'todo' | 'idea';

interface BaseEntry { id: string; name: string; desc: string; status: Status; notes?: string; }

// ─────────────────────────────────────────────────────────────
// 1. Daily Modifier (하루 한정)
// ─────────────────────────────────────────────────────────────
export interface ModifierEntry extends BaseEntry {
  type: 'debuff' | 'buff' | 'mixed';
  effect: string;
}

export const MODIFIERS: ModifierEntry[] = [
  // Debuff (11)
  { id: 'dm-traffic-jam-morning', name: '출근길 정체', desc: 'MORNING 스폰 가속', type: 'debuff', effect: 'MORNING 스폰 간격 ×0.6', status: 'done' },
  { id: 'dm-lunch-rush', name: '점심 광풍', desc: 'LUNCH 스폰 가속', type: 'debuff', effect: 'LUNCH 스폰 간격 ×0.6', status: 'done' },
  { id: 'dm-evening-rush', name: '퇴근 러시', desc: 'EVENING 스폰 가속', type: 'debuff', effect: 'EVENING 스폰 간격 ×0.6', status: 'done' },
  { id: 'dm-bad-mood', name: '짜증의 날', desc: '오늘 anger 가중', type: 'debuff', effect: 'angerWaiting ×1.4, angerRiding ×1.4', status: 'done' },
  { id: 'dm-power-dip', name: '정전 경고', desc: '오늘 엘베 속도 저하', type: 'debuff', effect: 'globalSpeedMultiplier ×0.7', status: 'done' },
  { id: 'dm-heavy-load', name: '무거운 짐', desc: '정차 시간 증가', type: 'debuff', effect: 'baseLoadTicks +4', status: 'done' },
  { id: 'dm-narrow-door', name: '좁은 문', desc: '정원 감소', type: 'debuff', effect: '엘베 capacity -2 (최소 2)', status: 'done' },
  { id: 'dm-restaurant-fest', name: '식당가 축제', desc: 'LUNCH 100% 식당행', type: 'debuff', effect: 'LUNCH dest 가중치: restaurant 100%', status: 'done' },
  { id: 'dm-vip-day', name: 'VIP 방문', desc: '옥상 트래픽 증가', type: 'debuff', effect: 'rooftop 가중치 ×3', status: 'done' },
  { id: 'dm-night-shift', name: '야간 근무', desc: 'NIGHT도 바쁨', type: 'debuff', effect: 'NIGHT 스폰 간격 ×0.3', status: 'done' },
  { id: 'dm-fire-drill', name: '화재 대피', desc: '시작 시 큐 폭주', type: 'debuff', effect: '랜덤 층 큐 +4', status: 'done' },

  // Buff (6)
  { id: 'dm-calm-day', name: '명상의 날', desc: 'anger 누적 감소', type: 'buff', effect: 'angerWaiting/Riding ×0.7', status: 'done' },
  { id: 'dm-smooth-ops', name: '효율 운영', desc: '정차 시간 단축', type: 'buff', effect: 'baseLoadTicks -2', status: 'done' },
  { id: 'dm-quiet-day', name: '한산한 하루', desc: '전체 스폰 감소', type: 'buff', effect: '모든 페이즈 스폰 간격 ×1.4', status: 'done' },
  { id: 'dm-fast-motors', name: '신속 모터', desc: '엘베 속도 증가', type: 'buff', effect: 'globalSpeedMultiplier ×1.2', status: 'done' },
  { id: 'dm-skill-prime', name: '즉발 풀가동', desc: '스킬 쿨다운 단축', type: 'buff', effect: 'skillCooldownMultiplier ×0.5', status: 'done' },
  { id: 'dm-free-coffee', name: '무료 커피', desc: '연쇄 anger 회복', type: 'buff', effect: 'angry 처리 시 같은 엘베 다른 승객 anger -20', status: 'done' },

  // Mixed (3)
  { id: 'dm-rush-rewards', name: '위기는 곧 기회', desc: '바쁜 만큼 보상 ↑', type: 'mixed', effect: '스폰 ×1.5, 다음날 보상 +1장', status: 'done' },
  { id: 'dm-marathon', name: '마라톤 데이', desc: '하루 길이 ↑, anger ↓', type: 'mixed', effect: 'day 길이 ×1.5, angerWaiting ×0.8', status: 'done' },
  { id: 'dm-vip-protocol', name: 'VIP 의전', desc: 'RF 처리 보상, LB 약화', type: 'mixed', effect: 'rooftop 처리 시 anger -10 모두에게, lobby 가중치 ×0.5', status: 'done' },
];

// ─────────────────────────────────────────────────────────────
// 2. 엘베 업그레이드
// ─────────────────────────────────────────────────────────────
export interface UpgradeEntry extends BaseEntry {
  category: 'stat' | 'capacity' | 'qol' | 'meta' | 'repair';
  effect: string;
  cost?: string; // Step 9 골드 가격
}

export const UPGRADES_DESIGN: UpgradeEntry[] = [
  { id: 'upgrade-speed', name: '엘베 속도 +20%', desc: '모든 엘리베이터의 이동 속도', category: 'stat', effect: 'speedPerTick ×1.2', cost: '30G', status: 'done' },
  { id: 'upgrade-capacity', name: '엘베 정원 +2', desc: '모든 엘리베이터 정원', category: 'capacity', effect: 'capacity +2', cost: '40G', status: 'done' },
  { id: 'upgrade-load-fast', name: '신속 승하차', desc: '기본 정차 시간 단축', category: 'stat', effect: 'baseLoadTicks -2', cost: '30G', status: 'done' },
  { id: 'upgrade-anger-decay', name: '서비스 친절도', desc: 'anger 누적 속도', category: 'qol', effect: 'angerWaiting ×0.9', cost: '50G', status: 'done' },
  { id: 'upgrade-floor-capacity', name: '대기 공간 확장', desc: '층 큐 상한 +3', category: 'capacity', effect: 'floorCapacity +3', cost: '40G', status: 'done' },
  { id: 'upgrade-add-elevator', name: '엘리베이터 +1', desc: '새 엘베 구매', category: 'capacity', effect: '엘베 1대 추가 (최대 3)', cost: '150G', status: 'done' },

  // 미구현 안
  { id: 'upgrade-repair-kit', name: '응급 수리 키트', desc: '고장 시 자동 복구 1회', category: 'repair', effect: '고장 발생 시 즉시 복구, 소모성', cost: '60G', status: 'done' },
  { id: 'upgrade-durability', name: '내구성 패키지', desc: '고장 확률 감소', category: 'repair', effect: '고장 확률 ×0.5 (누적)', cost: '80G', status: 'done' },
  { id: 'upgrade-express-mode', name: '익스프레스 모드', desc: '5층 이상 직행 시 속도 +', category: 'stat', effect: '연속 5층 이상 이동 시 속도 ×1.5', cost: '70G', status: 'idea' },
  { id: 'upgrade-vip-line', name: 'VIP 우선 채널', desc: 'VIP 승객 보상 ↑', category: 'meta', effect: 'VIP 승객 골드 ×2', cost: '60G', status: 'idea' },
  { id: 'upgrade-priority-bell', name: '우선 호출 벨', desc: '룰 슬롯 +1 (정책 폼에선 의미 변경됨)', category: 'qol', effect: '—', cost: '—', status: 'idea' },
  { id: 'upgrade-skill-charge', name: '스킬 충전기', desc: '스킬 쿨다운 -25%', category: 'qol', effect: 'skillCooldownMultiplier ×0.75', cost: '90G', status: 'idea' },
];

// ─────────────────────────────────────────────────────────────
// 3. 층(Floor) 디자인 - 역할 카탈로그
// ─────────────────────────────────────────────────────────────
export interface FloorRoleEntry extends BaseEntry {
  goldOnArrive: number;
  trafficNote: string;
}

export const FLOOR_ROLES_DESIGN: FloorRoleEntry[] = [
  { id: 'lobby', name: '로비', desc: '건물 입구. 모든 외부 origin/dest', goldOnArrive: 1, trafficNote: 'MORNING/EVENING의 핵심 hub', status: 'done' },
  { id: 'office', name: '사무실', desc: '근무 공간', goldOnArrive: 2, trafficNote: 'WORK 페이즈 분주, LUNCH origin', status: 'done' },
  { id: 'restaurant', name: '식당가', desc: '카페테리아/식당', goldOnArrive: 3, trafficNote: 'LUNCH 폭주', status: 'done' },
  { id: 'rooftop', name: '옥상', desc: '뷰포인트/이벤트홀', goldOnArrive: 5, trafficNote: 'WORK/MORNING 소량, 이벤트 시 폭증', status: 'done' },
  { id: 'basement', name: '지하', desc: '주차장/창고', goldOnArrive: 1, trafficNote: '낮은 가중치, NIGHT에 가끔', status: 'partial', notes: '현재 미배치 (5층 빌딩이라 슬롯 부족)' },

  // 미구현 (확장 안)
  { id: 'gym', name: '피트니스', desc: '체육관/요가', goldOnArrive: 2, trafficNote: '아침/저녁에 활발', status: 'done' },
  { id: 'mall', name: '상점가', desc: '쇼핑 공간', goldOnArrive: 4, trafficNote: '주말 핵심 hub (요일 도입 시)', status: 'done' },
  { id: 'hospital', name: '클리닉', desc: '병원 층', goldOnArrive: 3, trafficNote: '응급 이벤트 트리거 가능', status: 'done' },
  { id: 'penthouse', name: '펜트하우스', desc: 'VIP 전용 거주층', goldOnArrive: 8, trafficNote: 'VIP 승객만 사용. 최상층 위 별도', status: 'done' },
  { id: 'parking', name: '주차장', desc: '지하 N층 (-1, -2)', goldOnArrive: 1, trafficNote: '출퇴근 origin, 다층 음수 인덱스', status: 'done' },
  { id: 'cleanroom', name: '청정실', desc: '연구소/공장', goldOnArrive: 4, trafficNote: '특정 시간만 입장, 정원 -2 페널티', status: 'done' },
];

// ─────────────────────────────────────────────────────────────
// 4. 고객(Customer) 디자인
// ─────────────────────────────────────────────────────────────
export interface CustomerArchetype extends BaseEntry {
  goldMod: string;
  angerMod: string;
  spawnRule: string;
}

export const CUSTOMERS: CustomerArchetype[] = [
  { id: 'cust-normal', name: '일반 승객', desc: '기본 손님', goldMod: '×1', angerMod: '기본 누적', spawnRule: '모든 페이즈', status: 'done' },

  // 미구현 안 (Step 9~10)
  { id: 'cust-vip', name: 'VIP', desc: '중요 인사. 빠르면 거액 보상, 늦으면 큰 손해', goldMod: '×3 (빠른 처리 시)', angerMod: '×2 누적', spawnRule: 'WORK/EVENING에 가끔, VIP 방문 모디파이어 시 폭증', status: 'done' },
  { id: 'cust-elderly', name: '노약자', desc: '느린 승객. 정차 시간 +1', goldMod: '×1', angerMod: '×0.7 (관대)', spawnRule: '모든 페이즈 소량', status: 'done' },
  { id: 'cust-suit', name: '비즈니스', desc: '정장 손님. 시간이 곧 돈', goldMod: '×1.5', angerMod: '×1.3', spawnRule: 'MORNING/LUNCH/EVENING', status: 'done' },
  { id: 'cust-group', name: '단체 손님', desc: '3~5명 동시 등장. 모두 같은 dest', goldMod: '인원수만큼', angerMod: '기본', spawnRule: 'LUNCH/이벤트 시', status: 'done' },
  { id: 'cust-baggage', name: '짐꾼', desc: '큰 짐. 정원 2칸 차지', goldMod: '×2', angerMod: '기본', spawnRule: 'MORNING/EVENING', status: 'done' },
  { id: 'cust-shady', name: '의심 인물', desc: '거부하면 보너스, 받으면 anger 가속', goldMod: '거부 시 +20G / 받으면 -10G', angerMod: '받으면 ×2', spawnRule: 'NIGHT 특화', status: 'idea', notes: '거부 메카닉 신규 필요' },
  { id: 'cust-tourist', name: '관광객', desc: '잘못된 층 누름. 가끔 dest 변경', goldMod: '×1.5', angerMod: '기본', spawnRule: '주말 (요일 도입 시)', status: 'done' },
  { id: 'cust-staff', name: '직원', desc: '내부 이동. 골드 X, 처리수만', goldMod: '0G', angerMod: '×0.5', spawnRule: 'WORK 활발', status: 'done' },
  { id: 'cust-thief', name: '도둑', desc: '밤 1F 스폰. 도착 시 골드 -15G 강탈', goldMod: '-15G', angerMod: '×0.3', spawnRule: 'NIGHT 한정, 경비로 차단 가능', status: 'done' },
  { id: 'cust-patient', name: '환자', desc: '느림(정차 +1). 매우 관대', goldMod: '×1.2', angerMod: '×0.4', spawnRule: '병원 테마에서 자주', status: 'done' },
  { id: 'cust-medical', name: '의료진', desc: '빠른 처리 시 큰 보너스 (×2 fast)', goldMod: '×1.3', angerMod: '×0.8', spawnRule: '병원 테마에서 자주', status: 'done' },
  { id: 'cust-hotel-guest', name: '호텔 손님', desc: '캐리어 보유 (정원 2칸)', goldMod: '×1.8', angerMod: '×1', spawnRule: '호텔 테마에서 자주, EVENING/NIGHT', status: 'done' },
  { id: 'cust-crew', name: '승무원', desc: '시간 엄수. 그룹 2명, 빠른 처리 ×2.5', goldMod: '×1.4', angerMod: '×1.5', spawnRule: '공항 테마에서 자주', status: 'done' },
];

// ─────────────────────────────────────────────────────────────
// 5. 랜덤 이벤트 (날짜마다)
// ─────────────────────────────────────────────────────────────
export interface EventEntry extends BaseEntry {
  trigger: string;
  effect: string;
  duration: string;
  severity: 'mild' | 'major' | 'critical';
}

export const EVENTS: EventEntry[] = [
  { id: 'ev-fire-alarm', name: '화재 경보', desc: '전 층 즉시 1F 대피', trigger: '랜덤 day, 5% 확률', effect: '모든 층 큐 → 1F로 이동', duration: '1회', severity: 'major', status: 'done' },
  { id: 'ev-blackout', name: '정전', desc: '엘베 일부 정지', trigger: '랜덤 day, 8% 확률', effect: '랜덤 엘베 1대 30초 정지', duration: '30s', severity: 'major', status: 'done' },
  { id: 'ev-vip-arrival', name: 'VIP 도착', desc: '옥상행 폭주', trigger: 'WORK 시작 시 가끔', effect: 'rooftop dest 가중치 ×5 (1페이즈)', duration: '1 phase', severity: 'mild', status: 'done' },
  { id: 'ev-protest', name: '시위', desc: '1F 마비', trigger: '주말 (요일 도입 시)', effect: 'lobby 콜 무시 (1 phase)', duration: '1 phase', severity: 'major', status: 'done' },
  { id: 'ev-newyear', name: '신년 카운트다운', desc: '옥상 파티', trigger: '특정 day', effect: 'EVENING 모든 dest=rooftop', duration: '1 phase', severity: 'critical', status: 'done' },
  { id: 'ev-lunch-delivery', name: '도시락 일제 배달', desc: '식당 폭주', trigger: 'LUNCH 시작 시 가끔', effect: 'restaurant 가중치 ×4', duration: '1 phase', severity: 'mild', status: 'done' },
  { id: 'ev-elevator-breakdown', name: '엘베 고장', desc: '돌발 고장', trigger: '운행 누적 + 확률', effect: '엘베 1대 정지, 수리 비용 부담', duration: '수리 전까지', severity: 'critical', status: 'idea', notes: 'Step 9 고장 시스템' },
  { id: 'ev-bonus-day', name: '보너스 데이', desc: '오늘 골드 +50%', trigger: '랜덤, 3% 확률', effect: 'gold gain ×1.5', duration: '1 day', severity: 'mild', status: 'done' },
  { id: 'ev-strike', name: '엘리베이터 파업', desc: '모든 엘베 동시 정지', trigger: '극히 드문 day', effect: '30초 모든 엘베 정지', duration: '30s', severity: 'critical', status: 'done' },
  { id: 'ev-mass-evac', name: '대피 훈련', desc: '동시 1F행', trigger: '예고된 day', effect: '시작 시 각 층 큐 +2 (dest=lobby)', duration: '1회', severity: 'major', status: 'done' },
];

// ─────────────────────────────────────────────────────────────
// 요일 개념 — 검토 안
// ─────────────────────────────────────────────────────────────
export interface DayOfWeek {
  short: string;
  name: string;
  weekend: boolean;
  trait: string;
}

export const WEEK_DESIGN: DayOfWeek[] = [
  { short: 'Mon', name: '월요일', weekend: false, trait: '주간 시작. MORNING +10% 트래픽 (월요병)' },
  { short: 'Tue', name: '화요일', weekend: false, trait: '평일 기본' },
  { short: 'Wed', name: '수요일', weekend: false, trait: '평일 기본. 중간 모디파이어 자주 트리거?' },
  { short: 'Thu', name: '목요일', weekend: false, trait: '평일 기본' },
  { short: 'Fri', name: '금요일', weekend: false, trait: 'EVENING 트래픽 폭증 (불금 퇴근)' },
  { short: 'Sat', name: '토요일', weekend: true, trait: '식당/쇼핑/옥상 위주. 사무실 트래픽 격감. 골드 +20%' },
  { short: 'Sun', name: '일요일', weekend: true, trait: '한산함 + 이벤트 확률 ×2 (시위/카운트다운/관광객)' },
];

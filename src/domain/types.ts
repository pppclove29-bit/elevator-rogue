import type { PassengerArchetype } from './archetypes';

export type FloorId = number;
export type PassengerId = number;
export type ElevatorId = number;

export type FloorRole =
  | 'lobby' | 'office' | 'restaurant' | 'rooftop' | 'basement'
  | 'gym' | 'mall' | 'hospital' | 'penthouse' | 'parking' | 'cleanroom';

export type ElevatorState =
  | { kind: 'idle' }
  | { kind: 'moving'; targetFloor: FloorId }
  /**
   * 정차 + 하차/탑승 처리.
   * subPhase: 'alighting' 모든 도착 승객 내림 → 'boarding' 큐 사람들 태움.
   * activeId: 현재 처리 중인 승객 id (null = 다음 사람 픽 단계).
   * remainingTicks: 현재 활성 승객 완료까지 남은 tick.
   * boardableIds: 정차 시점의 큐 스냅샷 — 정차 도중 새로 스폰된 승객은 못 탐.
   */
  | { kind: 'loading'; subPhase: 'alighting' | 'boarding'; activeId: number | null; remainingTicks: number; boardableIds: PassengerId[] }
  | { kind: 'broken' };

export interface Passenger {
  id: PassengerId;
  origin: FloorId;
  dest: FloorId;
  spawnTick: number;
  anger: number;
  archetype: PassengerArchetype;
  /** 이 tick 까지는 "입장 중" (걸어가는 중) — anger 누적 안 함. 빈값 = 즉시 queue 상태. */
  enteringUntilTick?: number;
}

export interface Elevator {
  id: ElevatorId;
  y: number;
  speedPerTick: number;
  capacity: number;
  loadTicks: number;
  state: ElevatorState;
  passengers: Passenger[];
  tripCount: number; // 정차 누적 (고장 트리거용)
}

export interface Floor {
  id: FloorId;
  role: FloorRole;
  queue: Passenger[];
  /** 화장실 보유 층 */
  hasToilet: boolean;
  /** 청결도 0~100 (hasToilet=true인 층만 의미) */
  cleanliness: number;
  /** 오늘 이 층에 도착한(이용한) 손님 수 — day end 결산에 사용 */
  dailyVisits: number;
}

export interface Building {
  floors: Floor[];
  elevators: Elevator[];
}

export interface SimParams {
  baseLoadTicks: number;
  perPassengerLoadTicks: number;
  floorCapacity: number;
  angerWaitingPerTick: number;
  angerRidingPerTick: number;
  angerFloorFullMultiplier: number;
  spawnIntervalMultiplier: number;
  breakdownMultiplier: number;
  globalSpeedMultiplier: number;
  skillCooldownMultiplier: number;
  phaseSpawnMultiplier: Record<'morning' | 'work' | 'lunch' | 'evening' | 'night', number>;
  /** 에스컬레이터: 스폰 시 origin↔dest 거리가 이 값 이하면 엘베 안 거치고 즉시 처리. 0 = 없음 */
  escalatorReach: number;
  /** 지하철: lobby가 origin인 승객을 이 확률로 즉시 흡수 (스폰 스킵). 0~1 */
  subwayAbsorbChance: number;
  /** 헬기: rooftop이 dest인 처리 시 골드 배수 */
  rooftopGoldMultiplier: number;
  /** 도둑 스폰 확률 배수 (경비 효과로 ↓) */
  thiefSpawnMultiplier: number;
  /** 매 tick 화장실 청결도 회복 (청소부 효과) */
  toiletCleanRate: number;
  /** 청결도가 이 값 이하인 화장실 층 큐는 anger 가중 */
  dirtyToiletAngerMultiplier: number;
}

export interface ActiveModifier {
  id: string;
  expiresAtDay: number; // 이 day가 시작되면 만료
}

export const BREAKDOWN_BASE_CHANCE = 0.015;    // 정차 1회당 base (1.5%)
export const BREAKDOWN_GRACE_TRIPS = 20;       // 처음 N회 정차는 무조건 안전
export const REPAIR_COST = 20;

/**
 * 엘리베이터 운영 정책 — v2.
 *
 * 모든 배열이 빈 배열이면 "제약 없음" (전부 허용).
 * - stopFloors: 멈출 층 (다중 선택). 빈 배열 = 모든 층 정차 가능.
 * - pickupArchetypes: 태울 승객 종류. 빈 배열 = 모든 승객.
 * - pickupOnlyFloors: 이 층들에서만 픽업 (드롭은 가능). 빈 배열 = 픽업 층 제한 없음.
 * - dropoffOnlyFloors: 이 층들에선 픽업 X, 드롭만. 빈 배열 = 제약 없음.
 *
 * pickupOnly 와 dropoffOnly 가 충돌하면 dropoff 우선 (안 태움).
 */
export interface ElevatorPolicy {
  stopFloors: number[];
  pickupArchetypes: string[];          // PassengerArchetype 키
  pickupOnlyFloors: number[];
  dropoffOnlyFloors: number[];
}

export function defaultPolicy(): ElevatorPolicy {
  return {
    stopFloors: [],
    pickupArchetypes: [],
    pickupOnlyFloors: [],
    dropoffOnlyFloors: [],
  };
}

/** 옛 정책 (v1) 가 저장된 경우 새 형식으로 마이그레이션. */
export function migratePolicy(raw: any): ElevatorPolicy {
  if (!raw || typeof raw !== 'object') return defaultPolicy();
  // 이미 v2 형식?
  if (Array.isArray(raw.stopFloors)) {
    return {
      stopFloors: raw.stopFloors ?? [],
      pickupArchetypes: raw.pickupArchetypes ?? [],
      pickupOnlyFloors: raw.pickupOnlyFloors ?? [],
      dropoffOnlyFloors: raw.dropoffOnlyFloors ?? [],
    };
  }
  // v1 → v2: 다 기본값 (전체 허용).
  return defaultPolicy();
}

export interface SimState {
  tick: number;
  building: Building;
  params: SimParams;
  nextPassengerId: PassengerId;
  spawnAccumulator: number;
  angryServedCount: number;
  servedCount: number;
  gameOver: boolean;
  lastFiredRuleByElevator: Record<ElevatorId, string | null>;
  dayCompleted: number;
  ownedSkills: string[];
  skillCooldowns: Record<string, number>;
  skillTimers: Record<string, number>;
  policiesByElevator: Record<ElevatorId, ElevatorPolicy>;
  gold: number;
  /** 직전 day end 정산 매출 (HUD/결산 표시용). 0 = 미정산 또는 초기값. */
  lastDayPayout?: number;
  /**
   * 빌딩 평판 (0~100). 초기 50.
   * - 화난 손님 도착 → -2 영구
   * - 만족 손님 도착 → +0.5
   * - 매일 자정 자연 회복 +1
   * - 0 도달 시 게임오버 (기존 "불만 5명 동시" 게임오버 대체)
   * - 20 이하 시 캐스케이드 디버프 발동
   */
  reputation: number;
  /** 캐스케이드 디버프 활성 여부 (평판 20 이하 진입 시 true → 해제 시 false). */
  cascadeActive?: boolean;

  // ─── 아이작 차용 시스템 (Phase 1~4) ─────────────────
  /** 악마 거래 1회 이상 했는지 — 천사방 영구 봉인 조건. */
  hasMadeDevilDeal: boolean;
  devilDealCount: number;
  angelDealCount: number;
  /** 트링킷 (최대 3) — 보유 ID. */
  ownedTrinkets: string[];
  /** 한 번 거절/교체한 트링킷 — 재등장 방지. */
  discardedTrinkets: string[];
  /** 활성 변신 ID 들 (보통 1개, 다중 가능). */
  activeTransformations: string[];
  /** 보스 day 동안 활성 저주. */
  activeCurse: { id: string; expiresAtDay: number } | null;
  /** 남은 부활 횟수 (Lazarus). */
  revivesRemaining: number;
  /** 이번 런에서 이미 부활 한 적 있음 (페널티 누적 방지). */
  hasBeenRevivedOnce: boolean;
  /** 글래스 캐논으로 파괴된 렐릭 — 재획득 방지. */
  brokenRelics: string[];

  repairKits: number;
  activeModifiers: ActiveModifier[];
  ownedRelics: string[];
  shopOfferIds: string[];        // 이번 상점에 등장할 카드 id (upgrade/skill만, 수리는 고장 시 자동 추가)
  shopRerollCount: number;       // 이번 상점에서 리롤 횟수 (비용 점증)
  /** 이번 상점의 트링킷 슬롯 id (1개). null = 풀이 비었거나 등장 X. */
  shopTrinketId?: string | null;
  /** 이번 상점의 미스터리 박스 표시 여부 (Day ≥ 3 부터 등장, 1회 한정). */
  shopMysteryAvailable?: boolean;
  visualHints: VisualHint[];     // 시각 신호 큐 (렌더가 매 frame 소비)
}

/** 도메인 → 렌더로 보내는 일회성 시각 신호 (sprite 시스템에 hint) */
export type VisualHint =
  | { kind: 'escalator'; originFloorId: number; destFloorId: number; archetype: import('./archetypes').PassengerArchetype }
  | { kind: 'subway'; floorId: number; archetype: import('./archetypes').PassengerArchetype }
  | { kind: 'pathEvent'; floorId: number; passengerId: number; text: string; color: number };

export const SHOP_OFFER_SIZE = 4;
export const SHOP_REROLL_BASE_COST = 8;
export const SHOP_REROLL_COST_GROWTH = 4;  // 리롤할 때마다 +N G

// 층 역할별 매출 단가 — data/floors.json 의 goldPerVisit 에서 로드.
import floorData from '../../data/floors.json';
export const GOLD_PER_ROLE: Record<FloorRole, number> = Object.fromEntries(
  Object.entries(floorData as Record<string, { goldPerVisit: number }>).map(([role, spec]) => [role, spec.goldPerVisit]),
) as Record<FloorRole, number>;

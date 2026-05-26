import type { PassengerArchetype } from './archetypes';
import type { ActionBlockId, ConditionBlockId } from './rules/blocks';
import type { RuleInSlot } from './rules/types';

export type FloorId = number;
export type PassengerId = number;
export type ElevatorId = number;

export type FloorRole = 'lobby' | 'office' | 'restaurant' | 'rooftop' | 'basement';

export type ElevatorState =
  | { kind: 'idle' }
  | { kind: 'moving'; targetFloor: FloorId }
  | { kind: 'loading'; remainingTicks: number }
  | { kind: 'broken' };

export interface Passenger {
  id: PassengerId;
  origin: FloorId;
  dest: FloorId;
  spawnTick: number;
  anger: number;
  archetype: PassengerArchetype;
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

export const MAX_SLOTS_PER_ELEVATOR = 5;

export type PolicyParity = 'all' | 'even' | 'odd';
export type PolicyPickup = 'any' | 'lobby-only' | 'role';

export interface ElevatorPolicy {
  minFloor: number;
  maxFloor: number;      // -1 = 무제한
  parity: PolicyParity;
  pickupMode: PolicyPickup;
  pickupRole?: FloorRole;          // pickupMode='role' 일 때
  prioritizeUnloadWhenFull: boolean;
}

export function defaultPolicy(): ElevatorPolicy {
  return {
    minFloor: 0,
    maxFloor: -1,
    parity: 'all',
    pickupMode: 'any',
    prioritizeUnloadWhenFull: true,
  };
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
  slotsByElevator: Record<ElevatorId, RuleInSlot[]>; // 레거시 (정책 시스템으로 대체)
  ownedConditions: ConditionBlockId[];
  ownedActions: ActionBlockId[];
  policiesByElevator: Record<ElevatorId, ElevatorPolicy>;
  gold: number;
  repairKits: number;
  activeModifiers: ActiveModifier[];
  ownedRelics: string[];
  shopOfferIds: string[];        // 이번 상점에 등장할 카드 id (upgrade/skill만, 수리는 고장 시 자동 추가)
  shopRerollCount: number;       // 이번 상점에서 리롤 횟수 (비용 점증)
  visualHints: VisualHint[];     // 시각 신호 큐 (렌더가 매 frame 소비)
}

/** 도메인 → 렌더로 보내는 일회성 시각 신호 (sprite 시스템에 hint) */
export type VisualHint =
  | { kind: 'escalator'; originFloorId: number; destFloorId: number; archetype: import('./archetypes').PassengerArchetype }
  | { kind: 'subway'; floorId: number; archetype: import('./archetypes').PassengerArchetype };

export const SHOP_OFFER_SIZE = 4;
export const SHOP_REROLL_BASE_COST = 8;
export const SHOP_REROLL_COST_GROWTH = 4;  // 리롤할 때마다 +N G

export const GOLD_PER_ROLE: Record<FloorRole, number> = {
  lobby: 1,
  office: 2,
  restaurant: 3,
  rooftop: 5,
  basement: 1,
};

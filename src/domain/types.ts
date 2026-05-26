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
}

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

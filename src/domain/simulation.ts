import { ARCHETYPES, spaceUsed, THIEF_GOLD_DAMAGE } from './archetypes';
import { createBuilding, nearestFloor } from './building';
import { tickPassengerEvents } from './passengerEvents';
import { DAY_OF_WEEK_GOLD_MUL, dayLengthTicks, dayOfWeekFor, phaseAtTick, Phase } from './phase';
import { decide } from './policy';
import { Rng, mulberry32 } from './rng';
import { maybeSpawn } from './spawner';
import { BREAKDOWN_BASE_CHANCE, BREAKDOWN_GRACE_TRIPS, defaultPolicy, Elevator, GOLD_PER_ROLE, Passenger, REPAIR_COST, SimParams, SimState } from './types';

export interface SimConfig {
  floorCount: number;
  elevatorCount: number;
  seed: number;
}

export function defaultParams(): SimParams {
  return {
    baseLoadTicks: 5,
    perPassengerLoadTicks: 2,
    floorCapacity: 10,
    angerWaitingPerTick: 0.25,
    angerRidingPerTick: 0.08,
    angerFloorFullMultiplier: 2,
    spawnIntervalMultiplier: 1,
    breakdownMultiplier: 1,
    globalSpeedMultiplier: 1,
    skillCooldownMultiplier: 1,
    phaseSpawnMultiplier: { morning: 1, work: 1, lunch: 1, evening: 1, night: 1 },
    escalatorReach: 0,
    subwayAbsorbChance: 0,
    rooftopGoldMultiplier: 1,
    thiefSpawnMultiplier: 1,
    toiletCleanRate: 0,
    dirtyToiletAngerMultiplier: 1.5,
  };
}

export function createSim(cfg: SimConfig): { state: SimState; rng: Rng } {
  const building = createBuilding(cfg.floorCount, cfg.elevatorCount);
  const policiesByElevator: Record<number, ReturnType<typeof defaultPolicy>> = {};
  for (const e of building.elevators) {
    policiesByElevator[e.id] = defaultPolicy();
  }

  return {
    state: {
      tick: 0,
      building,
      params: defaultParams(),
      nextPassengerId: 1,
      spawnAccumulator: 0,
      angryServedCount: 0,
      servedCount: 0,
      gameOver: false,
      lastFiredRuleByElevator: {},
      dayCompleted: 0,
      ownedSkills: [],
      skillCooldowns: {},
      skillTimers: {},
      policiesByElevator,
      gold: 20,
      repairKits: 0,
      activeModifiers: [],
      ownedRelics: [],
      shopOfferIds: [],
      shopRerollCount: 0,
      visualHints: [],
    },
    rng: mulberry32(cfg.seed),
  };
}

export const GAME_OVER_ACTIVE_ANGRY = 5;
export const ANGER_THRESHOLD = 180;

/** 청결도 시스템 활성 페이즈. 점심 이후(lunch/evening/night)만 적용. 출근/근무 시간은 100 유지. */
function cleanlinessActive(phase: Phase): boolean {
  return phase === 'lunch' || phase === 'evening' || phase === 'night';
}

export function tick(state: SimState, rng: Rng): void {
  if (state.gameOver) return;

  state.tick += 1;
  decayCooldownsAndTimers(state);
  maybeSpawn(state, rng);

  for (const elevator of state.building.elevators) {
    stepElevator(state, elevator, rng);
  }

  tickPassengerEvents(state, rng);
  accumulateAnger(state);
  checkDayCompletion(state);
  checkGameOver(state);
}

function decayCooldownsAndTimers(state: SimState): void {
  for (const id of Object.keys(state.skillCooldowns)) {
    const v = state.skillCooldowns[id]!;
    if (v > 0) state.skillCooldowns[id] = v - 1;
  }
  for (const id of Object.keys(state.skillTimers)) {
    const v = state.skillTimers[id]!;
    if (v > 0) {
      const next = v - 1;
      state.skillTimers[id] = next;
      if (next === 0) onTimerEnd(state, id);
    }
  }
}

function onTimerEnd(state: SimState, id: string): void {
  if (id === 'skill-slow-spawn') state.params.spawnIntervalMultiplier = 1;
}

export function countActiveAngry(state: SimState): number {
  let n = 0;
  for (const floor of state.building.floors) {
    for (const p of floor.queue) if (p.anger >= ANGER_THRESHOLD) n += 1;
  }
  for (const e of state.building.elevators) {
    for (const p of e.passengers) if (p.anger >= ANGER_THRESHOLD) n += 1;
  }
  return n;
}

function checkGameOver(state: SimState): void {
  if (countActiveAngry(state) >= GAME_OVER_ACTIVE_ANGRY) state.gameOver = true;
}

function checkDayCompletion(state: SimState): void {
  const completed = Math.floor(state.tick / dayLengthTicks());
  if (completed > state.dayCompleted) {
    state.dayCompleted = completed;
    // 하루 종료 — 층별 이용자 수 × 역할 단가로 매출 정산 후 dailyVisits 초기화.
    payoutDayEnd(state);
  }
}

/** 하루 종료 시 정산 — 층별 dailyVisits × GOLD_PER_ROLE 합산하여 골드 지급, visits 리셋. */
function payoutDayEnd(state: SimState): void {
  const dow = dayOfWeekFor(state.dayCompleted);
  const dowGold = DAY_OF_WEEK_GOLD_MUL[dow];
  let total = 0;
  for (const f of state.building.floors) {
    if (f.dailyVisits <= 0) continue;
    const baseRate = GOLD_PER_ROLE[f.role] ?? 0;
    const heliBonus = f.role === 'rooftop' ? state.params.rooftopGoldMultiplier : 1;
    total += Math.round(f.dailyVisits * baseRate * heliBonus * dowGold);
    f.dailyVisits = 0;
  }
  state.gold += total;
  state.lastDayPayout = total;
}

function stepElevator(state: SimState, e: Elevator, rng: Rng): void {
  if (e.state.kind === 'broken') return;

  if (e.state.kind === 'loading') {
    e.state.remainingTicks -= 1;
    if (e.state.remainingTicks <= 0) {
      e.state = { kind: 'idle' };
      e.tripCount += 1;
      if (maybeBreakdown(state, e, rng)) return;
    }
    return;
  }

  if (e.state.kind === 'moving') {
    const target = e.state.targetFloor;
    const dy = target - e.y;
    const effSpeed = e.speedPerTick * state.params.globalSpeedMultiplier;
    if (Math.abs(dy) <= effSpeed) {
      e.y = target;
      const arrived = nearestFloor(e.y);
      const r = doLoadUnload(state, e, arrived);
      const ticks = state.params.baseLoadTicks + state.params.perPassengerLoadTicks * r.moved + r.bonusTicks;
      e.state = { kind: 'loading', remainingTicks: ticks };
    } else {
      e.y += Math.sign(dy) * effSpeed;
    }
    return;
  }

  const policy = state.policiesByElevator[e.id] ?? defaultPolicy();
  const prev = state.lastFiredRuleByElevator[e.id] ?? null;
  const decision = decide(state, e, policy);
  state.lastFiredRuleByElevator[e.id] = decision.reason;
  if (prev !== decision.reason) {
    console.log(`[t=${state.tick} E${e.id}] policy: ${prev ?? '-'} -> ${decision.reason}`);
  }

  if (decision.intent.kind === 'goTo') {
    const target = decision.intent.target;
    if (target === nearestFloor(e.y) && Math.abs(e.y - target) < 0.0001) {
      const r = doLoadUnload(state, e, target);
      const ticks = state.params.baseLoadTicks + state.params.perPassengerLoadTicks * r.moved + r.bonusTicks;
      e.state = { kind: 'loading', remainingTicks: ticks };
    } else {
      e.state = { kind: 'moving', targetFloor: target };
    }
  }
}

/** 정차 시 추가 load tick (archetype의 loadTickBonus 합산) */
function doLoadUnload(state: SimState, e: Elevator, floorId: number): { moved: number; bonusTicks: number } {
  let moved = 0;
  let bonusTicks = 0;
  const destFloor = state.building.floors[floorId];
  const remaining: Passenger[] = [];
  for (const p of e.passengers) {
    if (p.dest === floorId) {
      state.servedCount += 1;
      const spec = ARCHETYPES[p.archetype];
      // 도둑 도착 = 골드 강탈 (즉시. 도착 단위 효과는 도둑만 유지)
      if (p.archetype === 'thief') {
        const dmg = Math.min(state.gold, THIEF_GOLD_DAMAGE);
        state.gold -= dmg;
        console.log(`[t=${state.tick}] 도둑 도착! 골드 -${dmg}G`);
      } else if (p.anger >= ANGER_THRESHOLD) {
        state.angryServedCount += 1;
      } else if (destFloor) {
        // 일반 손님 = 도착 층의 dailyVisits 증가. 골드는 day end 결산 시 일괄 지급.
        destFloor.dailyVisits += 1;
      }
      // 화장실 보유 층 dest 도착 시 청결도 감소 — 점심 이후만.
      if (destFloor?.hasToilet && cleanlinessActive(phaseAtTick(state.tick).phase)) {
        destFloor.cleanliness = Math.max(0, destFloor.cleanliness - 4);
      }
      bonusTicks += spec.loadTickBonus;
      moved += 1;
    } else {
      remaining.push(p);
    }
  }
  e.passengers = remaining;

  const floor = state.building.floors[floorId];
  if (!floor) return { moved, bonusTicks };

  const stillWaiting: Passenger[] = [];
  for (const p of floor.queue) {
    const spec = ARCHETYPES[p.archetype];
    if (spaceUsed(e.passengers) + spec.spaceCost <= e.capacity) {
      e.passengers.push(p);
      bonusTicks += spec.loadTickBonus;
      moved += 1;
    } else {
      stillWaiting.push(p);
    }
  }
  floor.queue = stillWaiting;
  return { moved, bonusTicks };
}

function maybeBreakdown(state: SimState, e: Elevator, rng: Rng): boolean {
  // 엘베 1대만 있을 땐 고장 X (필수 보호 — 풀이 불가능 상황 방지)
  if (state.building.elevators.length < 2) return false;
  if (e.tripCount < BREAKDOWN_GRACE_TRIPS) return false;
  const chance = BREAKDOWN_BASE_CHANCE * state.params.breakdownMultiplier;
  if (rng() >= chance) return false;
  if (state.repairKits > 0) {
    state.repairKits -= 1;
    e.tripCount = 0;
    return false;
  }
  e.state = { kind: 'broken' };
  console.log(`[t=${state.tick}] elevator E${e.id} BROKEN (repair available in shop)`);
  return true;
}

export function repairElevator(state: SimState, eId: number): boolean {
  const e = state.building.elevators[eId];
  if (!e) return false;
  if (e.state.kind !== 'broken') return false;
  if (state.gold < REPAIR_COST) return false;
  state.gold -= REPAIR_COST;
  e.state = { kind: 'idle' };
  e.tripCount = 0;
  return true;
}

function accumulateAnger(state: SimState): void {
  const phase = phaseAtTick(state.tick).phase;
  const cleanActive = cleanlinessActive(phase);
  for (const floor of state.building.floors) {
    // 청소부 효과: 매 tick 청결도 회복
    if (floor.hasToilet && state.params.toiletCleanRate > 0) {
      floor.cleanliness = Math.min(100, floor.cleanliness + state.params.toiletCleanRate);
    }
    const full = floor.queue.length >= state.params.floorCapacity;
    const fullMult = full ? state.params.angerFloorFullMultiplier : 1;
    // 더러운 화장실 가중 — 점심 이후만 (출근/근무 시간엔 영향 없음)
    const dirty = cleanActive && floor.hasToilet && floor.cleanliness < 30;
    const dirtyMult = dirty ? state.params.dirtyToiletAngerMultiplier : 1;
    for (const p of floor.queue) {
      const spec = ARCHETYPES[p.archetype];
      p.anger += state.params.angerWaitingPerTick * fullMult * dirtyMult * spec.angerMultiplier;
    }
  }
  for (const e of state.building.elevators) {
    for (const p of e.passengers) {
      const spec = ARCHETYPES[p.archetype];
      p.anger += state.params.angerRidingPerTick * spec.angerMultiplier;
    }
  }
}

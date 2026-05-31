import { ARCHETYPES, spaceUsed, THIEF_GOLD_DAMAGE } from './archetypes';
import { createBuilding, nearestFloor } from './building';
import { tickPassengerEvents } from './passengerEvents';
import { DAY_OF_WEEK_GOLD_MUL, dayLengthTicks, dayOfWeekFor, phaseAtTick, Phase } from './phase';
import { decide } from './policy';
import { Rng, mulberry32 } from './rng';
import { maybeSpawn } from './spawner';
import { BREAKDOWN_BASE_CHANCE, BREAKDOWN_GRACE_TRIPS, defaultPolicy, Elevator, ElevatorState, GOLD_PER_ROLE, Passenger, REPAIR_COST, SimParams, SimState } from './types';

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
      reputation: REPUTATION_INITIAL,
      hasMadeDevilDeal: false,
      devilDealCount: 0,
      angelDealCount: 0,
      ownedTrinkets: [],
      discardedTrinkets: [],
      activeTransformations: [],
      activeCurse: null,
      revivesRemaining: 0,
      hasBeenRevivedOnce: false,
      brokenRelics: [],
    },
    rng: mulberry32(cfg.seed),
  };
}

/** 옛 게임오버 임계 — 평판 시스템 도입 후 사용 안 함 (호환성 위해 export 만 유지). */
export const GAME_OVER_ACTIVE_ANGRY = 5;
export const ANGER_THRESHOLD = 180;

// ─── 평판 시스템 (위기/허무함 모델) ─────────────────────────
export const REPUTATION_INITIAL = 50;
export const REPUTATION_MAX = 100;
export const REPUTATION_MIN = 0;
/** 화난 손님 도착 1명당 감소 폭. */
export const REPUTATION_LOSS_PER_ANGRY = 2;
/** 만족 손님 도착 1명당 회복 폭. */
export const REPUTATION_GAIN_PER_SATISFIED = 0.5;
/** 매일 자정 자연 회복 (저속 — 캐스케이드 탈출 거의 불가능 의도). */
export const REPUTATION_DAILY_REGEN = 1;
/** 이 값 이하 진입 시 캐스케이드 디버프 발동. */
export const REPUTATION_CASCADE_THRESHOLD = 20;

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
  // 평판 0 도달 = 게임오버. 옛 "불만 5명 동시" 조건은 제거.
  if (state.reputation <= REPUTATION_MIN) {
    // ─ Lazarus 부활 hook ─
    if (state.revivesRemaining > 0) {
      reviveOnce(state);
      return;
    }
    state.gameOver = true;
  }
}

/** Lazarus — 평판 0 도달 시 1회 부활. 평판 25 회복 + 페널티. */
function reviveOnce(state: SimState): void {
  state.revivesRemaining -= 1;
  state.hasBeenRevivedOnce = true;
  state.reputation = 25;
  state.gold = 0;
  // 회복률 -50% — REPUTATION_DAILY_REGEN 은 const 이므로 직접 수정 불가.
  // 대신 params 통해 회복 절반화 (별도 필드 추가 X, regen 시점에 체크).
  state.params.thiefSpawnMultiplier *= 2;
  // 트링킷 1개 무작위 파괴 (페널티)
  if (state.ownedTrinkets.length > 0) {
    const idx = Math.floor(Math.random() * state.ownedTrinkets.length);
    const broken = state.ownedTrinkets.splice(idx, 1)[0];
    if (broken) state.discardedTrinkets.push(broken);
  }
  if (state.cascadeActive) checkCascade(state);   // 평판 25 회복 → 캐스케이드 해제
  console.log(`[t=${state.tick}] LAZARUS REVIVE — rep=25, gold=0, thief×2, 1 trinket destroyed`);
}

/** 평판 안전하게 변경 — clamp + cascade 진입/탈출 자동 체크. */
export function adjustReputation(state: SimState, delta: number): void {
  state.reputation = Math.max(REPUTATION_MIN, Math.min(REPUTATION_MAX, state.reputation + delta));
  checkCascade(state);
}

// ─── 캐스케이드 디버프 (평판 ≤ 20 진입 시) ───────────────────
// 효과: 스폰 +30%, anger ×1.5, 고장 ×2, 도둑 ×3.
// 회복(평판 > 20)시 자동 해제.
const CASCADE_SPAWN_INV = 0.77;           // spawnIntervalMultiplier × 0.77 (간격↓ = 더 자주)
const CASCADE_ANGER = 1.5;
const CASCADE_BREAKDOWN = 2;
const CASCADE_THIEF = 3;

function checkCascade(state: SimState): void {
  const should = state.reputation <= REPUTATION_CASCADE_THRESHOLD;
  const isActive = state.cascadeActive ?? false;
  if (should && !isActive) {
    // 진입
    state.params.spawnIntervalMultiplier *= CASCADE_SPAWN_INV;
    state.params.angerWaitingPerTick *= CASCADE_ANGER;
    state.params.angerRidingPerTick *= CASCADE_ANGER;
    state.params.breakdownMultiplier *= CASCADE_BREAKDOWN;
    state.params.thiefSpawnMultiplier *= CASCADE_THIEF;
    state.cascadeActive = true;
    (state as any).cascadeEnterCount = ((state as any).cascadeEnterCount ?? 0) + 1;
    console.log(`[t=${state.tick}] CASCADE ENTERED (rep=${state.reputation.toFixed(1)})`);
  } else if (!should && isActive) {
    // 탈출 — 역연산
    state.params.spawnIntervalMultiplier /= CASCADE_SPAWN_INV;
    state.params.angerWaitingPerTick /= CASCADE_ANGER;
    state.params.angerRidingPerTick /= CASCADE_ANGER;
    state.params.breakdownMultiplier /= CASCADE_BREAKDOWN;
    state.params.thiefSpawnMultiplier /= CASCADE_THIEF;
    state.cascadeActive = false;
    console.log(`[t=${state.tick}] CASCADE EXITED (rep=${state.reputation.toFixed(1)})`);
  }
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
  // 저주/거래 골드 배수 적용
  const curseGoldMul = (state as any).curseGoldMul ?? 1;
  const dealGoldMul = (state as any).dealGoldMultiplier ?? 1;
  let total = 0;
  for (const f of state.building.floors) {
    if (f.dailyVisits <= 0) continue;
    const baseRate = GOLD_PER_ROLE[f.role] ?? 0;
    const heliBonus = f.role === 'rooftop' ? state.params.rooftopGoldMultiplier : 1;
    total += Math.round(f.dailyVisits * baseRate * heliBonus * dowGold * curseGoldMul * dealGoldMul);
    f.dailyVisits = 0;
  }
  state.gold += total;
  state.lastDayPayout = total;
  // 매일 자정 골드 드레인 (d-rich-glutton 등) 적용
  const drain = (state as any).dailyGoldDrain ?? 0;
  if (drain > 0) state.gold = Math.max(0, state.gold - drain);
  // 자정 — 평판 자연 회복 (저속, 캐스케이드 탈출 매우 어렵게 의도)
  // — repRegenBlocked (d-night-pact) 면 회복 0
  if (!(state as any).repRegenBlocked) {
    const bonus = (state as any).dailyRegenBonus ?? 0;
    adjustReputation(state, REPUTATION_DAILY_REGEN + bonus);
  }
  // 저주 데일리 평판 손실 (c-misfortune)
  const repDrain = (state as any).curseDailyRepDrain ?? 0;
  if (repDrain > 0) adjustReputation(state, -repDrain);
}

function stepElevator(state: SimState, e: Elevator, rng: Rng): void {
  if (e.state.kind === 'broken') return;

  if (e.state.kind === 'loading') {
    loadStep(state, e);
    // loadStep 이 mutate 했을 수 있음. idle 로 전환됐으면 고장 체크.
    const after = (e.state as ElevatorState).kind;
    if (after === 'idle' && maybeBreakdown(state, e, rng)) return;
    return;
  }

  if (e.state.kind === 'moving') {
    const target = e.state.targetFloor;
    const dy = target - e.y;
    const effSpeed = e.speedPerTick * state.params.globalSpeedMultiplier;
    if (Math.abs(dy) <= effSpeed) {
      e.y = target;
      enterLoadingState(state, e);
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
      enterLoadingState(state, e);
    } else {
      e.state = { kind: 'moving', targetFloor: target };
    }
  }
}

/** 도착 시점 — 현재 큐 스냅샷 (정차 도중 스폰된 손님은 못 탐). */
function enterLoadingState(state: SimState, e: Elevator): void {
  const floorId = nearestFloor(e.y);
  const floor = state.building.floors[floorId];
  const boardableIds = floor ? floor.queue.map((p) => p.id) : [];
  e.state = {
    kind: 'loading',
    subPhase: 'alighting',
    activeId: null,
    remainingTicks: 0,
    boardableIds,
  };
}

/** 매 tick 호출 — 순차 하차/탑승 진행. */
function loadStep(state: SimState, e: Elevator): void {
  if (e.state.kind !== 'loading') return;
  const s = e.state;
  const floorId = nearestFloor(e.y);
  const floor = state.building.floors[floorId];
  if (!floor) { e.state = { kind: 'idle' }; e.tripCount += 1; return; }

  // 1. 활성 승객 있으면 시간 tick down
  if (s.activeId !== null) {
    s.remainingTicks -= 1;
    if (s.remainingTicks > 0) return;
    // 완료 — finalize
    if (s.subPhase === 'alighting') finalizeAlight(state, e, floor, s.activeId);
    else finalizeBoard(e, floor, s.activeId);
    s.activeId = null;
    // 같은 tick 안에 다음 사람 픽 — 그래야 시간 낭비 안 됨
  }

  // 2. 다음 활성 승객 픽
  if (s.subPhase === 'alighting') {
    const next = e.passengers.find((p) => p.dest === floorId);
    if (next) {
      s.activeId = next.id;
      s.remainingTicks = perPassengerTicks(state, next.archetype);
      return;
    }
    // 모두 하차 완료 → 탑승 페이즈
    s.subPhase = 'boarding';
  }

  if (s.subPhase === 'boarding') {
    const next = findBoardable(state, e, floor, s.boardableIds);
    if (next) {
      s.activeId = next.id;
      s.remainingTicks = perPassengerTicks(state, next.archetype);
      return;
    }
    // 더 태울 사람 없음 → 정차 종료
    e.state = { kind: 'idle' };
    e.tripCount += 1;
  }
}

function perPassengerTicks(state: SimState, archetype: string): number {
  const spec = ARCHETYPES[archetype as keyof typeof ARCHETYPES];
  const bonus = spec?.loadTickBonus ?? 0;
  // baseLoadTicks 를 1인당 시간으로 재해석. 기본 5 + 보너스. archetype 따라 차이.
  return Math.max(2, Math.round(state.params.perPassengerLoadTicks + 3 + bonus * 2));
}

/** 하차 완료 — e.passengers 에서 제거 + 카운트. */
function finalizeAlight(state: SimState, e: Elevator, floor: { id: number; role: any; dailyVisits: number; hasToilet: boolean; cleanliness: number }, passengerId: number): void {
  const idx = e.passengers.findIndex((p) => p.id === passengerId);
  if (idx < 0) return;
  const p = e.passengers[idx]!;
  e.passengers.splice(idx, 1);
  state.servedCount += 1;
  if (p.archetype === 'thief') {
    const dmg = Math.min(state.gold, THIEF_GOLD_DAMAGE);
    state.gold -= dmg;
    console.log(`[t=${state.tick}] 도둑 도착! 골드 -${dmg}G`);
  } else if (p.anger >= ANGER_THRESHOLD) {
    state.angryServedCount += 1;
    // 화난 손님 도착 → 평판 영구 손실
    adjustReputation(state, -REPUTATION_LOSS_PER_ANGRY);
  } else {
    floor.dailyVisits += 1;
    // 만족 손님 도착 → 평판 회복
    adjustReputation(state, REPUTATION_GAIN_PER_SATISFIED);
  }
  if (floor.hasToilet && cleanlinessActive(phaseAtTick(state.tick).phase)) {
    floor.cleanliness = Math.max(0, floor.cleanliness - 4);
  }
}

/** 탑승 완료 — floor.queue 에서 제거 + e.passengers 추가. */
function finalizeBoard(e: Elevator, floor: { queue: Passenger[] }, passengerId: number): void {
  const idx = floor.queue.findIndex((p) => p.id === passengerId);
  if (idx < 0) return;
  const p = floor.queue[idx]!;
  floor.queue.splice(idx, 1);
  e.passengers.push(p);
}

/** 다음 탑승 가능 승객 — boardableIds 안에 있는 사람 중 정책/정원 OK인 첫번째. */
function findBoardable(state: SimState, e: Elevator, floor: { id: number; queue: Passenger[] }, boardableIds: number[]): Passenger | null {
  const policy = state.policiesByElevator[e.id];
  const dropoffOnly = policy?.dropoffOnlyFloors.includes(floor.id) ?? false;
  if (dropoffOnly) return null;
  const pickupOnlyRestrict = (policy?.pickupOnlyFloors.length ?? 0) > 0;
  const pickupOnlyOk = !pickupOnlyRestrict || (policy!.pickupOnlyFloors.includes(floor.id));
  if (!pickupOnlyOk) return null;
  const archetypeOk = (a: string): boolean =>
    !policy || policy.pickupArchetypes.length === 0 || policy.pickupArchetypes.includes(a);

  for (const p of floor.queue) {
    if (!boardableIds.includes(p.id)) continue;
    if (!archetypeOk(p.archetype)) continue;
    const spec = ARCHETYPES[p.archetype];
    if (spaceUsed(e.passengers) + spec.spaceCost > e.capacity) continue;
    return p;
  }
  return null;
}

// doLoadUnload 는 순차 loadStep 으로 대체됨 (위 finalizeAlight/finalizeBoard).

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
      // 입장 중 (걸어가는 중) 인 손님은 anger 누적 X — 줄에 도착해야 시작.
      if (p.enteringUntilTick !== undefined && state.tick < p.enteringUntilTick) continue;
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

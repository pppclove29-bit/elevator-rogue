import { ARCHETYPES, PassengerArchetype } from './archetypes';
import { PHASE_SPAWN_INTERVAL, PHASE_TRAFFIC, phaseAtTick, RoleWeights } from './phase';
import { Rng, pickWeighted } from './rng';
import { Floor, FloorRole, Passenger, SimState } from './types';

export function maybeSpawn(state: SimState, rng: Rng): void {
  const info = phaseAtTick(state.tick);
  const interval = Math.max(
    2,
    Math.round(
      PHASE_SPAWN_INTERVAL[info.phase]
        * state.params.spawnIntervalMultiplier
        * (state.params.phaseSpawnMultiplier[info.phase] ?? 1),
    ),
  );

  state.spawnAccumulator += 1;
  if (state.spawnAccumulator < interval) return;
  state.spawnAccumulator = 0;

  const floors = state.building.floors;
  if (floors.length < 2) return;

  const traffic = PHASE_TRAFFIC[info.phase];
  const originFloor = pickFloorByRole(rng, floors, traffic.origin);
  if (!originFloor) return;
  const destFloor = pickFloorByRole(rng, floors, traffic.dest, originFloor.id);
  if (!destFloor) return;

  const archetype = pickArchetype(rng, info.phase);
  const spec = ARCHETYPES[archetype];
  const count = spec.groupSize;

  // 지하철: 로비 origin인 승객을 확률적으로 즉시 흡수 (도착 처리, 큐 안 들어감)
  if (originFloor.role === 'lobby' && state.params.subwayAbsorbChance > 0
      && rng() < state.params.subwayAbsorbChance) {
    state.servedCount += count;
    return;
  }

  // 에스컬레이터: 짧은 거리 이동은 엘베 안 거치고 즉시 처리
  const dist = Math.abs(destFloor.id - originFloor.id);
  if (state.params.escalatorReach > 0 && dist <= state.params.escalatorReach) {
    state.servedCount += count;
    return;
  }

  for (let i = 0; i < count; i++) {
    const p: Passenger = {
      id: state.nextPassengerId++,
      origin: originFloor.id,
      dest: destFloor.id,
      spawnTick: state.tick,
      anger: 0,
      archetype,
    };
    originFloor.queue.push(p);
  }
}

function pickArchetype(rng: Rng, phase: ReturnType<typeof phaseAtTick>['phase']): PassengerArchetype {
  const ids: PassengerArchetype[] = [];
  const weights: number[] = [];
  for (const spec of Object.values(ARCHETYPES)) {
    const w = spec.weightByPhase[phase] ?? 0;
    if (w <= 0) continue;
    ids.push(spec.id);
    weights.push(w);
  }
  if (ids.length === 0) return 'normal';
  return pickWeighted(rng, ids, weights);
}

function pickFloorByRole(
  rng: Rng,
  floors: Floor[],
  weights: RoleWeights,
  excludeFloorId?: number,
): Floor | null {
  const candidates: Floor[] = [];
  const wOut: number[] = [];
  for (const f of floors) {
    if (f.id === excludeFloorId) continue;
    const w = weights[f.role] ?? 0;
    if (w <= 0) continue;
    candidates.push(f);
    wOut.push(w);
  }
  if (candidates.length === 0) {
    const fallback: Floor[] = [];
    for (const f of floors) if (f.id !== excludeFloorId) fallback.push(f);
    if (fallback.length === 0) return null;
    const idx = Math.floor(rng() * fallback.length);
    return fallback[idx] ?? null;
  }
  return pickWeighted(rng, candidates, wOut);
}

export const ROLE_COLOR: Record<FloorRole, number> = {
  lobby: 0x6ec6ff,
  office: 0xb0b0c0,
  restaurant: 0xf5c542,
  rooftop: 0x7ed957,
  basement: 0x8a6cff,
};

export const ROLE_SHORT: Record<FloorRole, string> = {
  lobby: 'LB',
  office: 'OF',
  restaurant: 'RT',
  rooftop: 'RF',
  basement: 'BS',
};

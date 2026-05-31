import { nearestFloor } from './building';
import { ElevatorPolicy, Elevator, FloorId, SimState } from './types';

export type Intent = { kind: 'goTo'; target: FloorId } | { kind: 'stay' };

export interface Decision {
  intent: Intent;
  reason: string;
}

/**
 * 정책 v2 기반 의사결정.
 *
 * 멈출 수 있는 층 = (stopFloors 가 비어있으면 모든 층) 그리고 dropoffOnly 가 있어도 거기 멈춤.
 * 픽업 가능 층 = 멈출 수 있는 층 ∩ (pickupOnlyFloors 비어있으면 전부, 아니면 그 안에서만) − dropoffOnlyFloors.
 * 픽업 가능 승객 = pickupArchetypes 비어있으면 전부, 아니면 매칭만.
 */
export function decide(state: SimState, e: Elevator, policy: ElevatorPolicy): Decision {
  const here = nearestFloor(e.y);
  const floors = state.building.floors;
  const N = floors.length;

  const canStopAt = (id: FloorId): boolean => {
    if (id < 0 || id >= N) return false;
    if (policy.stopFloors.length === 0) return true;
    return policy.stopFloors.includes(id);
  };
  const canPickupAt = (id: FloorId): boolean => {
    if (!canStopAt(id)) return false;
    if (policy.dropoffOnlyFloors.includes(id)) return false;
    if (policy.pickupOnlyFloors.length > 0 && !policy.pickupOnlyFloors.includes(id)) return false;
    return true;
  };
  const archetypeOk = (archetype: string): boolean => {
    if (policy.pickupArchetypes.length === 0) return true;
    return policy.pickupArchetypes.includes(archetype);
  };

  // 1. 탑승객 있으면 가장 가까운 dest 로 (멈출 수 있는 층이 아니어도 강제 정차 — 이미 태웠으니)
  if (e.passengers.length > 0) {
    const dests = e.passengers.map((p) => p.dest);
    const t = nearestOf(dests, here);
    if (t !== null) return { intent: { kind: 'goTo', target: t }, reason: 'unload-nearest' };
  }

  // 2. 픽업 — 큐가 있고 매칭되는 승객 있는 층 중 가장 가까운 곳
  const pickable: FloorId[] = [];
  for (const f of floors) {
    if (f.queue.length === 0) continue;
    if (!canPickupAt(f.id)) continue;
    // 픽업 가능 archetype 한 명이라도 있는지
    if (!f.queue.some((p) => archetypeOk(p.archetype))) continue;
    pickable.push(f.id);
  }
  const target = nearestOf(pickable, here);
  if (target !== null) return { intent: { kind: 'goTo', target }, reason: 'pickup' };

  // 3. 대기 — stopFloors 가운데 (또는 전체 중앙) 으로 이동
  const allowedStops = policy.stopFloors.length > 0
    ? policy.stopFloors.filter((id) => id >= 0 && id < N)
    : floors.map((_, i) => i);
  if (allowedStops.length === 0) return { intent: { kind: 'stay' }, reason: 'no-allowed-floor' };
  const center = allowedStops[Math.floor(allowedStops.length / 2)]!;
  if (here !== center) return { intent: { kind: 'goTo', target: center }, reason: 'park-center' };
  return { intent: { kind: 'stay' }, reason: 'idle' };
}

/** 픽업 시점 — 큐의 손님 중 정책상 태울 수 있는 archetype 만 필터. */
export function pickupFilter(policy: ElevatorPolicy, archetype: string): boolean {
  if (policy.pickupArchetypes.length === 0) return true;
  return policy.pickupArchetypes.includes(archetype);
}

function nearestOf(targets: number[], here: number): number | null {
  let best: number | null = null;
  let bestD = Infinity;
  for (const t of targets) {
    const d = Math.abs(t - here);
    if (d < bestD) { bestD = d; best = t; }
  }
  return best;
}

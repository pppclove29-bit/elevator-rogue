import { nearestFloor } from './building';
import { ElevatorPolicy, Elevator, FloorId, SimState } from './types';

export type Intent = { kind: 'goTo'; target: FloorId } | { kind: 'stay' };

export interface Decision {
  intent: Intent;
  reason: string; // 콘솔 로그 / HUD 표시용
}

export function decide(state: SimState, e: Elevator, policy: ElevatorPolicy): Decision {
  const here = nearestFloor(e.y);
  const floors = state.building.floors;
  const maxF = policy.maxFloor < 0 ? floors.length - 1 : Math.min(policy.maxFloor, floors.length - 1);
  const minF = Math.max(0, policy.minFloor);

  const inRange = (id: FloorId): boolean => id >= minF && id <= maxF;
  const matchParity = (id: FloorId): boolean => {
    if (policy.parity === 'all') return true;
    if (policy.parity === 'even') return id % 2 === 0;
    return id % 2 === 1;
  };
  const allowed = (id: FloorId): boolean => inRange(id) && matchParity(id);

  // 1. 정원 풀이면 하차 우선
  if (policy.prioritizeUnloadWhenFull && e.passengers.length >= e.capacity) {
    const t = nearestOf(e.passengers.map((p) => p.dest).filter(allowed), here);
    if (t !== null) return { intent: { kind: 'goTo', target: t }, reason: 'unload-when-full' };
  }

  // 2. 탑승객 있으면 가장 가까운 dest로
  if (e.passengers.length > 0) {
    const dests = e.passengers.map((p) => p.dest);
    // 운영 범위 밖 dest는 어쩔 수 없이 가야 함 (이미 태웠으니)
    const t = nearestOf(dests, here);
    if (t !== null) return { intent: { kind: 'goTo', target: t }, reason: 'unload-nearest' };
  }

  // 3. 픽업
  const pickable: FloorId[] = [];
  for (const f of floors) {
    if (f.queue.length === 0) continue;
    if (!allowed(f.id)) continue;
    if (policy.pickupMode === 'lobby-only' && f.role !== 'lobby') continue;
    if (policy.pickupMode === 'role' && policy.pickupRole && f.role !== policy.pickupRole) continue;
    pickable.push(f.id);
  }
  const target = nearestOf(pickable, here);
  if (target !== null) return { intent: { kind: 'goTo', target }, reason: 'pickup' };

  // 4. 대기 — 운영 범위 중앙으로
  const center = Math.floor((minF + maxF) / 2);
  if (here !== center) return { intent: { kind: 'goTo', target: center }, reason: 'park-center' };

  return { intent: { kind: 'stay' }, reason: 'idle' };
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

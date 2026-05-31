/**
 * 저주 시스템 — 보스데이 (Day % 7 === 0) 시작 시 자동 발동.
 * 다음 보스데이까지 활성, 그 후 해제 + 새 저주.
 *
 * effectId 디스패치 + 일부 UI 마스킹 (uiMaskId).
 */
import { adjustReputation } from '../domain/simulation';
import { SimState } from '../domain/types';
import curseData from '../../data/curses.json';

export type CurseUIMask = 'hide-gold' | 'hide-rep' | 'hide-anger';

export interface CurseEntry {
  id: string;
  name: string;
  desc: string;
  effectId: string;
  params: any;
  uiMaskId?: CurseUIMask;
  apply(state: SimState): () => void;
}

interface JsonCurse {
  name: string;
  desc: string;
  effectId: string;
  params?: Record<string, unknown>;
  uiMaskId?: CurseUIMask;
}

const CURSE_EFFECTS: Record<string, (s: SimState, p: any) => () => void> = {
  noop: () => () => {},
  'spawn-mul': (s, p) => {
    s.params.spawnIntervalMultiplier *= p.factor;
    return () => { s.params.spawnIntervalMultiplier /= p.factor; };
  },
  'breakdown-mul': (s, p) => {
    s.params.breakdownMultiplier *= p.factor;
    return () => { s.params.breakdownMultiplier /= p.factor; };
  },
  'anger-mul': (s, p) => {
    s.params.angerWaitingPerTick *= p.factor;
    s.params.angerRidingPerTick *= p.factor;
    return () => {
      s.params.angerWaitingPerTick /= p.factor;
      s.params.angerRidingPerTick /= p.factor;
    };
  },
  'gold-mul': (s, p) => {
    (s as any).curseGoldMul = ((s as any).curseGoldMul ?? 1) * p.factor;
    return () => { (s as any).curseGoldMul /= p.factor; };
  },
  'daily-rep-drain': (s, p) => {
    (s as any).curseDailyRepDrain = ((s as any).curseDailyRepDrain ?? 0) + p.amount;
    return () => { (s as any).curseDailyRepDrain -= p.amount; };
  },
  'capacity-add': (s, p) => {
    const origCaps = s.building.elevators.map((e) => e.capacity);
    for (const e of s.building.elevators) e.capacity = Math.max(p.min ?? 1, e.capacity + p.delta);
    return () => {
      for (let i = 0; i < s.building.elevators.length; i++) {
        const o = origCaps[i]; if (o !== undefined) s.building.elevators[i]!.capacity = o;
      }
    };
  },
  'speed-mul': (s, p) => {
    s.params.globalSpeedMultiplier *= p.factor;
    return () => { s.params.globalSpeedMultiplier /= p.factor; };
  },
  'skill-cd-mul': (s, p) => {
    s.params.skillCooldownMultiplier *= p.factor;
    return () => { s.params.skillCooldownMultiplier /= p.factor; };
  },
};

function build(): Record<string, CurseEntry> {
  const json = curseData as Record<string, JsonCurse>;
  const out: Record<string, CurseEntry> = {};
  for (const [id, spec] of Object.entries(json)) {
    const effect = CURSE_EFFECTS[spec.effectId];
    if (!effect) { console.error(`[curses] unknown effectId="${spec.effectId}" for "${id}"`); continue; }
    out[id] = {
      id, name: spec.name, desc: spec.desc,
      effectId: spec.effectId, params: spec.params ?? {},
      uiMaskId: spec.uiMaskId,
      apply: (s) => effect(s, spec.params ?? {}),
    };
  }
  return out;
}

export const CURSES: Record<string, CurseEntry> = build();

export function curseById(id: string): CurseEntry | null {
  return CURSES[id] ?? null;
}

/** 보스데이 진입 — 저주 1개 무작위 발동 + cleanup ref 반환 (게임씬 보관). */
export function applyCurse(state: SimState, curseId: string, expiresAtDay: number, rng: () => number): (() => void) | null {
  void rng;
  const curse = curseById(curseId);
  if (!curse) return null;
  // 이미 다른 저주 활성이면 거부 (caller가 먼저 해제해야 함)
  if (state.activeCurse) return null;
  const cleanup = curse.apply(state);
  state.activeCurse = { id: curseId, expiresAtDay };
  console.log(`[curses] 저주 발동: ${curse.name} (Day ${expiresAtDay} 까지)`);
  return cleanup;
}

/** 만료 — caller 가 보관한 cleanup 호출 후 activeCurse 해제. */
export function clearCurse(state: SimState, cleanup: (() => void) | null): void {
  if (cleanup) cleanup();
  state.activeCurse = null;
}

/** 무작위 저주 1종 — 이미 발동한 적 없는 것 우선. */
export function rollCurse(rng: () => number): string {
  const ids = Object.keys(CURSES);
  return ids[Math.floor(rng() * ids.length)] ?? 'c-fury';
}

/** 매 자정 호출 — 저주 데일리 효과 (현재는 c-misfortune 의 자연 손실만). */
export function tickCurseDaily(state: SimState): void {
  const drain = (state as any).curseDailyRepDrain ?? 0;
  if (drain > 0) adjustReputation(state, -drain);
}

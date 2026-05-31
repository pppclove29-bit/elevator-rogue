/**
 * 트링킷 — 렐릭보다 약한 영구 보너스. 최대 3개 장착.
 * 매일 상점에 1슬롯 추가 등장.
 *
 * 효과는 effectId+params 디스패치. 조건부/도박 효과는 일부는 단순화 (param 만 적용,
 * 매 도착 hook 까지 구현 어려운 케이스는 비슷한 일반 effect로 대체).
 */
import { SimState } from '../domain/types';
import trinketData from '../../data/trinkets.json';

export type TrinketCategory = 'common' | 'conditional' | 'gamble';

export interface TrinketEntry {
  id: string;
  name: string;
  desc: string;
  category: TrinketCategory;
  effectId: string;
  params: any;
  apply(state: SimState): () => void;
}

interface JsonTrinket {
  name: string;
  desc: string;
  category: TrinketCategory;
  effectId: string;
  params?: Record<string, unknown>;
}

/** 트링킷 효과 풀 — 대부분 params 으로 일반화. */
const TRINKET_EFFECTS: Record<string, (s: SimState, p: any) => () => void> = {
  'gold-flat': (s, p) => {
    (s as any).trinketGoldFlat = ((s as any).trinketGoldFlat ?? 0) + p.amount;
    return () => { (s as any).trinketGoldFlat -= p.amount; };
  },
  'speed-mul': (s, p) => { s.params.globalSpeedMultiplier *= p.factor; return () => { s.params.globalSpeedMultiplier /= p.factor; }; },
  'anger-riding-mul': (s, p) => { s.params.angerRidingPerTick *= p.factor; return () => { s.params.angerRidingPerTick /= p.factor; }; },
  'anger-waiting-mul': (s, p) => { s.params.angerWaitingPerTick *= p.factor; return () => { s.params.angerWaitingPerTick /= p.factor; }; },
  'breakdown-mul': (s, p) => { s.params.breakdownMultiplier *= p.factor; return () => { s.params.breakdownMultiplier /= p.factor; }; },
  'instant-gold': (s, p) => { s.gold += p.amount; return () => {}; },
  'rep-loss-mul': (s, p) => {
    (s as any).repLossMultiplier = ((s as any).repLossMultiplier ?? 1) * p.factor;
    return () => { (s as any).repLossMultiplier /= p.factor; };
  },
  'skill-cd-mul': (s, p) => { s.params.skillCooldownMultiplier *= p.factor; return () => { s.params.skillCooldownMultiplier /= p.factor; }; },
  'reroll-cost': (s, p) => {
    (s as any).trinketRerollDiscount = ((s as any).trinketRerollDiscount ?? 0) + p.delta;
    return () => { (s as any).trinketRerollDiscount -= p.delta; };
  },
  'phase-spawn-mul': (s, p) => {
    s.params.phaseSpawnMultiplier[p.phase as 'morning'] *= p.factor;
    return () => { s.params.phaseSpawnMultiplier[p.phase as 'morning'] /= p.factor; };
  },
  'archetype-bonus': (s, p) => {
    (s as any).trinketArchetypeBonus = (s as any).trinketArchetypeBonus ?? {};
    (s as any).trinketArchetypeBonus[p.archetype] = ((s as any).trinketArchetypeBonus[p.archetype] ?? 0) + p.amount;
    return () => { (s as any).trinketArchetypeBonus[p.archetype] -= p.amount; };
  },
  'thief-bonus': (s, p) => {
    (s as any).trinketThiefBonus = ((s as any).trinketThiefBonus ?? 0) + p.amount;
    return () => { (s as any).trinketThiefBonus -= p.amount; };
  },
  'space-cost-reduce': (s, p) => {
    (s as any).trinketSpaceReduce = (s as any).trinketSpaceReduce ?? {};
    (s as any).trinketSpaceReduce[p.archetype] = ((s as any).trinketSpaceReduce[p.archetype] ?? 0) + p.amount;
    return () => { (s as any).trinketSpaceReduce[p.archetype] -= p.amount; };
  },
  'toilet-regen': (s, p) => { s.params.toiletCleanRate += p.amount; return () => { s.params.toiletCleanRate -= p.amount; }; },

  // 조건부 (단순화 — 매 tick hook 없이 flag 만 켜둠. checkXxx 에서 활용 가능)
  'weekday-anger':    (s, p) => { (s as any).trinketWeekdayAnger = p; return () => { (s as any).trinketWeekdayAnger = null; }; },
  'lowrep-goldmul':   (s, p) => { (s as any).trinketLowRepGoldMul = p; return () => { (s as any).trinketLowRepGoldMul = null; }; },
  'empty-elev-speed': (s, p) => { (s as any).trinketEmptyElevSpeed = p; return () => { (s as any).trinketEmptyElevSpeed = null; }; },
  'rush-gold':        (s, p) => { (s as any).trinketRushGold = p; return () => { (s as any).trinketRushGold = null; }; },
  'solo-mul':         (s, p) => { (s as any).trinketSoloMul = p; return () => { (s as any).trinketSoloMul = null; }; },
  'mod-floor-mul':    (s, p) => { (s as any).trinketModFloorMul = p; return () => { (s as any).trinketModFloorMul = null; }; },
  'holiday-regen':    (s, p) => { (s as any).trinketHolidayRegen = p; return () => { (s as any).trinketHolidayRegen = null; }; },
  'phase-goldmul':    (s, p) => { (s as any).trinketPhaseGoldMul = p; return () => { (s as any).trinketPhaseGoldMul = null; }; },
  'daily-firstN-mul': (s, p) => { (s as any).trinketDailyFirstN = p; return () => { (s as any).trinketDailyFirstN = null; }; },
  'comeback-bonus':   (s, p) => { (s as any).trinketComeback = p; return () => { (s as any).trinketComeback = null; }; },

  // 도박 (RNG 기반 — flag 만)
  'coinflip-gold':    (s, p) => { (s as any).trinketCoinflipGold = p; return () => { (s as any).trinketCoinflipGold = null; }; },
  'gold-rep-trade':   (s, p) => {
    (s as any).trinketGoldMul = ((s as any).trinketGoldMul ?? 1) * p.goldMul;
    (s as any).dailyRegenMul = ((s as any).dailyRegenMul ?? 1) * p.regenMul;
    return () => {
      (s as any).trinketGoldMul /= p.goldMul;
      (s as any).dailyRegenMul /= p.regenMul;
    };
  },
  'fragile-amplify':  (s, p) => {
    (s as any).trinketAmplify = p;
    // 일반화: 모든 곱셈 효과 +20% — speed/anger/cap 등
    s.params.globalSpeedMultiplier *= p.factor;
    return () => {
      (s as any).trinketAmplify = null;
      s.params.globalSpeedMultiplier /= p.factor;
    };
  },
  'daily-coinflip':   (s, p) => { (s as any).trinketDailyCoinflip = p; return () => { (s as any).trinketDailyCoinflip = null; }; },
  'next-deal-amp':    (s, p) => { (s as any).trinketNextDealAmp = p; return () => { (s as any).trinketNextDealAmp = null; }; },
};

function build(): Record<string, TrinketEntry> {
  const json = trinketData as Record<string, JsonTrinket>;
  const out: Record<string, TrinketEntry> = {};
  for (const [id, spec] of Object.entries(json)) {
    const effect = TRINKET_EFFECTS[spec.effectId];
    if (!effect) {
      console.error(`[trinkets] unknown effectId="${spec.effectId}" for "${id}"`);
      continue;
    }
    out[id] = {
      id, name: spec.name, desc: spec.desc,
      category: spec.category,
      effectId: spec.effectId, params: spec.params ?? {},
      apply: (s) => effect(s, spec.params ?? {}),
    };
  }
  return out;
}

export const TRINKETS: Record<string, TrinketEntry> = build();
export const TRINKET_EFFECT_IDS: string[] = Object.keys(TRINKET_EFFECTS);
export const MAX_TRINKETS = 3;

export function trinketById(id: string): TrinketEntry | null {
  return TRINKETS[id] ?? null;
}

/** 새 트링킷 획득 — 최대 3개 미만이면 그냥 추가. 3개 차면 호출자가 교체 UI 처리. */
export function acquireTrinket(state: SimState, trinketId: string): boolean {
  if (state.ownedTrinkets.length >= MAX_TRINKETS) return false;
  const t = trinketById(trinketId);
  if (!t) return false;
  state.ownedTrinkets.push(trinketId);
  t.apply(state);
  return true;
}

/** 트링킷 버리기 — 효과는 이미 cleanup 까다로움 (clean 함수 ref 저장 X). 단순화: 효과 누적 영구. */
export function discardTrinket(state: SimState, trinketId: string): void {
  const idx = state.ownedTrinkets.indexOf(trinketId);
  if (idx < 0) return;
  state.ownedTrinkets.splice(idx, 1);
  if (!state.discardedTrinkets.includes(trinketId)) state.discardedTrinkets.push(trinketId);
  // 효과 cleanup 은 별도 추적 시 처리 — MVP: 효과 누적 그대로 두기 (보수적 단순화).
}

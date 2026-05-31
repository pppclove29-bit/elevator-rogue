/**
 * Devil/Angel 거래 렐릭. 평판 시스템 위에 얹는 트레이드오프 시스템.
 *
 * 효과는 effectId+params 로 디스패치 — modifiers.ts 패턴 따라.
 * 데이터는 data/devil-relics.json, data/angel-relics.json.
 */
import { addFloor } from '../domain/building';
import { adjustReputation } from '../domain/simulation';
import { SimState } from '../domain/types';
import devilData from '../../data/devil-relics.json';
import angelData from '../../data/angel-relics.json';

export type DealKind = 'devil' | 'angel';

export interface DealRelic {
  id: string;
  kind: DealKind;
  name: string;
  desc: string;
  effectId: string;
  params: any;
  /** 글래스 캐논 — 조건 만족 시 영구 파괴. */
  fragile?: { conditionId: string; params?: any };
  /** 적용 — 즉시 effect. cleanup 함수 반환 (글래스캐논/만료 시). */
  apply(state: SimState): () => void;
}

interface JsonDeal {
  name: string;
  desc: string;
  effectId: string;
  params?: Record<string, unknown>;
  fragile?: { conditionId: string; params?: any };
}

// ─── effect 디스패치 — 데비ㄹ/엔젤 공통 풀 ───
const DEAL_EFFECTS: Record<string, (s: SimState, p: any) => () => void> = {
  // ── DEVIL ───────────────────────────────────────────
  'gold-mul': (s, p) => {
    // 일반 손님 도착 골드 ×factor — finalizeAlight 에서 별도 적용 어려움 → params 활용
    // 단순화: rooftopGoldMultiplier 비슷한 별도 곱셈 필드가 없으므로 dailyVisits 단가에 곱하기 어려움.
    // 대신 매일 자정 추가 보너스로 변환 (대략적 효과 매칭).
    // 더 정확한 매칭은 차후 도메인 필드 추가로 — MVP 단순화.
    const orig = s.params.rooftopGoldMultiplier;
    s.params.rooftopGoldMultiplier *= p.factor;
    // 전체 단가에 곱하는 효과 위해 GOLD_BONUS_MULT 별도 추적
    (s as any).dealGoldMultiplier = ((s as any).dealGoldMultiplier ?? 1) * p.factor;
    return () => {
      s.params.rooftopGoldMultiplier = orig;
      (s as any).dealGoldMultiplier /= p.factor;
    };
  },
  'capacity-load': (s, p) => {
    const origCaps = s.building.elevators.map((e) => e.capacity);
    for (const e of s.building.elevators) e.capacity += p.capDelta;
    s.params.baseLoadTicks += p.loadDelta;
    return () => {
      for (let i = 0; i < s.building.elevators.length; i++) {
        const o = origCaps[i]; if (o !== undefined) s.building.elevators[i]!.capacity = o;
      }
      s.params.baseLoadTicks -= p.loadDelta;
    };
  },
  'spawn-noregen': (s, p) => {
    s.params.spawnIntervalMultiplier *= (1 / p.spawnFactor);     // factor 0.75 = 스폰 ×0.75 = 간격 ×1.333
    (s as any).repRegenBlocked = true;
    return () => {
      s.params.spawnIntervalMultiplier /= (1 / p.spawnFactor);
      (s as any).repRegenBlocked = false;
    };
  },
  'speed-thief': (s, p) => {
    s.params.globalSpeedMultiplier *= p.speedFactor;
    s.params.thiefSpawnMultiplier *= p.thiefFactor;
    return () => {
      s.params.globalSpeedMultiplier /= p.speedFactor;
      s.params.thiefSpawnMultiplier /= p.thiefFactor;
    };
  },
  'soul-contract': (s) => {
    for (const e of s.building.elevators) e.capacity *= 2;
    (s as any).noReviveSoulContract = true;
    return () => {
      for (const e of s.building.elevators) e.capacity = Math.max(1, Math.floor(e.capacity / 2));
      (s as any).noReviveSoulContract = false;
    };
  },
  'anger-rep-trade': (s, p) => {
    s.params.angerWaitingPerTick *= p.angerFactor;
    s.params.angerRidingPerTick *= p.angerFactor;
    (s as any).repLossMultiplier = ((s as any).repLossMultiplier ?? 1) * p.repLossMul;
    return () => {
      s.params.angerWaitingPerTick /= p.angerFactor;
      s.params.angerRidingPerTick /= p.angerFactor;
      (s as any).repLossMultiplier /= p.repLossMul;
    };
  },
  'fast-strict': (s, p) => {
    s.params.baseLoadTicks += p.loadDelta;
    (s as any).angryRepLossExtra = ((s as any).angryRepLossExtra ?? 0) + p.angryLossExtra;
    return () => {
      s.params.baseLoadTicks -= p.loadDelta;
      (s as any).angryRepLossExtra -= p.angryLossExtra;
    };
  },
  'rich-glutton': (s, p) => {
    s.gold += p.initGold;
    (s as any).dailyGoldDrain = ((s as any).dailyGoldDrain ?? 0) + p.dailyDrain;
    return () => { (s as any).dailyGoldDrain -= p.dailyDrain; };
  },
  'haste-breakdown': (s, p) => {
    s.params.spawnIntervalMultiplier *= (1 / p.spawnFactor);
    s.params.breakdownMultiplier *= p.breakdownFactor;
    return () => {
      s.params.spawnIntervalMultiplier /= (1 / p.spawnFactor);
      s.params.breakdownMultiplier /= p.breakdownFactor;
    };
  },
  'shadow-floor': (s, p) => {
    for (let i = 0; i < p.addFloors; i++) addFloor(s.building);
    adjustReputation(s, -p.repCost);
    return () => {};   // 층/평판은 영구
  },

  // ── ANGEL ───────────────────────────────────────────
  'anger-regen': (s, p) => {
    s.params.angerWaitingPerTick *= p.angerFactor;
    s.params.angerRidingPerTick *= p.angerFactor;
    (s as any).dailyRegenBonus = ((s as any).dailyRegenBonus ?? 0) + p.regenBonus;
    return () => {
      s.params.angerWaitingPerTick /= p.angerFactor;
      s.params.angerRidingPerTick /= p.angerFactor;
      (s as any).dailyRegenBonus -= p.regenBonus;
    };
  },
  'cascade-threshold': (s, p) => {
    (s as any).cascadeThresholdDelta = ((s as any).cascadeThresholdDelta ?? 0) + p.delta;
    return () => { (s as any).cascadeThresholdDelta -= p.delta; };
  },
  'thief-shield': (s, p) => {
    s.params.thiefSpawnMultiplier *= p.thiefFactor;
    (s as any).thiefCaughtRepGain = ((s as any).thiefCaughtRepGain ?? 0) + p.repGain;
    return () => {
      s.params.thiefSpawnMultiplier /= p.thiefFactor;
      (s as any).thiefCaughtRepGain -= p.repGain;
    };
  },
  'anger-soften': (s, p) => {
    (s as any).angerLossReduce = ((s as any).angerLossReduce ?? 0) + p.lossReduce;
    return () => { (s as any).angerLossReduce -= p.lossReduce; };
  },
  'mercy-escape': (s, p) => {
    (s as any).mercyEscapeAvailable = true;
    (s as any).mercyEscapeRepBoost = p.repBoost;
    return () => {
      (s as any).mercyEscapeAvailable = false;
      (s as any).mercyEscapeRepBoost = 0;
    };
  },
  'extra-revive': (s, p) => {
    s.revivesRemaining += p.amount;
    return () => { s.revivesRemaining = Math.max(0, s.revivesRemaining - p.amount); };
  },
};

function build(kind: DealKind, json: Record<string, JsonDeal>): Record<string, DealRelic> {
  const out: Record<string, DealRelic> = {};
  for (const [id, spec] of Object.entries(json)) {
    const effect = DEAL_EFFECTS[spec.effectId];
    if (!effect) { console.error(`[deals] unknown effectId="${spec.effectId}" for "${id}"`); continue; }
    out[id] = {
      id, kind, name: spec.name, desc: spec.desc,
      effectId: spec.effectId, params: spec.params ?? {},
      fragile: spec.fragile,
      apply: (s) => effect(s, spec.params ?? {}),
    };
  }
  return out;
}

export const DEVIL_RELICS: Record<string, DealRelic> = build('devil', devilData as Record<string, JsonDeal>);
export const ANGEL_RELICS: Record<string, DealRelic> = build('angel', angelData as Record<string, JsonDeal>);

export function dealById(id: string): DealRelic | null {
  return DEVIL_RELICS[id] ?? ANGEL_RELICS[id] ?? null;
}

/** 매 Day 5/10/15... 시점에 1택 굴림 — angel 은 hasMadeDevilDeal 안 했을 때만 표시. */
export function rollDealOffers(state: SimState, rng: () => number): { devil: string[]; angel: string[] } {
  const devil = pickN(Object.keys(DEVIL_RELICS), 1, rng);
  const angel = state.hasMadeDevilDeal ? [] : pickN(Object.keys(ANGEL_RELICS), 1, rng);
  return { devil, angel };
}

function pickN<T>(arr: T[], n: number, rng: () => number): T[] {
  const copy = arr.slice();
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(rng() * copy.length);
    out.push(copy.splice(idx, 1)[0]!);
  }
  return out;
}

/** 거래 실행 — 평판 비용/보상 + 효과 적용 + 카운터 증가. */
export function executeDeal(state: SimState, relicId: string): boolean {
  const relic = dealById(relicId);
  if (!relic) return false;
  if (relic.kind === 'devil') {
    adjustReputation(state, -10);
    state.hasMadeDevilDeal = true;
    state.devilDealCount += 1;
  } else {
    adjustReputation(state, +5);
    state.angelDealCount += 1;
  }
  relic.apply(state);
  state.ownedRelics.push(relic.id);
  return true;
}

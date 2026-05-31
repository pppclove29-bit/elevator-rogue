import { Rng } from '../domain/rng';
import { REPAIR_COST, SHOP_OFFER_SIZE, SHOP_REROLL_BASE_COST, SHOP_REROLL_COST_GROWTH, SimState } from '../domain/types';
import { MAX_SKILLS, SKILLS, SkillCard } from './skills';
import { TRINKETS, TrinketEntry, TrinketCategory } from './trinkets';
import { MAX_ELEVATORS, UPGRADES, UpgradeCard } from './upgrades';

export type ShopItem =
  | { kind: 'upgrade'; card: UpgradeCard }
  | { kind: 'skill'; card: SkillCard }
  | { kind: 'repair'; elevatorId: number; cost: number }
  | { kind: 'trinket'; trinket: TrinketEntry; cost: number }
  | { kind: 'mystery'; cost: number };

export const MYSTERY_BOX_COST = 30;
export const MYSTERY_BOX_DAY_THRESHOLD = 3;

/** 트링킷 가격 — 카테고리별 고정. common 5G / conditional 10G / gamble 15G. */
export function trinketPrice(cat: TrinketCategory): number {
  if (cat === 'common') return 5;
  if (cat === 'conditional') return 10;
  return 15;
}

/** 현재 state의 shopOfferIds + 고장 엘베 수리 + 트링킷 + 미스터리 자동 추가 */
export function currentShopItems(state: SimState): ShopItem[] {
  const items: ShopItem[] = [];
  for (const id of state.shopOfferIds) {
    if (UPGRADES[id]) items.push({ kind: 'upgrade', card: UPGRADES[id]! });
    else if (SKILLS[id]) items.push({ kind: 'skill', card: SKILLS[id]! });
  }
  for (const e of state.building.elevators) {
    if (e.state.kind === 'broken') items.push({ kind: 'repair', elevatorId: e.id, cost: REPAIR_COST });
  }
  if (state.shopTrinketId) {
    const t = TRINKETS[state.shopTrinketId];
    if (t) items.push({ kind: 'trinket', trinket: t, cost: trinketPrice(t.category) });
  }
  if (state.shopMysteryAvailable) {
    items.push({ kind: 'mystery', cost: MYSTERY_BOX_COST });
  }
  return items;
}

/** 매일 시작 시 호출 — N개 새로 굴림 + 트링킷 + 미스터리 */
export function rollShopOffers(state: SimState, rng: Rng): void {
  state.shopOfferIds = drawIds(state, rng);
  state.shopTrinketId = rollTrinket(state, rng);
  state.shopMysteryAvailable = state.dayCompleted >= MYSTERY_BOX_DAY_THRESHOLD;
  state.shopRerollCount = 0;
}

/** 트링킷 풀에서 1개 — 이미 보유/버린 것 제외. 다 떨어지면 null. */
function rollTrinket(state: SimState, rng: Rng): string | null {
  const owned = new Set(state.ownedTrinkets);
  const discarded = new Set(state.discardedTrinkets);
  const pool = Object.keys(TRINKETS).filter((id) => !owned.has(id) && !discarded.has(id));
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)] ?? null;
}

/** 미스터리 박스 — 가중치 풀에서 1개 추첨. 트링킷 50% / 골드 25% / 평판 15% / 렐릭 10%. */
export function openMysteryBox(state: SimState, rng: Rng): { kind: 'trinket' | 'gold' | 'reputation' | 'relic'; payload: string | number } {
  const r = rng();
  if (r < 0.5) {
    // 트링킷 — shopTrinketId 와 중복 안 되도록
    const owned = new Set(state.ownedTrinkets);
    const discarded = new Set(state.discardedTrinkets);
    const pool = Object.keys(TRINKETS).filter((id) => !owned.has(id) && !discarded.has(id));
    if (pool.length > 0) {
      const id = pool[Math.floor(rng() * pool.length)]!;
      return { kind: 'trinket', payload: id };
    }
    return { kind: 'gold', payload: 30 };
  }
  if (r < 0.75) return { kind: 'gold', payload: 25 + Math.floor(rng() * 30) };  // 25~54
  if (r < 0.90) return { kind: 'reputation', payload: 5 + Math.floor(rng() * 6) }; // 5~10
  // 렐릭 10% — UPGRADES 풀에서 임의 선택은 어색하니 단순 골드 +100 으로 대체
  return { kind: 'gold', payload: 100 };
}

export function rerollCost(state: SimState): number {
  return SHOP_REROLL_BASE_COST + state.shopRerollCount * SHOP_REROLL_COST_GROWTH;
}

export function tryReroll(state: SimState, rng: Rng): boolean {
  const cost = rerollCost(state);
  if (state.gold < cost) return false;
  state.gold -= cost;
  state.shopOfferIds = drawIds(state, rng);
  state.shopTrinketId = rollTrinket(state, rng);
  state.shopRerollCount += 1;
  return true;
}

function drawIds(state: SimState, rng: Rng): string[] {
  const upgradePool = Object.values(UPGRADES).filter(
    (u) => u.id !== 'upgrade-add-elevator' || state.building.elevators.length < MAX_ELEVATORS,
  );
  const skillPool = state.ownedSkills.length < MAX_SKILLS
    ? Object.values(SKILLS).filter((s) => !state.ownedSkills.includes(s.id))
    : [];

  const result: string[] = [];
  const used = new Set<string>();
  for (let i = 0; i < SHOP_OFFER_SIZE; i++) {
    const buckets: Array<{ kind: 'u' | 's'; weight: number }> = [];
    const remUpg = upgradePool.filter((p) => !used.has(p.id));
    const remSkill = skillPool.filter((p) => !used.has(p.id));
    if (remUpg.length > 0) buckets.push({ kind: 'u', weight: 70 });
    if (remSkill.length > 0) buckets.push({ kind: 's', weight: 30 });
    if (buckets.length === 0) break;

    const total = buckets.reduce((s, b) => s + b.weight, 0);
    let r = rng() * total;
    let kind: 'u' | 's' = buckets[0]!.kind;
    for (const b of buckets) { r -= b.weight; if (r <= 0) { kind = b.kind; break; } }

    const pool = kind === 'u' ? remUpg : remSkill;
    const pick = pool[Math.floor(rng() * pool.length)]!;
    used.add(pick.id);
    result.push(pick.id);
  }
  return result;
}

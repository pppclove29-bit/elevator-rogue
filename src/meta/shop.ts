import { Rng } from '../domain/rng';
import { REPAIR_COST, SHOP_OFFER_SIZE, SHOP_REROLL_BASE_COST, SHOP_REROLL_COST_GROWTH, SimState } from '../domain/types';
import { MAX_SKILLS, SKILLS, SkillCard } from './skills';
import { MAX_ELEVATORS, UPGRADES, UpgradeCard } from './upgrades';

export type ShopItem =
  | { kind: 'upgrade'; card: UpgradeCard }
  | { kind: 'skill'; card: SkillCard }
  | { kind: 'repair'; elevatorId: number; cost: number };

/** 현재 state의 shopOfferIds + 고장 엘베 수리 자동 추가 */
export function currentShopItems(state: SimState): ShopItem[] {
  const items: ShopItem[] = [];
  for (const id of state.shopOfferIds) {
    if (UPGRADES[id]) items.push({ kind: 'upgrade', card: UPGRADES[id]! });
    else if (SKILLS[id]) items.push({ kind: 'skill', card: SKILLS[id]! });
  }
  for (const e of state.building.elevators) {
    if (e.state.kind === 'broken') items.push({ kind: 'repair', elevatorId: e.id, cost: REPAIR_COST });
  }
  return items;
}

/** 매일 시작 시 호출 — N개 새로 굴림 */
export function rollShopOffers(state: SimState, rng: Rng): void {
  state.shopOfferIds = drawIds(state, rng);
  state.shopRerollCount = 0;
}

export function rerollCost(state: SimState): number {
  return SHOP_REROLL_BASE_COST + state.shopRerollCount * SHOP_REROLL_COST_GROWTH;
}

export function tryReroll(state: SimState, rng: Rng): boolean {
  const cost = rerollCost(state);
  if (state.gold < cost) return false;
  state.gold -= cost;
  state.shopOfferIds = drawIds(state, rng);
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

/**
 * 모디파이어 카드. 데이터는 data/modifiers.json, 효과는 effectId+params → 함수 매핑.
 * CMS (/cms.html) 에서 name/desc/type/effectId/params 편집 가능.
 *
 * effectId 종류:
 *   phase-spawn-mul    { phase, factor }   특정 페이즈 스폰 간격 곱
 *   anger-all-mul      { factor }          waiting/riding anger 전체 곱
 *   speed-mul          { factor }          엘베 속도 곱
 *   load-tick-add      { delta }           정차 시간 가감
 *   capacity-add       { delta, min }      엘베 정원 가감
 *   spawn-global-mul   { factor }          전체 스폰 간격 곱
 *   skill-cd-mul       { factor }          스킬 쿨다운 곱
 *   floor-capacity-add { delta }           층 큐 상한 가감
 *   fire-drill         { }                 화재 대피 (랜덤 큐 +4 즉시)
 *   rush-rewards       { factor, gold }    스폰 곱 + 즉시 골드
 *   marathon           { spawnFactor, angerFactor }
 *   vip-protocol       { speedFactor, capDelta, capMin }
 */
import { Phase } from '../domain/phase';
import { SimState } from '../domain/types';
import modifierData from '../../data/modifiers.json';

export type ModifierType = 'debuff' | 'buff' | 'mixed';

export interface ModifierEntry {
  id: string;
  name: string;
  desc: string;
  type: ModifierType;
  /** state mutate. return: 만료 시 호출할 cleanup */
  apply(state: SimState): () => void;
}

interface JsonModifier {
  name: string;
  desc: string;
  type: ModifierType;
  effectId: string;
  params?: Record<string, unknown>;
}

function mulField(obj: any, key: string, factor: number): () => void {
  obj[key] *= factor;
  return () => { obj[key] /= factor; };
}
function addField(obj: any, key: string, delta: number): () => void {
  obj[key] += delta;
  return () => { obj[key] -= delta; };
}
function mulRecord(obj: any, key: string, factor: number): () => void {
  obj[key] *= factor;
  return () => { obj[key] /= factor; };
}

/** effectId → (state, params) => cleanup */
const MODIFIER_EFFECTS: Record<string, (s: SimState, p: any) => () => void> = {
  'phase-spawn-mul': (s, p) => mulRecord(s.params.phaseSpawnMultiplier, p.phase as Phase, p.factor),
  'anger-all-mul': (s, p) => {
    const u1 = mulField(s.params, 'angerWaitingPerTick', p.factor);
    const u2 = mulField(s.params, 'angerRidingPerTick', p.factor);
    return () => { u1(); u2(); };
  },
  'speed-mul': (s, p) => mulField(s.params, 'globalSpeedMultiplier', p.factor),
  'load-tick-add': (s, p) => addField(s.params, 'baseLoadTicks', p.delta),
  'capacity-add': (s, p) => {
    const orig = s.building.elevators.map((e) => e.capacity);
    const min = p.min ?? 1;
    for (const e of s.building.elevators) e.capacity = Math.max(min, e.capacity + p.delta);
    return () => {
      for (let i = 0; i < s.building.elevators.length; i++) {
        const o = orig[i]; if (o !== undefined) s.building.elevators[i]!.capacity = o;
      }
    };
  },
  'spawn-global-mul': (s, p) => mulField(s.params, 'spawnIntervalMultiplier', p.factor),
  'skill-cd-mul': (s, p) => mulField(s.params, 'skillCooldownMultiplier', p.factor),
  'floor-capacity-add': (s, p) => addField(s.params, 'floorCapacity', p.delta),
  'fire-drill': (s) => {
    const idx = Math.floor(Math.random() * s.building.floors.length);
    const floor = s.building.floors[idx];
    if (!floor) return () => {};
    for (let i = 0; i < 4; i++) {
      const dest = (idx + 1 + Math.floor(Math.random() * (s.building.floors.length - 1))) % s.building.floors.length;
      floor.queue.push({ id: s.nextPassengerId++, origin: floor.id, dest, spawnTick: s.tick, anger: 0, archetype: 'normal' });
    }
    return () => {};
  },
  'rush-rewards': (s, p) => {
    s.gold += p.gold;
    return mulField(s.params, 'spawnIntervalMultiplier', p.factor);
  },
  'marathon': (s, p) => {
    const u1 = mulField(s.params, 'spawnIntervalMultiplier', p.spawnFactor);
    const u2 = mulField(s.params, 'angerWaitingPerTick', p.angerFactor);
    return () => { u1(); u2(); };
  },
  'vip-protocol': (s, p) => {
    const u1 = mulField(s.params, 'globalSpeedMultiplier', p.speedFactor);
    const orig = s.building.elevators.map((e) => e.capacity);
    const min = p.capMin ?? 1;
    for (const e of s.building.elevators) e.capacity = Math.max(min, e.capacity + p.capDelta);
    return () => {
      u1();
      for (let i = 0; i < s.building.elevators.length; i++) {
        const o = orig[i]; if (o !== undefined) s.building.elevators[i]!.capacity = o;
      }
    };
  },
};

function build(): Record<string, ModifierEntry> {
  const json = modifierData as Record<string, JsonModifier>;
  const out: Record<string, ModifierEntry> = {};
  for (const [id, spec] of Object.entries(json)) {
    const effect = MODIFIER_EFFECTS[spec.effectId];
    if (!effect) {
      console.error(`[modifiers] unknown effectId="${spec.effectId}" for "${id}"`);
      continue;
    }
    out[id] = {
      id, name: spec.name, desc: spec.desc, type: spec.type,
      apply: (s) => effect(s, spec.params ?? {}),
    };
  }
  return out;
}

export const MODIFIERS: Record<string, ModifierEntry> = build();

/** CMS effectId 드롭다운용 */
export const MODIFIER_EFFECT_IDS: string[] = Object.keys(MODIFIER_EFFECTS);

export function modifierById(id: string): ModifierEntry {
  const m = MODIFIERS[id]; if (!m) throw new Error(`unknown modifier: ${id}`); return m;
}

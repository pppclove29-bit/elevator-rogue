/**
 * 스킬 카드. 데이터는 data/skills.json, 효과는 effectId → 함수로 매핑.
 * CMS (/cms.html) 에서 name/desc/cost/cooldown/effectId 편집 가능.
 *
 * 새 효과 추가: SKILL_EFFECTS 에 함수 추가 + skills.json effectId 참조.
 */
import { ANGER_THRESHOLD } from '../domain/simulation';
import { SimState } from '../domain/types';
import skillData from '../../data/skills.json';

export interface SkillCard {
  id: string;
  name: string;
  desc: string;
  cooldownTicks: number;
  cost: number;
  effect(state: SimState): void;
}

interface JsonSkill {
  name: string;
  desc: string;
  cooldownTicks: number;
  cost: number;
  effectId: string;
}

const SKILL_EFFECTS: Record<string, (state: SimState) => void> = {
  'anger-relief': (s) => {
    for (const f of s.building.floors) for (const p of f.queue) p.anger *= 0.5;
    for (const e of s.building.elevators) for (const p of e.passengers) p.anger *= 0.5;
  },
  'warp-lobby': (s) => {
    for (const e of s.building.elevators) {
      e.state = { kind: 'moving', targetFloor: 0 };
    }
  },
  'clear-largest': (s) => {
    let target = -1;
    let max = 0;
    for (const f of s.building.floors) {
      if (f.queue.length > max) { max = f.queue.length; target = f.id; }
    }
    if (target < 0) return;
    const floor = s.building.floors[target]!;
    s.servedCount += floor.queue.length;
    for (const p of floor.queue) if (p.anger >= ANGER_THRESHOLD) s.angryServedCount += 1;
    floor.queue = [];
  },
  'slow-spawn': (s) => {
    s.params.spawnIntervalMultiplier = 2;
    s.skillTimers['skill-slow-spawn'] = 400;
  },
};

function build(): Record<string, SkillCard> {
  const json = skillData as Record<string, JsonSkill>;
  const out: Record<string, SkillCard> = {};
  for (const [id, spec] of Object.entries(json)) {
    const effect = SKILL_EFFECTS[spec.effectId];
    if (!effect) {
      console.error(`[skills] unknown effectId="${spec.effectId}" for skill "${id}"`);
      continue;
    }
    out[id] = {
      id, name: spec.name, desc: spec.desc,
      cooldownTicks: spec.cooldownTicks, cost: spec.cost,
      effect,
    };
  }
  return out;
}

export const SKILLS: Record<string, SkillCard> = build();

/** CMS 페이지에서 effectId 드롭다운 옵션으로 사용 */
export const SKILL_EFFECT_IDS: string[] = Object.keys(SKILL_EFFECTS);

export const MAX_SKILLS = 3;

export function skillById(id: string): SkillCard {
  const s = SKILLS[id];
  if (!s) throw new Error(`unknown skill: ${id}`);
  return s;
}

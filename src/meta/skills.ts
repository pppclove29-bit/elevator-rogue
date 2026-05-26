import { ANGER_THRESHOLD } from '../domain/simulation';
import { SimState } from '../domain/types';

export interface SkillCard {
  id: string;
  name: string;
  desc: string;
  cooldownTicks: number;
  cost: number;
  effect(state: SimState): void;
}

export const SKILLS: Record<string, SkillCard> = {
  'skill-anger-relief': {
    id: 'skill-anger-relief',
    name: '서비스 회복',
    desc: '모든 승객의 불만을 50% 감소',
    cooldownTicks: 1200, cost: 80,
    effect: (s) => {
      for (const f of s.building.floors) for (const p of f.queue) p.anger *= 0.5;
      for (const e of s.building.elevators) for (const p of e.passengers) p.anger *= 0.5;
    },
  },
  'skill-warp-lobby': {
    id: 'skill-warp-lobby',
    name: '전원 1F 집결',
    desc: '모든 엘리베이터를 즉시 1F(로비)로 이동 명령',
    cooldownTicks: 1800, cost: 70,
    effect: (s) => {
      for (const e of s.building.elevators) {
        e.state = { kind: 'moving', targetFloor: 0 };
      }
    },
  },
  'skill-clear-largest': {
    id: 'skill-clear-largest',
    name: '비상 처리',
    desc: '가장 큰 대기열의 승객을 즉시 모두 도착 처리',
    cooldownTicks: 2400, cost: 100,
    effect: (s) => {
      let target = -1;
      let max = 0;
      for (const f of s.building.floors) {
        if (f.queue.length > max) {
          max = f.queue.length;
          target = f.id;
        }
      }
      if (target < 0) return;
      const floor = s.building.floors[target]!;
      s.servedCount += floor.queue.length;
      for (const p of floor.queue) if (p.anger >= ANGER_THRESHOLD) s.angryServedCount += 1;
      floor.queue = [];
    },
  },
  'skill-slow-spawn': {
    id: 'skill-slow-spawn',
    name: '한산한 시간',
    desc: '20초간 승객 스폰 간격 ×2',
    cooldownTicks: 1800, cost: 60,
    effect: (s) => {
      s.params.spawnIntervalMultiplier = 2;
      s.skillTimers['skill-slow-spawn'] = 400;
    },
  },
};

export const MAX_SKILLS = 3;

export function skillById(id: string): SkillCard {
  const s = SKILLS[id];
  if (!s) throw new Error(`unknown skill: ${id}`);
  return s;
}

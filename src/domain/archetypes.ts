import { Phase } from './phase';

export type PassengerArchetype =
  | 'normal' | 'vip' | 'elderly' | 'suit'
  | 'group' | 'baggage' | 'shady' | 'tourist' | 'staff';

export interface ArchetypeSpec {
  id: PassengerArchetype;
  name: string;
  desc: string;
  color: number;
  goldMultiplier: number;
  angerMultiplier: number;
  spaceCost: number;           // 정원 차지
  loadTickBonus: number;       // 정차 시간 추가
  /** 빠른 처리 보너스 (anger 0~30% 도달 전 처리 시 골드 배수) */
  fastBonus: number;
  /** 페이즈별 스폰 가중치 (기본 1) */
  weightByPhase: Partial<Record<Phase, number>>;
  /** 그룹 스폰 인원 (1 = 단일, N = 동시에 N명 같은 origin/dest) */
  groupSize: number;
}

export const ARCHETYPES: Record<PassengerArchetype, ArchetypeSpec> = {
  normal:   { id:'normal',   name:'일반',         desc:'기본 손님',
              color: 0xf5f5f5, goldMultiplier:1.0, angerMultiplier:1.0, spaceCost:1, loadTickBonus:0, fastBonus:1.0, groupSize:1,
              weightByPhase: { morning:6, work:5, lunch:5, evening:6, night:3 } },
  vip:      { id:'vip',      name:'VIP',          desc:'중요 인사. 빠르면 거액',
              color: 0xffd700, goldMultiplier:1.5, angerMultiplier:2.0, spaceCost:1, loadTickBonus:0, fastBonus:3.0, groupSize:1,
              weightByPhase: { morning:1, work:1, evening:1 } },
  elderly:  { id:'elderly',  name:'노약자',       desc:'느린 승객. 정차 시간 +1, anger 관대',
              color: 0xb08cff, goldMultiplier:1.0, angerMultiplier:0.7, spaceCost:1, loadTickBonus:1, fastBonus:1.0, groupSize:1,
              weightByPhase: { morning:2, work:2, lunch:2, evening:2, night:2 } },
  suit:     { id:'suit',     name:'비즈니스',     desc:'시간이 돈. 골드 ↑ anger ↑',
              color: 0x4a90e2, goldMultiplier:1.5, angerMultiplier:1.3, spaceCost:1, loadTickBonus:0, fastBonus:1.5, groupSize:1,
              weightByPhase: { morning:3, lunch:2, evening:3 } },
  group:    { id:'group',    name:'단체',         desc:'3명 동시 등장. 같은 dest',
              color: 0xe67e22, goldMultiplier:1.0, angerMultiplier:1.0, spaceCost:1, loadTickBonus:0, fastBonus:1.0, groupSize:3,
              weightByPhase: { lunch:2 } },
  baggage:  { id:'baggage',  name:'짐꾼',         desc:'정원 2칸 차지, 골드 ×2',
              color: 0xc0a000, goldMultiplier:2.0, angerMultiplier:1.0, spaceCost:2, loadTickBonus:1, fastBonus:1.0, groupSize:1,
              weightByPhase: { morning:1, evening:1 } },
  shady:    { id:'shady',    name:'의심 인물',    desc:'받으면 anger ×2, 골드 절반',
              color: 0x6a3d3d, goldMultiplier:0.5, angerMultiplier:2.0, spaceCost:1, loadTickBonus:0, fastBonus:1.0, groupSize:1,
              weightByPhase: { night:3 } },
  tourist:  { id:'tourist',  name:'관광객',       desc:'골드 ×1.5',
              color: 0x7ed957, goldMultiplier:1.5, angerMultiplier:1.0, spaceCost:1, loadTickBonus:0, fastBonus:1.0, groupSize:1,
              weightByPhase: { lunch:1, evening:1 } },
  staff:    { id:'staff',    name:'직원',         desc:'골드 0, anger ×0.5',
              color: 0x4a4a55, goldMultiplier:0.0, angerMultiplier:0.5, spaceCost:1, loadTickBonus:0, fastBonus:1.0, groupSize:1,
              weightByPhase: { work:3, night:1 } },
};

export function spaceUsed(passengers: { archetype: PassengerArchetype }[]): number {
  let s = 0;
  for (const p of passengers) s += ARCHETYPES[p.archetype].spaceCost;
  return s;
}

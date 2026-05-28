/**
 * 승객 아키타입 메타데이터. 데이터는 data/archetypes.json 에 있음.
 * CMS (/cms.html) 에서 편집 가능.
 *
 * 새 archetype 추가하려면:
 *   1) data/archetypes.json 에 키 추가
 *   2) PassengerArchetype union type 에 키 추가 (TypeScript)
 *   3) 필요하면 스폰 로직(spawner.ts) 조건 추가
 */
import { Phase } from './phase';
import archetypeData from '../../data/archetypes.json';

export type PassengerArchetype =
  | 'normal' | 'vip' | 'elderly' | 'suit'
  | 'group' | 'baggage' | 'shady' | 'tourist' | 'staff'
  | 'thief'
  | 'patient' | 'medical' | 'hotel-guest' | 'crew';

export interface ArchetypeSpec {
  id: PassengerArchetype;
  name: string;
  desc: string;
  color: number;
  goldMultiplier: number;
  angerMultiplier: number;
  spaceCost: number;
  loadTickBonus: number;
  fastBonus: number;
  weightByPhase: Partial<Record<Phase, number>>;
  groupSize: number;
}

interface JsonArchetype {
  name: string;
  desc: string;
  color: string;        // "#rrggbb"
  goldMultiplier: number;
  angerMultiplier: number;
  spaceCost: number;
  loadTickBonus: number;
  fastBonus: number;
  weightByPhase: Partial<Record<Phase, number>>;
  groupSize: number;
}

function hexToNumber(hex: string): number {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  return parseInt(clean, 16);
}

function build(): Record<PassengerArchetype, ArchetypeSpec> {
  const json = archetypeData as Record<string, JsonArchetype>;
  const out: Record<string, ArchetypeSpec> = {};
  for (const [id, spec] of Object.entries(json)) {
    out[id] = {
      id: id as PassengerArchetype,
      name: spec.name,
      desc: spec.desc,
      color: hexToNumber(spec.color),
      goldMultiplier: spec.goldMultiplier,
      angerMultiplier: spec.angerMultiplier,
      spaceCost: spec.spaceCost,
      loadTickBonus: spec.loadTickBonus,
      fastBonus: spec.fastBonus,
      weightByPhase: spec.weightByPhase,
      groupSize: spec.groupSize,
    };
  }
  return out as Record<PassengerArchetype, ArchetypeSpec>;
}

export const ARCHETYPES: Record<PassengerArchetype, ArchetypeSpec> = build();

/** 도둑 dest 도착 시 골드 감소량 */
export const THIEF_GOLD_DAMAGE = 15;

export function spaceUsed(passengers: { archetype: PassengerArchetype }[]): number {
  let s = 0;
  for (const p of passengers) s += ARCHETYPES[p.archetype].spaceCost;
  return s;
}

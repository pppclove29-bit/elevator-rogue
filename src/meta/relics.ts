import { SimState } from '../domain/types';

export type RelicType = 'pure' | 'tradeoff' | 'curse';

export interface RelicEntry {
  id: string;
  name: string;
  desc: string;
  type: RelicType;
  apply(state: SimState): void;
}

export const RELICS: Record<string, RelicEntry> = {
  // Pure
  'r-revolving-door':  { id:'r-revolving-door', name:'회전문', desc:'엘베 정원 +1', type:'pure',
    apply: (s) => { for (const e of s.building.elevators) e.capacity += 1; } },
  'r-light-cage':      { id:'r-light-cage', name:'가벼운 케이지', desc:'엘베 속도 +10%', type:'pure',
    apply: (s) => { s.params.globalSpeedMultiplier *= 1.1; } },
  'r-host':            { id:'r-host', name:'친절한 안내원', desc:'불만 누적 -5%', type:'pure',
    apply: (s) => { s.params.angerWaitingPerTick *= 0.95; s.params.angerRidingPerTick *= 0.95; } },
  'r-24h-cafe':        { id:'r-24h-cafe', name:'24시간 카페', desc:'근무 페이즈 한산 (스폰 ×0.8)', type:'pure',
    apply: (s) => { s.params.phaseSpawnMultiplier.work *= 1.25; } },
  'r-security':        { id:'r-security', name:'보안 시스템', desc:'층 큐 상한 +2', type:'pure',
    apply: (s) => { s.params.floorCapacity += 2; } },
  'r-skill-keeper':    { id:'r-skill-keeper', name:'스킬 키퍼', desc:'스킬 쿨다운 -15%', type:'pure',
    apply: (s) => { s.params.skillCooldownMultiplier *= 0.85; } },
  'r-spare-key':       { id:'r-spare-key', name:'보조 키', desc:'시작 골드 +50 (지금 즉시)', type:'pure',
    apply: (s) => { s.gold += 50; } },
  'r-frequent-rider':  { id:'r-frequent-rider', name:'단골 우대', desc:'탑승 불만 누적 -25%', type:'pure',
    apply: (s) => { s.params.angerRidingPerTick *= 0.75; } },

  // Tradeoff
  'r-luxury-interior': { id:'r-luxury-interior', name:'럭셔리 인테리어', desc:'정원 +2, 속도 -10%', type:'tradeoff',
    apply: (s) => { for (const e of s.building.elevators) e.capacity += 2; s.params.globalSpeedMultiplier *= 0.9; } },
  'r-master-key':      { id:'r-master-key', name:'마스터 키', desc:'스킬 쿨다운 -30%, 불만 ↑10%', type:'tradeoff',
    apply: (s) => { s.params.skillCooldownMultiplier *= 0.7; s.params.angerWaitingPerTick *= 1.1; } },
  'r-night-contract':  { id:'r-night-contract', name:'야간 근무 협약', desc:'야간 스폰 ×0.5, 출근 ×1.3', type:'tradeoff',
    apply: (s) => { s.params.phaseSpawnMultiplier.night *= 2.0; s.params.phaseSpawnMultiplier.morning *= 0.77; } },
  'r-vip-pass':        { id:'r-vip-pass', name:'VIP 패스', desc:'정원 +3, 정차 시간 +2', type:'tradeoff',
    apply: (s) => { for (const e of s.building.elevators) e.capacity += 3; s.params.baseLoadTicks += 2; } },
  'r-overtime':        { id:'r-overtime', name:'야근 수당', desc:'골드 보상 +25% 효과 (시작 즉시 +30G)', type:'tradeoff',
    apply: (s) => { s.gold += 30; /* 매번 +25%는 별도 시스템 필요 — MVP 단순화 */ } },

  // Curse (디버프 렐릭)
  'r-old-cable':       { id:'r-old-cable', name:'노후 케이블', desc:'속도 -15% (영구)', type:'curse',
    apply: (s) => { s.params.globalSpeedMultiplier *= 0.85; } },
  'r-strict-union':    { id:'r-strict-union', name:'엄격한 노조', desc:'정차 시간 +2 (영구)', type:'curse',
    apply: (s) => { s.params.baseLoadTicks += 2; } },
  'r-complaint-board': { id:'r-complaint-board', name:'불만 게시판', desc:'불만 누적 +10% (영구)', type:'curse',
    apply: (s) => { s.params.angerWaitingPerTick *= 1.1; s.params.angerRidingPerTick *= 1.1; } },
};

export function relicById(id: string): RelicEntry {
  const r = RELICS[id]; if (!r) throw new Error(`unknown relic: ${id}`); return r;
}

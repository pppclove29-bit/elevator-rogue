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

  // 운송 수단 확장 (모디파이어로 통합)
  'r-escalator':       { id:'r-escalator', name:'에스컬레이터', desc:'한 층 차이(±1) 이동 승객은 엘베 안 거치고 즉시 처리', type:'pure',
    apply: (s) => { s.params.escalatorReach = Math.max(s.params.escalatorReach, 1); } },
  'r-escalator-pro':   { id:'r-escalator-pro', name:'에스컬레이터 확장', desc:'두 층 차이(±2)까지 즉시 처리', type:'pure',
    apply: (s) => { s.params.escalatorReach = Math.max(s.params.escalatorReach, 2); } },
  'r-subway-line':     { id:'r-subway-line', name:'지하철 노선 개통', desc:'로비(LB) 출발 승객 30% 즉시 흡수', type:'pure',
    apply: (s) => { s.params.subwayAbsorbChance = Math.max(s.params.subwayAbsorbChance, 0.3); } },
  'r-subway-express':  { id:'r-subway-express', name:'지하철 급행', desc:'로비 흡수 확률 +25% (누적)', type:'tradeoff',
    apply: (s) => { s.params.subwayAbsorbChance = Math.min(0.85, s.params.subwayAbsorbChance + 0.25); } },
  'r-helipad':         { id:'r-helipad', name:'옥상 헬리포트', desc:'옥상(RF) 도착 골드 ×2 (영구)', type:'pure',
    apply: (s) => { s.params.rooftopGoldMultiplier = Math.max(s.params.rooftopGoldMultiplier, 2); } },

  // 인력/시설
  'r-guard':           { id:'r-guard', name:'경비 고용', desc:'도둑 스폰 확률 -50% (영구)', type:'pure',
    apply: (s) => { s.params.thiefSpawnMultiplier *= 0.5; } },
  'r-guard-pro':       { id:'r-guard-pro', name:'경비 강화', desc:'도둑 스폰 확률 추가 -50%', type:'pure',
    apply: (s) => { s.params.thiefSpawnMultiplier *= 0.5; } },
  'r-janitor':         { id:'r-janitor', name:'청소부 고용', desc:'화장실 청결도 자동 회복 +0.3/tick', type:'pure',
    apply: (s) => { s.params.toiletCleanRate += 0.3; } },
  'r-janitor-pro':     { id:'r-janitor-pro', name:'청소반 확장', desc:'화장실 청결도 회복 +0.5/tick (누적)', type:'pure',
    apply: (s) => { s.params.toiletCleanRate += 0.5; } },
  'r-toilet-renovation':{ id:'r-toilet-renovation', name:'화장실 리모델링', desc:'모든 화장실 청결도 100으로 초기화 + 더러움 anger 가중 ×0.7', type:'pure',
    apply: (s) => {
      for (const f of s.building.floors) if (f.hasToilet) f.cleanliness = 100;
      s.params.dirtyToiletAngerMultiplier *= 0.7;
    } },
  'r-extra-toilet':    { id:'r-extra-toilet', name:'화장실 추가 신설', desc:'화장실이 없던 층 한 곳에 화장실 신설', type:'pure',
    apply: (s) => {
      const candidates = s.building.floors.filter((f) => !f.hasToilet && f.role !== 'rooftop' && f.role !== 'basement');
      if (candidates.length > 0) {
        const target = candidates[Math.floor(Math.random() * candidates.length)]!;
        target.hasToilet = true;
        target.cleanliness = 100;
      }
    } },

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

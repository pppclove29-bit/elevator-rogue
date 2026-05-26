import { startingSlotsForElevator } from '../domain/simulation';
import { defaultPolicy, SimState } from '../domain/types';

export interface UpgradeCard {
  id: string;
  name: string;
  desc: string;
  cost: number;
  /** true면 누적 구매 가능 (매물에서 안 사라짐). false면 1회 한정 (예: 엘베+1) */
  stackable: boolean;
  apply(state: SimState): void;
}

export const UPGRADES: Record<string, UpgradeCard> = {
  'upgrade-speed': {
    id: 'upgrade-speed', name: '엘베 속도 +20%', desc: '모든 엘리베이터 이동 속도 (누적)', cost: 30, stackable: true,
    apply: (s) => { for (const e of s.building.elevators) e.speedPerTick *= 1.2; },
  },
  'upgrade-capacity': {
    id: 'upgrade-capacity', name: '엘베 정원 +2', desc: '모든 엘리베이터 정원 (누적)', cost: 40, stackable: true,
    apply: (s) => { for (const e of s.building.elevators) e.capacity += 2; },
  },
  'upgrade-load-fast': {
    id: 'upgrade-load-fast', name: '신속 승하차', desc: '기본 정차 시간 -2 (최소 2, 누적)', cost: 30, stackable: true,
    apply: (s) => { s.params.baseLoadTicks = Math.max(2, s.params.baseLoadTicks - 2); },
  },
  'upgrade-anger-decay': {
    id: 'upgrade-anger-decay', name: '서비스 친절도', desc: '불만 누적 속도 -10% (누적)', cost: 50, stackable: true,
    apply: (s) => { s.params.angerWaitingPerTick *= 0.9; s.params.angerRidingPerTick *= 0.9; },
  },
  'upgrade-floor-capacity': {
    id: 'upgrade-floor-capacity', name: '대기 공간 확장 (+3)', desc: '층별 대기 상한 (누적)', cost: 40, stackable: true,
    apply: (s) => { s.params.floorCapacity += 3; },
  },
  'upgrade-add-elevator': {
    id: 'upgrade-add-elevator', name: '엘리베이터 +1', desc: '새 엘베 1대 (기존과 동일 스탯, 최대 3대)', cost: 150, stackable: false,
    apply: (s) => {
      const ref = s.building.elevators[0];
      const newId = s.building.elevators.length;
      s.building.elevators.push({
        id: newId, y: 0,
        speedPerTick: ref?.speedPerTick ?? 0.06,
        capacity: ref?.capacity ?? 6,
        loadTicks: ref?.loadTicks ?? 14,
        state: { kind: 'idle' }, passengers: [],
        tripCount: 0,
      });
      s.slotsByElevator[newId] = startingSlotsForElevator();
      s.policiesByElevator[newId] = defaultPolicy();
    },
  },
  'upgrade-repair-kit': {
    id: 'upgrade-repair-kit', name: '응급 수리 키트', desc: '고장 시 자동 즉시 복구 (소모성, 누적 보유)', cost: 60, stackable: true,
    apply: (s) => { s.repairKits = (s.repairKits ?? 0) + 1; },
  },
  'upgrade-durability': {
    id: 'upgrade-durability', name: '내구성 패키지', desc: '고장 확률 ×0.5 (영구, 누적)', cost: 80, stackable: true,
    apply: (s) => { s.params.breakdownMultiplier *= 0.5; },
  },
};

export const MAX_ELEVATORS = 3;

export function upgradeById(id: string): UpgradeCard {
  const c = UPGRADES[id];
  if (!c) throw new Error(`unknown upgrade: ${id}`);
  return c;
}

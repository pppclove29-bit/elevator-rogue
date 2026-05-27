import { FloorRole, SimState } from '../domain/types';

/** 빌딩 floors 중 office 역할 일부를 새 역할로 교체 (rooftop/lobby/basement 제외) */
function replaceOfficeFloors(s: SimState, replacements: FloorRole[]): void {
  const officeIndexes = s.building.floors
    .map((f, i) => (f.role === 'office' ? i : -1))
    .filter((i) => i >= 0);
  for (let i = 0; i < Math.min(replacements.length, officeIndexes.length); i++) {
    const floor = s.building.floors[officeIndexes[i]!]!;
    floor.role = replacements[i]!;
    const r = floor.role;
    floor.hasToilet = r === 'office' || r === 'restaurant' || r === 'mall' || r === 'hospital' || r === 'gym';
    if (!floor.hasToilet) floor.cleanliness = 100;
  }
}

export type ThemeId = 'office' | 'airport' | 'hospital' | 'hotel' | 'chaos';

export interface ThemeEntry {
  id: ThemeId;
  name: string;
  desc: string;
  /** 한 줄 슬로건 */
  flavor: string;
  /** 시작 골드 보정 */
  startingGoldBonus?: number;
  /** createSim 후 한 번만 호출. SimParams/Building 초기값 변형 */
  apply(state: SimState): void;
}

export const THEMES: Record<ThemeId, ThemeEntry> = {
  office: {
    id: 'office', name: '오피스 빌딩', flavor: '균형 잡힌 표준 운영',
    desc: '평범한 사무실 빌딩. 모든 메카닉의 기본값. 첫 플레이에 추천.',
    apply: () => {},
  },

  airport: {
    id: 'airport', name: '국제 공항', flavor: '짐과 단체손님의 행진',
    desc: '시작 층: parking + mall. 정원 +2, 정차 +2. 모든 페이즈 균등. 승무원/짐꾼 자주 등장.',
    startingGoldBonus: 15,
    apply: (s) => {
      s.params.phaseSpawnMultiplier.morning *= 0.85;
      s.params.phaseSpawnMultiplier.work *= 0.6;
      s.params.phaseSpawnMultiplier.lunch *= 0.85;
      s.params.phaseSpawnMultiplier.evening *= 0.85;
      s.params.phaseSpawnMultiplier.night *= 0.7;
      for (const e of s.building.elevators) e.capacity += 2;
      s.params.baseLoadTicks += 2;
      replaceOfficeFloors(s, ['parking', 'mall']);
    },
  },

  hospital: {
    id: 'hospital', name: '종합 병원', flavor: '청결이 곧 생명',
    desc: '시작 층: hospital + gym. 모든 층에 화장실 + 청결 빨리 떨어짐. 환자/의료진 자주 등장.',
    startingGoldBonus: 30,
    apply: (s) => {
      replaceOfficeFloors(s, ['hospital', 'gym']);
      for (const f of s.building.floors) {
        if (f.role !== 'basement' && f.role !== 'rooftop') f.hasToilet = true;
      }
      s.params.toiletCleanRate += 0.4;
      s.params.dirtyToiletAngerMultiplier *= 1.5;
    },
  },

  hotel: {
    id: 'hotel', name: '시티 호텔', flavor: '24시간 영업, 옥상이 핵심',
    desc: '시작 층: mall + penthouse. 야간 ×2.5 / 점심 ×1.4. 옥상 골드 ×2. 정원 -1.',
    startingGoldBonus: 50,
    apply: (s) => {
      s.params.phaseSpawnMultiplier.night *= 0.4;
      s.params.phaseSpawnMultiplier.lunch *= 0.7;
      s.params.rooftopGoldMultiplier = 2;
      for (const e of s.building.elevators) e.capacity = Math.max(4, e.capacity - 1);
      replaceOfficeFloors(s, ['mall', 'penthouse']);
    },
  },

  chaos: {
    id: 'chaos', name: '카오스 빌딩', flavor: '예측 불가의 운영',
    desc: '엘베 스탯·화/안저 누적·페이즈 가중치·빌딩 층 구성 모두 매 런 랜덤. 진짜 진면목 보기.',
    startingGoldBonus: 30,
    apply: (s) => {
      const rng = Math.random;
      // 엘베 스탯 랜덤화
      for (const e of s.building.elevators) {
        e.capacity = 3 + Math.floor(rng() * 8); // 3~10
        e.speedPerTick *= 0.7 + rng() * 0.8;     // ×0.7 ~ ×1.5
      }
      s.params.baseLoadTicks = 3 + Math.floor(rng() * 7);  // 3~9
      s.params.floorCapacity = 6 + Math.floor(rng() * 10); // 6~15
      s.params.angerWaitingPerTick *= 0.6 + rng() * 1.4;   // ×0.6 ~ ×2
      s.params.angerRidingPerTick *= 0.6 + rng() * 1.4;
      // 페이즈 가중치 랜덤
      const phases = ['morning', 'work', 'lunch', 'evening', 'night'] as const;
      for (const p of phases) {
        s.params.phaseSpawnMultiplier[p] *= 0.5 + rng() * 1.5;
      }
      // 도둑/옥상 골드 무작위 변동
      s.params.thiefSpawnMultiplier *= 0.5 + rng() * 2;
      s.params.rooftopGoldMultiplier *= 1 + rng();
      // 시작 골드 ±20G 변동
      s.gold += Math.floor((rng() - 0.5) * 40);
      // 일부 office 층을 랜덤 역할로 (60% 확률)
      const pool: FloorRole[] = ['mall', 'gym', 'hospital', 'cleanroom', 'penthouse', 'restaurant', 'parking'];
      for (const f of s.building.floors) {
        if (f.role !== 'office') continue;
        if (rng() < 0.6) {
          const newRole = pool[Math.floor(rng() * pool.length)]!;
          f.role = newRole;
          f.hasToilet = ['restaurant', 'mall', 'hospital', 'gym'].includes(newRole);
          if (!f.hasToilet) f.cleanliness = 100;
        }
      }
    },
  },
};

export const DEFAULT_THEME: ThemeId = 'office';

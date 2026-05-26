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

export type ThemeId = 'office' | 'hotel' | 'hospital' | 'airport';

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

  hotel: {
    id: 'hotel', name: '시티 호텔', flavor: '24시간 영업, 옥상이 핵심',
    desc: '시작 층: mall + penthouse 포함. 야간·점심·옥상 트래픽 폭증. 호텔 손님(캐리어) 자주 등장.',
    startingGoldBonus: 20,
    apply: (s) => {
      s.params.phaseSpawnMultiplier.night *= 0.4;
      s.params.phaseSpawnMultiplier.lunch *= 0.7;
      s.params.rooftopGoldMultiplier = 2;
      for (const e of s.building.elevators) e.capacity = Math.max(4, e.capacity - 1);
      replaceOfficeFloors(s, ['mall', 'penthouse']);
    },
  },

  hospital: {
    id: 'hospital', name: '종합 병원', flavor: '청결이 곧 생명',
    desc: '시작 층: hospital + gym 포함. 모든 층에 화장실 + 청결 빨리 떨어짐. 환자/의료진 자주 등장.',
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

  airport: {
    id: 'airport', name: '국제 공항', flavor: '짐과 단체손님의 행진',
    desc: '시작 층: parking + mall 포함. 모든 페이즈 균등. 승무원/짐꾼 자주 등장. 정원 +2, 정차 +2.',
    startingGoldBonus: 10,
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
};

export const DEFAULT_THEME: ThemeId = 'office';

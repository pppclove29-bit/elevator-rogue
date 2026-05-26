import { SimState } from '../domain/types';

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
    desc: '야간·점심·옥상 트래픽이 폭증. 정원은 작아도 사람들이 짐 많음. 야간 운영 자신 있다면.',
    startingGoldBonus: 20,
    apply: (s) => {
      s.params.phaseSpawnMultiplier.night *= 0.4;     // 야간 ×2.5
      s.params.phaseSpawnMultiplier.lunch *= 0.7;     // 점심 ×1.4
      s.params.rooftopGoldMultiplier = 2;             // 옥상 골드 ×2
      for (const e of s.building.elevators) e.capacity = Math.max(4, e.capacity - 1);
    },
  },

  hospital: {
    id: 'hospital', name: '종합 병원', flavor: '청결이 곧 생명',
    desc: '모든 층에 화장실 + 청결도 더 빨리 떨어짐. 대신 청결도 회복 자동 +0.4. 노약자/스태프 비중 ↑.',
    startingGoldBonus: 30,
    apply: (s) => {
      for (const f of s.building.floors) {
        if (f.role !== 'basement') f.hasToilet = true;
      }
      s.params.toiletCleanRate += 0.4;
      s.params.dirtyToiletAngerMultiplier *= 1.5;   // 더러우면 더 빡셈
    },
  },

  airport: {
    id: 'airport', name: '국제 공항', flavor: '짐과 단체손님의 행진',
    desc: '단체/짐꾼 비중 폭증. 모든 페이즈 균등 트래픽. 정원 +2 보너스, 단 정차 시간 +2.',
    startingGoldBonus: 10,
    apply: (s) => {
      // 모든 페이즈 균등화
      s.params.phaseSpawnMultiplier.morning *= 0.85;
      s.params.phaseSpawnMultiplier.work *= 0.6;
      s.params.phaseSpawnMultiplier.lunch *= 0.85;
      s.params.phaseSpawnMultiplier.evening *= 0.85;
      s.params.phaseSpawnMultiplier.night *= 0.7;
      for (const e of s.building.elevators) e.capacity += 2;
      s.params.baseLoadTicks += 2;
    },
  },
};

export const DEFAULT_THEME: ThemeId = 'office';

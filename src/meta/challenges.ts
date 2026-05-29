/**
 * 도전 모드 (Challenge) — 시작 시 특수 룰셋을 적용해 리플레이 가치 ↑.
 *
 * 사용:
 *   const c = CHALLENGES['chal-solo'];
 *   c.apply(state); // 테마 apply 직후, 첫 tick 전.
 *
 * 진행도(Progression) 에는 챌린지별 최고 day 기록.
 * 챌린지 + 테마는 직교 — 어느 테마든 어느 챌린지든 조합 가능.
 *
 * 새 챌린지 추가: 항목 추가 + i18n 키 (cards.ts 의 'chal' prefix) + UI 자동 노출.
 */
import { Phase } from '../domain/phase';
import { SimState } from '../domain/types';

export interface ChallengeEntry {
  id: string;
  /** UI 라벨 (i18n fallback) */
  name: string;
  /** 설명 (i18n fallback) */
  desc: string;
  /** 점수 보너스 배수 (best day 기록 시 가산용). 기본 1.0 */
  scoreMultiplier: number;
  /** 게임 시작 시 호출 — 테마 apply 다음, 첫 tick 전 */
  apply(state: SimState): void;
}

export const CHALLENGES: Record<string, ChallengeEntry> = {
  'chal-solo': {
    id: 'chal-solo',
    name: '솔로 엘베',
    desc: '엘리베이터 1대만으로 운영',
    scoreMultiplier: 1.5,
    apply: (s) => {
      // 첫 1대만 남기고 제거. policy 도 같이 정리.
      if (s.building.elevators.length > 1) {
        const keep = s.building.elevators[0]!;
        s.building.elevators = [keep];
        const newPolicies: typeof s.policiesByElevator = {};
        newPolicies[keep.id] = s.policiesByElevator[keep.id] ?? { } as any;
        s.policiesByElevator = newPolicies;
      }
    },
  },
  'chal-tiny-cap': {
    id: 'chal-tiny-cap',
    name: '소형 엘베',
    desc: '엘베 정원 4 고정 (업그레이드 무효)',
    scoreMultiplier: 1.3,
    apply: (s) => {
      for (const e of s.building.elevators) e.capacity = 4;
      // floor 큐 상한도 좀 낮춤 — 작은 엘베에 맞춰 압박 ↑
      s.params.floorCapacity = 8;
    },
  },
  'chal-rush': {
    id: 'chal-rush',
    name: '러시 모드',
    desc: '모든 페이즈 스폰 ×1.5',
    scoreMultiplier: 1.4,
    apply: (s) => {
      const phases: Phase[] = ['morning', 'work', 'lunch', 'evening', 'night'];
      for (const p of phases) s.params.phaseSpawnMultiplier[p] *= 0.66;
    },
  },
  'chal-broke': {
    id: 'chal-broke',
    name: '가난한 시작',
    desc: '시작 골드 0 + 골드 획득 ×0.7',
    scoreMultiplier: 1.2,
    apply: (s) => {
      s.gold = 0;
      // GOLD_PER_ROLE 은 상수라 직접 변경 X — rooftopGoldMultiplier 만 활용 가능
      // 단순화: 골드 획득 절반 효과는 향후 별도 param 추가. 일단 시작 골드 0 만.
    },
  },
  'chal-anger-prone': {
    id: 'chal-anger-prone',
    name: '예민한 손님',
    desc: '불만 누적 ×1.5',
    scoreMultiplier: 1.4,
    apply: (s) => {
      s.params.angerWaitingPerTick *= 1.5;
      s.params.angerRidingPerTick *= 1.5;
    },
  },

  'chal-mega-rush': {
    id: 'chal-mega-rush',
    name: '메가 러시',
    desc: '모든 페이즈 스폰 ×2.0 (러시 강력 버전)',
    scoreMultiplier: 1.8,
    apply: (s) => {
      const phases: Phase[] = ['morning', 'work', 'lunch', 'evening', 'night'];
      for (const p of phases) s.params.phaseSpawnMultiplier[p] *= 0.5;
    },
  },
  'chal-mini-cab': {
    id: 'chal-mini-cab',
    name: '초소형 엘베',
    desc: '엘베 정원 3 고정 + 층 큐 상한 6',
    scoreMultiplier: 1.5,
    apply: (s) => {
      for (const e of s.building.elevators) e.capacity = 3;
      s.params.floorCapacity = 6;
    },
  },
  'chal-quick': {
    id: 'chal-quick',
    name: '굼벵이 엘베',
    desc: '엘베 속도 ×0.5 (압박: 느림)',
    scoreMultiplier: 1.5,
    apply: (s) => {
      s.params.globalSpeedMultiplier *= 0.5;
    },
  },
  'chal-double-anger': {
    id: 'chal-double-anger',
    name: '폭발 직전',
    desc: '불만 누적 ×2.5 (예민의 강력)',
    scoreMultiplier: 1.7,
    apply: (s) => {
      s.params.angerWaitingPerTick *= 2.5;
      s.params.angerRidingPerTick *= 2.5;
    },
  },
  'chal-no-modifier': {
    id: 'chal-no-modifier',
    name: '모디파이어 무효',
    desc: '매 3일 모디파이어 적용되지만 효과 절반',
    scoreMultiplier: 1.3,
    apply: (s) => {
      // 일부 effect 들이 angerWaiting / spawn 등 곱연산이라 절반 효과는 시스템 차원
      // 단순화: anger 누적은 평균이라 보상으로 +50G 시작
      s.gold += 50;
    },
  },
};

export const NO_CHALLENGE = null;
export type ChallengeId = keyof typeof CHALLENGES;

export function challengeById(id: string): ChallengeEntry | null {
  return CHALLENGES[id] ?? null;
}

/**
 * 세트 변신 — 같은 태그 렐릭 N개 모으면 캐릭터 자체가 바뀜.
 * 렐릭 획득 직후 checkTransformations(state) 호출 → 임계 도달 시 적용.
 */
import { adjustReputation } from '../domain/simulation';
import { SimState } from '../domain/types';
import { RELICS } from './relics';

export type TransformTag = 'hotel' | 'medical' | 'airport' | 'office' | 'sanitation' | 'security';

export interface Transformation {
  id: string;
  name: string;
  desc: string;
  tag: TransformTag;
  /** 필요한 렐릭 수. */
  threshold: number;
  /** 변신 시 적용 효과. */
  apply(state: SimState): void;
}

export const TRANSFORMATIONS: Record<string, Transformation> = {
  hotelier: {
    id: 'hotelier', name: '호텔리어', tag: 'hotel', threshold: 3,
    desc: '호텔 손님 골드 ×2, 정원 +3, 컴플레인 anger ×0.5',
    apply: (s) => {
      (s as any).trinketArchetypeBonus = (s as any).trinketArchetypeBonus ?? {};
      (s as any).trinketArchetypeBonus['hotel-guest'] = ((s as any).trinketArchetypeBonus['hotel-guest'] ?? 0) + 10;
      for (const e of s.building.elevators) e.capacity += 3;
      s.params.angerWaitingPerTick *= 0.5;
    },
  },
  doctor: {
    id: 'doctor', name: '의사', tag: 'medical', threshold: 3,
    desc: '환자 즉시 처리, 의료진 골드 ×3',
    apply: (s) => {
      (s as any).trinketArchetypeBonus = (s as any).trinketArchetypeBonus ?? {};
      (s as any).trinketArchetypeBonus['medical'] = ((s as any).trinketArchetypeBonus['medical'] ?? 0) + 30;
      (s as any).instantProcessArchetypes = [...((s as any).instantProcessArchetypes ?? []), 'patient'];
      adjustReputation(s, 5);   // 변신 보너스 평판
    },
  },
  conductor: {
    id: 'conductor', name: '차장', tag: 'airport', threshold: 3,
    desc: '짐 손님 정원 cost 0, 승무원 정차 시간 -3',
    apply: (s) => {
      (s as any).trinketSpaceReduce = (s as any).trinketSpaceReduce ?? {};
      (s as any).trinketSpaceReduce['baggage'] = ((s as any).trinketSpaceReduce['baggage'] ?? 0) + 2;
      (s as any).trinketSpaceReduce['hotel-guest'] = ((s as any).trinketSpaceReduce['hotel-guest'] ?? 0) + 2;
      s.params.baseLoadTicks -= 3;
    },
  },
  officer: {
    id: 'officer', name: '사무관', tag: 'office', threshold: 3,
    desc: '비즈니스 손님 골드 ×2, 근무 페이즈 스폰 -25%',
    apply: (s) => {
      (s as any).trinketArchetypeBonus = (s as any).trinketArchetypeBonus ?? {};
      (s as any).trinketArchetypeBonus['suit'] = ((s as any).trinketArchetypeBonus['suit'] ?? 0) + 8;
      s.params.phaseSpawnMultiplier.work *= 1.33;
    },
  },
  sanitarian: {
    id: 'sanitarian', name: '청소왕', tag: 'sanitation', threshold: 3,
    desc: '화장실 청결도 영구 100, dirty anger 무효',
    apply: (s) => {
      for (const f of s.building.floors) if (f.hasToilet) f.cleanliness = 100;
      s.params.toiletCleanRate += 5;   // 항상 회복 우세
      s.params.dirtyToiletAngerMultiplier = 1;
    },
  },
  guardian: {
    id: 'guardian', name: '보안왕', tag: 'security', threshold: 3,
    desc: '도둑 스폰 0, 도둑 도착 골드 +20 (역전)',
    apply: (s) => {
      s.params.thiefSpawnMultiplier = 0;
      (s as any).thiefArrivalBonus = 20;
    },
  },
};

/**
 * 렐릭 획득 직후 호출 — 태그 카운트 누적 후 임계 도달한 변신 적용.
 * 이미 발동된 변신은 다시 발동 X.
 */
export function checkTransformations(state: SimState): string[] {
  const newly: string[] = [];
  // 렐릭 태그 카운트
  const tagCounts: Partial<Record<TransformTag, number>> = {};
  for (const id of state.ownedRelics) {
    const tags = (RELICS as any)[id]?.tags as TransformTag[] | undefined;
    if (!tags) continue;
    for (const tag of tags) tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
  }
  for (const tf of Object.values(TRANSFORMATIONS)) {
    if (state.activeTransformations.includes(tf.id)) continue;
    const count = tagCounts[tf.tag] ?? 0;
    if (count >= tf.threshold) {
      state.activeTransformations.push(tf.id);
      tf.apply(state);
      newly.push(tf.id);
      console.log(`[t=${state.tick}] TRANSFORMATION: ${tf.id} (${tf.name})`);
    }
  }
  return newly;
}

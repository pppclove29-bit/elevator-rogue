/**
 * 승객 경로 이벤트 — 큐/엘베 안에 머무는 동안 archetype 별로 발생하는 작은 사건.
 *
 * 목적:
 * - 이동 중 "그냥 기다리는 점"이 아니라 시각/메카닉적 미니 사건이 자주 보이게.
 * - 데이터 주도가 아닌, archetype별 코드 분기로 충분 (수 적음).
 *
 * 현재 구현된 이벤트:
 * - 도둑 (thief) 큐 절도: 같은 큐에 절도 가능한 승객이 있으면 매 tick 0.3% 확률로 골드 -2~-5.
 *   시각: 도둑 위에 "$+", 피해자 위에 "$-".
 * - 환자 (patient) 큐 쓰러짐: anger ≥ 60 이고 매 tick 0.5% 확률로 anger 100 강제.
 *   시각: 환자 위에 "!!".
 *
 * 메카닉 추가 시: 이 파일에 archetype 별 함수 + state.visualHints.push 만 해주면 끝.
 */
import { Rng } from './rng';
import { SimState } from './types';

const THIEF_QUEUE_THEFT_CHANCE = 0.003;
const PATIENT_COLLAPSE_CHANCE = 0.005;
const PATIENT_COLLAPSE_ANGER_THRESHOLD = 60;

const THEFT_VICTIM_ARCHETYPES = new Set([
  'normal', 'vip', 'elderly', 'suit', 'tourist', 'baggage', 'hotel-guest', 'staff',
]);

export function tickPassengerEvents(state: SimState, rng: Rng): void {
  for (const f of state.building.floors) {
    if (f.queue.length === 0) continue;

    for (const p of f.queue) {
      // ── 도둑 큐 절도 ────────────────────────
      if (p.archetype === 'thief' && p.anger < 100) {
        if (rng() < THIEF_QUEUE_THEFT_CHANCE) {
          // 같은 큐의 다른 승객 중 절도 대상 1명 무작위
          const victims = f.queue.filter(
            (o) => o.id !== p.id && THEFT_VICTIM_ARCHETYPES.has(o.archetype),
          );
          if (victims.length > 0) {
            const v = victims[Math.floor(rng() * victims.length)]!;
            const loss = 2 + Math.floor(rng() * 4); // 2~5G
            state.gold = Math.max(0, state.gold - loss);
            state.visualHints.push({
              kind: 'pathEvent', floorId: f.id, passengerId: p.id,
              text: `+${loss}G`, color: 0xe2a04a,
            });
            state.visualHints.push({
              kind: 'pathEvent', floorId: f.id, passengerId: v.id,
              text: `-${loss}G`, color: 0xe74c3c,
            });
          }
        }
      }

      // ── 환자 큐 쓰러짐 ──────────────────────
      if (p.archetype === 'patient' && p.anger >= PATIENT_COLLAPSE_ANGER_THRESHOLD && p.anger < 100) {
        if (rng() < PATIENT_COLLAPSE_CHANCE) {
          p.anger = 100;
          state.visualHints.push({
            kind: 'pathEvent', floorId: f.id, passengerId: p.id,
            text: '!!', color: 0xe74c3c,
          });
        }
      }
    }
  }
}

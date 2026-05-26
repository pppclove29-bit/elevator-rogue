import { Rng } from '../domain/rng';
import { SimState } from '../domain/types';

export type EventSeverity = 'mild' | 'major' | 'critical';

export interface EventEntry {
  id: string;
  name: string;
  desc: string;
  severity: EventSeverity;
  /** 이 day 이후만 발생 (랜덤 풀 진입 가능). 기본 0 */
  minDay?: number;
  /** 이 day들엔 무조건 발생 (랜덤 굴림 무시). 마일스톤/보스 day용 */
  pinnedDays?: number[];
  /** 매 N일마다 고정 발생 (offset day부터). minDay와 함께 적용. 예: { every: 7 } = 7,14,21,... */
  cadence?: { every: number; offset?: number };
  /** day 시작 시 호출. 발동 여부 결정 + 즉시 효과 + cleanup 반환 (지속형) */
  trigger(state: SimState, rng: Rng, day: number): null | { durationTicks: number; cleanup: () => void };
}

// ─────────────────────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────────────────────
function mulSpawn(state: SimState, factor: number): () => void {
  state.params.spawnIntervalMultiplier *= factor;
  return () => { state.params.spawnIntervalMultiplier /= factor; };
}

function setBrokenRandomElevator(state: SimState, rng: Rng): number | null {
  const candidates = state.building.elevators.filter((e) => e.state.kind !== 'broken');
  if (candidates.length === 0) return null;
  const target = candidates[Math.floor(rng() * candidates.length)]!;
  target.state = { kind: 'broken' };
  return target.id;
}

// ─────────────────────────────────────────────────────────────
// 이벤트 풀
// ─────────────────────────────────────────────────────────────
export const EVENTS: Record<string, EventEntry> = {
  'ev-fire-alarm': {
    id: 'ev-fire-alarm', name: '화재 경보',
    desc: '모든 층 대기 승객이 1F(로비)로 dest 강제',
    severity: 'major',
    trigger: (s) => {
      for (const f of s.building.floors) {
        if (f.id === 0) continue;
        for (const p of f.queue) p.dest = 0;
      }
      for (const e of s.building.elevators) for (const p of e.passengers) p.dest = 0;
      return null; // 일회성
    },
  },

  'ev-blackout': {
    id: 'ev-blackout', name: '정전',
    desc: '랜덤 엘베 1대 30초 정지 (Day 4 이후)',
    severity: 'major',
    minDay: 4,
    trigger: (s, rng) => {
      const id = setBrokenRandomElevator(s, rng);
      if (id === null) return null;
      // 30초 후 자동 복구 (broken은 영구지만 이벤트는 일시)
      const dur = Math.floor(30 * 1000 / 50); // 600 ticks
      return {
        durationTicks: dur,
        cleanup: () => {
          const e = s.building.elevators[id];
          if (e && e.state.kind === 'broken') { e.state = { kind: 'idle' }; e.tripCount = 0; }
        },
      };
    },
  },

  'ev-vip-arrival': {
    id: 'ev-vip-arrival', name: 'VIP 도착',
    desc: '하루 종일 옥상 dest 가중치 ×5',
    severity: 'mild',
    trigger: (s) => {
      // 페이즈 가중치는 spawn interval에만 영향. dest 가중치 변경은 PHASE_TRAFFIC 상수 직접 mutate
      // PHASE_TRAFFIC은 phase.ts에서 const로 export. 변경 시 영향. cleanup으로 복원.
      // 단순화: roof spawn 가중치 + 보너스 골드 +30G
      s.gold += 30;
      return null;
    },
  },

  'ev-protest': {
    id: 'ev-protest', name: '시위',
    desc: '하루 종일 lobby 호출 가중치 ×0.3 (lobby 콜 줄어듦)',
    severity: 'major',
    trigger: (s) => {
      // 단순화: 전체 스폰 -20% + 골드 손해 -10G (시위로 영업 피해)
      s.gold = Math.max(0, s.gold - 10);
      const u = mulSpawn(s, 1.4);
      return { durationTicks: Math.floor(150 * 1000 / 50), cleanup: u };
    },
  },

  'ev-newyear': {
    id: 'ev-newyear', name: '신년 카운트다운',
    desc: '특정일 한정 — 보너스 +80G',
    severity: 'critical',
    pinnedDays: [10, 20, 30],
    trigger: (s) => {
      s.gold += 80;
      return null;
    },
  },

  'ev-lunch-delivery': {
    id: 'ev-lunch-delivery', name: '도시락 일제 배달',
    desc: '오늘 LUNCH 스폰 ×2',
    severity: 'mild',
    trigger: (s) => {
      const orig = s.params.phaseSpawnMultiplier.lunch;
      s.params.phaseSpawnMultiplier.lunch *= 0.5;
      return {
        durationTicks: Math.floor(150 * 1000 / 50),
        cleanup: () => { s.params.phaseSpawnMultiplier.lunch = orig; },
      };
    },
  },

  'ev-bonus-day': {
    id: 'ev-bonus-day', name: '보너스 데이',
    desc: '시작 즉시 +40G',
    severity: 'mild',
    trigger: (s) => { s.gold += 40; return null; },
  },

  'ev-strike': {
    id: 'ev-strike', name: '엘리베이터 파업',
    desc: '모든 엘베 30초 정지 (Day 8 이후)',
    severity: 'critical',
    minDay: 8,
    trigger: (s) => {
      const orig = s.building.elevators.map((e) => e.state);
      for (const e of s.building.elevators) e.state = { kind: 'broken' };
      const dur = Math.floor(30 * 1000 / 50);
      return {
        durationTicks: dur,
        cleanup: () => {
          for (let i = 0; i < s.building.elevators.length; i++) {
            const e = s.building.elevators[i]!;
            if (e.state.kind === 'broken') {
              e.state = orig[i] ?? { kind: 'idle' };
              if (e.state.kind === 'broken') e.state = { kind: 'idle' };
              e.tripCount = 0;
            }
          }
        },
      };
    },
  },

  'ev-mass-evac': {
    id: 'ev-mass-evac', name: '대피 훈련',
    desc: '예정된 훈련일 — 각 층 큐 +2 (dest=로비)',
    severity: 'major',
    cadence: { every: 7, offset: 5 }, // Day 5, 12, 19, 26 ...
    trigger: (s) => {
      for (const f of s.building.floors) {
        if (f.id === 0) continue;
        for (let i = 0; i < 2; i++) {
          f.queue.push({
            id: s.nextPassengerId++,
            origin: f.id, dest: 0,
            spawnTick: s.tick, anger: 0,
            archetype: 'normal',
          });
        }
      }
      return null;
    },
  },

  'ev-restaurant-festival': {
    id: 'ev-restaurant-festival', name: '식당가 축제',
    desc: '오늘 RT 처리 골드 ×2 (보너스 +20G 즉시)',
    severity: 'mild',
    trigger: (s) => { s.gold += 20; return null; },
  },

  // ─────────────────────────────────────────────────────────────
  // 보스 day (매 7일 고정. 강력 디버프 + 보너스 골드)
  // ─────────────────────────────────────────────────────────────
  'ev-boss-weekend-rush': {
    id: 'ev-boss-weekend-rush', name: '🔥 보스 — 주말 대혼란',
    desc: '하루 종일 모든 페이즈 스폰 ×1.5. 시작 보너스 +100G.',
    severity: 'critical',
    pinnedDays: [7],
    trigger: (s) => {
      s.gold += 100;
      const u = mulSpawn(s, 0.66);
      return { durationTicks: Math.floor(150 * 1000 / 50), cleanup: u };
    },
  },
  'ev-boss-night-storm': {
    id: 'ev-boss-night-storm', name: '🔥 보스 — 야간 폭주',
    desc: 'NIGHT 스폰 ×5. 시작 보너스 +120G.',
    severity: 'critical',
    pinnedDays: [14],
    trigger: (s) => {
      s.gold += 120;
      const orig = s.params.phaseSpawnMultiplier.night;
      s.params.phaseSpawnMultiplier.night *= 0.2;
      return {
        durationTicks: Math.floor(150 * 1000 / 50),
        cleanup: () => { s.params.phaseSpawnMultiplier.night = orig; },
      };
    },
  },
  'ev-boss-vip-conference': {
    id: 'ev-boss-vip-conference', name: '🔥 보스 — VIP 컨퍼런스',
    desc: '옥상 트래픽 ×3, 불만 누적 ×1.3. 시작 보너스 +150G.',
    severity: 'critical',
    pinnedDays: [21],
    trigger: (s) => {
      s.gold += 150;
      const u1 = mulSpawn(s, 0.7);
      const u2 = (() => {
        s.params.angerWaitingPerTick *= 1.3;
        return () => { s.params.angerWaitingPerTick /= 1.3; };
      })();
      return {
        durationTicks: Math.floor(150 * 1000 / 50),
        cleanup: () => { u1(); u2(); },
      };
    },
  },
  'ev-boss-grand-opening': {
    id: 'ev-boss-grand-opening', name: '🔥 보스 — 그랜드 오프닝',
    desc: '모든 페이즈 스폰 ×2, 정원 -1. 시작 보너스 +200G.',
    severity: 'critical',
    pinnedDays: [28],
    trigger: (s) => {
      s.gold += 200;
      const u1 = mulSpawn(s, 0.5);
      const orig = s.building.elevators.map((e) => e.capacity);
      for (const e of s.building.elevators) e.capacity = Math.max(1, e.capacity - 1);
      return {
        durationTicks: Math.floor(150 * 1000 / 50),
        cleanup: () => {
          u1();
          for (let i = 0; i < s.building.elevators.length; i++) {
            const o = orig[i]; if (o !== undefined) s.building.elevators[i]!.capacity = o;
          }
        },
      };
    },
  },
  'ev-boss-anniversary': {
    id: 'ev-boss-anniversary', name: '🔥 보스 — 창립 기념일',
    desc: '모든 페이즈 스폰 ×2.5, 속도 -20%. 시작 보너스 +350G.',
    severity: 'critical',
    pinnedDays: [35, 50, 65, 80],
    trigger: (s) => {
      s.gold += 350;
      const u1 = mulSpawn(s, 0.4);
      s.params.globalSpeedMultiplier *= 0.8;
      return {
        durationTicks: Math.floor(150 * 1000 / 50),
        cleanup: () => {
          u1();
          s.params.globalSpeedMultiplier /= 0.8;
        },
      };
    },
  },

  'ev-subway-strike': {
    id: 'ev-subway-strike', name: '지하철 파업',
    desc: '오늘 로비 트래픽 ×1.7 (지하철 안 다녀 사람들이 1F로 몰림)',
    severity: 'major',
    minDay: 6,
    trigger: (s) => {
      const orig = s.params.subwayAbsorbChance;
      s.params.subwayAbsorbChance = 0; // 흡수 무력화
      const u = mulSpawn(s, 0.6);     // 전체 스폰 ↑
      return {
        durationTicks: Math.floor(150 * 1000 / 50),
        cleanup: () => { s.params.subwayAbsorbChance = orig; u(); },
      };
    },
  },
};

export interface EventTriggerConfig {
  chancePerDay: number;
  startDay: number; // 이 day부터 발동 가능
}

export const EVENT_CONFIG: EventTriggerConfig = {
  chancePerDay: 0.35,
  startDay: 2,
};

export function rollDailyEvent(rng: Rng, day: number): EventEntry | null {
  const all = Object.values(EVENTS);

  // 1. 고정 이벤트 (pinnedDays / cadence) — minDay 적용. 우선순위 최우선.
  for (const ev of all) {
    if (ev.minDay !== undefined && day < ev.minDay) continue;
    if (ev.pinnedDays?.includes(day)) return ev;
    if (ev.cadence) {
      const offset = ev.cadence.offset ?? 0;
      if (day >= offset && (day - offset) % ev.cadence.every === 0) return ev;
    }
  }

  // 2. 랜덤 풀 (chancePerDay 확률, minDay 필터, 고정 일정 제외)
  if (day < EVENT_CONFIG.startDay) return null;
  if (rng() >= EVENT_CONFIG.chancePerDay) return null;
  const pool = all.filter((ev) => {
    if (ev.minDay !== undefined && day < ev.minDay) return false;
    if (ev.pinnedDays || ev.cadence) return false; // 고정 일정 이벤트는 랜덤 풀 X
    return true;
  });
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)] ?? null;
}

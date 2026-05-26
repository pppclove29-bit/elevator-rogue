import { FloorRole } from './types';

export type Phase = 'morning' | 'work' | 'lunch' | 'evening' | 'night';

export const PHASES: Phase[] = ['morning', 'work', 'lunch', 'evening', 'night'];

export const PHASE_TICKS: Record<Phase, number> = {
  morning: 600,
  work: 900,
  lunch: 600,
  evening: 600,
  night: 300,
};

export const PHASE_LABEL: Record<Phase, string> = {
  morning: '출근',
  work: '근무',
  lunch: '점심',
  evening: '퇴근',
  night: '야간',
};

export const PHASE_SPAWN_INTERVAL: Record<Phase, number> = {
  morning: 36,
  work: 80,
  lunch: 32,
  evening: 36,
  night: 160,
};

export type RoleWeights = Partial<Record<FloorRole, number>>;

export interface PhaseTraffic {
  origin: RoleWeights;
  dest: RoleWeights;
}

export const PHASE_TRAFFIC: Record<Phase, PhaseTraffic> = {
  morning: {
    origin: { lobby: 8, basement: 2 },
    dest: { office: 8, rooftop: 1, restaurant: 1 },
  },
  work: {
    origin: { office: 5, lobby: 2, restaurant: 1, rooftop: 1 },
    dest: { office: 4, lobby: 3, restaurant: 2, rooftop: 1 },
  },
  lunch: {
    origin: { office: 7, lobby: 2, rooftop: 1 },
    dest: { restaurant: 7, lobby: 2, rooftop: 1 },
  },
  evening: {
    origin: { office: 7, restaurant: 2, rooftop: 1 },
    dest: { lobby: 9, basement: 1 },
  },
  night: {
    origin: { office: 3, lobby: 3, restaurant: 2, rooftop: 1, basement: 1 },
    dest: { lobby: 4, office: 2, rooftop: 2, basement: 2 },
  },
};

export function dayLengthTicks(): number {
  let total = 0;
  for (const p of PHASES) total += PHASE_TICKS[p];
  return total;
}

export interface PhaseInfo {
  phase: Phase;
  day: number;
  tickInPhase: number;
  phaseTicks: number;
}

export function phaseAtTick(globalTick: number): PhaseInfo {
  const day = Math.floor(globalTick / dayLengthTicks());
  let t = globalTick - day * dayLengthTicks();
  for (const p of PHASES) {
    const len = PHASE_TICKS[p];
    if (t < len) {
      return { phase: p, day, tickInPhase: t, phaseTicks: len };
    }
    t -= len;
  }
  const last = PHASES[PHASES.length - 1]!;
  return { phase: last, day, tickInPhase: PHASE_TICKS[last] - 1, phaseTicks: PHASE_TICKS[last] };
}

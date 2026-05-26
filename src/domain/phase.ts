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
    origin: { lobby: 8, basement: 2, parking: 3 },
    dest: { office: 8, rooftop: 1, restaurant: 1, gym: 3, hospital: 2 },
  },
  work: {
    origin: { office: 5, lobby: 2, restaurant: 1, rooftop: 1, hospital: 2 },
    dest: { office: 4, lobby: 3, restaurant: 2, rooftop: 1, hospital: 2, cleanroom: 1, mall: 1 },
  },
  lunch: {
    origin: { office: 7, lobby: 2, rooftop: 1, gym: 2 },
    dest: { restaurant: 7, lobby: 2, rooftop: 1, mall: 3 },
  },
  evening: {
    origin: { office: 7, restaurant: 2, rooftop: 1, mall: 2, gym: 2 },
    dest: { lobby: 9, basement: 1, parking: 3 },
  },
  night: {
    origin: { office: 2, lobby: 3, restaurant: 2, rooftop: 1, basement: 1, hospital: 2, penthouse: 1 },
    dest: { lobby: 4, office: 2, rooftop: 2, basement: 2, penthouse: 2 },
  },
};

export function dayLengthTicks(): number {
  let total = 0;
  for (const p of PHASES) total += PHASE_TICKS[p];
  return total;
}

// ─── 요일 시스템 ────────────────────────────────────────
export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
const WEEK_ORDER: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const DAY_OF_WEEK_LABEL: Record<DayOfWeek, string> = {
  mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일',
};
export const WEEKEND: ReadonlySet<DayOfWeek> = new Set(['sat', 'sun']);

/** day는 1부터 시작 (state.dayCompleted + 1). Day 1 = 1월 1일 = 월요일. */
export function dayOfWeekFor(day: number): DayOfWeek {
  return WEEK_ORDER[((day - 1) % 7 + 7) % 7]!;
}

/** 평년 캘린더. Day 1 = 1월 1일. */
const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const YEAR_DAYS = 365;
const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

export interface CalendarDate {
  year: number;     // 1년차(=1), 2년차(=2), ...
  month: number;    // 1~12
  date: number;     // 1~31
  monthName: string;
  dayOfWeek: DayOfWeek;
}

export function dayToDate(day: number): CalendarDate {
  const year = Math.floor((day - 1) / YEAR_DAYS) + 1;
  let remaining = ((day - 1) % YEAR_DAYS) + 1;
  let month = 1;
  for (let m = 0; m < 12; m++) {
    if (remaining <= MONTH_DAYS[m]!) { month = m + 1; break; }
    remaining -= MONTH_DAYS[m]!;
  }
  return {
    year, month, date: remaining,
    monthName: MONTH_NAMES[month - 1]!,
    dayOfWeek: dayOfWeekFor(day),
  };
}

/** month, date → day 변환 (1년차 기준) */
export function dateToDay(month: number, date: number): number {
  let d = date;
  for (let m = 0; m < month - 1; m++) d += MONTH_DAYS[m]!;
  return d;
}

/** 요일별 phase 스폰 간격 배수. 1보다 작으면 스폰 더 빠름. */
export const DAY_OF_WEEK_SPAWN_MUL: Record<DayOfWeek, Partial<Record<Phase, number>>> = {
  mon: { morning: 0.85 },               // 월요병: 출근 트래픽 +18%
  tue: {},
  wed: {},
  thu: {},
  fri: { evening: 0.7 },                // 불금: 퇴근 +43%
  sat: { morning: 1.5, work: 1.5, lunch: 0.8, evening: 1.2 },  // 주말 사무실 한산, 점심 분주
  sun: { morning: 2.5, work: 3.0, evening: 2.0, lunch: 1.2 },  // 일요일 거의 비어있음
};

/** 요일별 골드 배수 (처리 시 모든 골드 ×). 주말 보너스. */
export const DAY_OF_WEEK_GOLD_MUL: Record<DayOfWeek, number> = {
  mon: 1, tue: 1, wed: 1, thu: 1, fri: 1,
  sat: 1.2, sun: 1.1,
};

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

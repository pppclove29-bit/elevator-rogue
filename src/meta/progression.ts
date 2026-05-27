import { ThemeId } from './themes';

const KEY = 'elevator-rogue.progression.v1';

export interface Progression {
  version: 1;
  unlockedThemes: ThemeId[];
  /** 테마별 최고 도달 일자 */
  bestDayByTheme: Partial<Record<ThemeId, number>>;
  /** 누적 처리 승객 */
  totalServed: number;
  /** 누적 골드 (한 런 종료 시 final gold 합) */
  totalGoldEarned: number;
  /** 누적 불만 처리 */
  totalAngryServed: number;
  /** 게임오버 횟수 */
  totalRuns: number;
  /** 전체 테마 통틀어 최고 일자 */
  bestDayOverall: number;
  /** 도전 모드별 최고 일자 (chal id → day) */
  bestDayByChallenge?: Record<string, number>;
}

/** 테마별 해금 조건 — 난이도 점증. "어느 테마든" 조건 만족 시 해금. */
export const UNLOCK_REQUIREMENTS: Array<{
  theme: ThemeId;
  requireDay: number;
  requireTheme?: ThemeId;
  /** 4개 기본 테마 모두 이 일자 이상 달성 시 해금 (chaos용) */
  requireAllThemesBest?: number;
  label: string;
}> = [
  { theme: 'office',   requireDay: 0,  label: '시작 테마' },
  { theme: 'airport',  requireDay: 7,  requireTheme: 'office', label: '오피스 빌딩에서 7일차 도달' },
  { theme: 'hospital', requireDay: 14, label: '어떤 테마든 14일차 도달' },
  { theme: 'hotel',    requireDay: 21, label: '어떤 테마든 21일차 도달' },
  { theme: 'chaos',    requireDay: 0,  requireAllThemesBest: 7, label: '오피스/공항/병원/호텔 모두 7일차 이상 도달' },
];

export function loadProgression(): Progression {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    try {
      const data = JSON.parse(raw) as Progression;
      if (data.version === 1) return ensureFields(data);
    } catch { /* fallthrough */ }
  }
  return { version: 1, unlockedThemes: ['office'], bestDayByTheme: {}, totalServed: 0, totalGoldEarned: 0, totalAngryServed: 0, totalRuns: 0, bestDayOverall: 0 };
}

/** localStorage 로드 시 옛 버전이면 누락 필드 보강 */
function ensureFields(p: Progression): Progression {
  return {
    ...p,
    totalGoldEarned: p.totalGoldEarned ?? 0,
    totalAngryServed: p.totalAngryServed ?? 0,
    bestDayOverall: p.bestDayOverall ?? Math.max(0, ...Object.values(p.bestDayByTheme).filter((v): v is number => typeof v === 'number')),
  };
}

export function saveProgression(p: Progression): void {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { console.warn('[progression] save fail', e); }
}

export function isUnlocked(p: Progression, theme: ThemeId): boolean {
  return p.unlockedThemes.includes(theme);
}

export function unlockLabel(theme: ThemeId): string {
  return UNLOCK_REQUIREMENTS.find((u) => u.theme === theme)?.label ?? '';
}

/** 새 day 도달 시 호출. 새로 해금된 테마 id 리스트 반환. */
export function recordDayReached(p: Progression, themeId: ThemeId, day: number): ThemeId[] {
  const prevBest = p.bestDayByTheme[themeId] ?? 0;
  if (day > prevBest) p.bestDayByTheme[themeId] = day;
  if (day > p.bestDayOverall) p.bestDayOverall = day;

  const newly: ThemeId[] = [];
  for (const req of UNLOCK_REQUIREMENTS) {
    if (p.unlockedThemes.includes(req.theme)) continue;
    // 4테마 모두 N일 이상 조건 (chaos용)
    if (req.requireAllThemesBest !== undefined) {
      const base: ThemeId[] = ['office', 'airport', 'hospital', 'hotel'];
      const allOK = base.every((tid) => (p.bestDayByTheme[tid] ?? 0) >= req.requireAllThemesBest!);
      if (allOK) { p.unlockedThemes.push(req.theme); newly.push(req.theme); }
      continue;
    }
    if (req.requireDay <= 0) continue;
    if (req.requireTheme) {
      const best = p.bestDayByTheme[req.requireTheme] ?? 0;
      if (best >= req.requireDay) { p.unlockedThemes.push(req.theme); newly.push(req.theme); }
    } else {
      const maxBest = Math.max(0, ...Object.values(p.bestDayByTheme).filter((v): v is number => typeof v === 'number'));
      if (maxBest >= req.requireDay) { p.unlockedThemes.push(req.theme); newly.push(req.theme); }
    }
  }
  return newly;
}

/** 게임오버 시 누적 통계 + 마지막 day로 한 번 더 평가. challengeId 있으면 별도 기록. */
export function recordRunEnd(p: Progression, themeId: ThemeId, finalDay: number, served: number, gold: number = 0, angry: number = 0, challengeId: string | null = null): ThemeId[] {
  p.totalRuns += 1;
  p.totalServed += served;
  p.totalGoldEarned += gold;
  p.totalAngryServed += angry;
  if (challengeId) {
    if (!p.bestDayByChallenge) p.bestDayByChallenge = {};
    const prev = p.bestDayByChallenge[challengeId] ?? 0;
    if (finalDay > prev) p.bestDayByChallenge[challengeId] = finalDay;
    // 챌린지 모드는 테마 best day 에는 영향 X — 통계용만
    return [];
  }
  return recordDayReached(p, themeId, finalDay);
}

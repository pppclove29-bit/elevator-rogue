import { ThemeId } from './themes';

const KEY = 'elevator-rogue.progression.v1';

export interface Progression {
  version: 1;
  unlockedThemes: ThemeId[];
  /** 테마별 최고 도달 일자 */
  bestDayByTheme: Partial<Record<ThemeId, number>>;
  /** 누적 처리 승객 (메타 통계) */
  totalServed: number;
  /** 게임오버 횟수 */
  totalRuns: number;
}

/** 테마별 해금 조건 — 점진적 진행. "어느 테마든" 조건을 만족하면 해금. */
export const UNLOCK_REQUIREMENTS: Array<{ theme: ThemeId; requireDay: number; requireTheme?: ThemeId; label: string }> = [
  { theme: 'office', requireDay: 0, label: '시작 테마' },
  { theme: 'hotel', requireDay: 7, requireTheme: 'office', label: '오피스 빌딩에서 7일차 도달' },
  { theme: 'hospital', requireDay: 14, label: '어떤 테마든 14일차 도달' },
  { theme: 'airport', requireDay: 21, label: '어떤 테마든 21일차 도달' },
];

export function loadProgression(): Progression {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    try {
      const data = JSON.parse(raw) as Progression;
      if (data.version === 1) return data;
    } catch { /* fallthrough */ }
  }
  return { version: 1, unlockedThemes: ['office'], bestDayByTheme: {}, totalServed: 0, totalRuns: 0 };
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

  const newly: ThemeId[] = [];
  for (const req of UNLOCK_REQUIREMENTS) {
    if (p.unlockedThemes.includes(req.theme)) continue;
    if (req.requireDay <= 0) continue;
    // requireTheme이 지정되면 그 테마에서만 카운트
    if (req.requireTheme) {
      const best = p.bestDayByTheme[req.requireTheme] ?? 0;
      if (best >= req.requireDay) { p.unlockedThemes.push(req.theme); newly.push(req.theme); }
    } else {
      // 어느 테마든 best 중 최대값 사용
      const maxBest = Math.max(0, ...Object.values(p.bestDayByTheme).filter((v): v is number => typeof v === 'number'));
      if (maxBest >= req.requireDay) { p.unlockedThemes.push(req.theme); newly.push(req.theme); }
    }
  }
  return newly;
}

/** 게임오버 시 누적 통계 + 마지막 day로 한 번 더 평가 */
export function recordRunEnd(p: Progression, themeId: ThemeId, finalDay: number, served: number): ThemeId[] {
  p.totalRuns += 1;
  p.totalServed += served;
  return recordDayReached(p, themeId, finalDay);
}

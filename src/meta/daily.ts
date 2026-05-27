/**
 * 일일 챌린지 — 오늘 날짜로 시드 고정 + 챌린지 1개 자동 선택.
 *
 * - 시드: YYYYMMDD 정수 (예: 2026-05-28 → 20260528)
 * - 챌린지: 시드 hash → CHALLENGES 5종 중 1개
 * - 테마: 시드 hash → 해금된 테마 중 1개 (오피스가 항상 있음 → 최소 보장)
 * - 진행도: bestDayByDaily[YYYYMMDD] 로 기록 (하루에 한 번만 의미있음)
 * - 일반 best day 에는 영향 X — 같은 날 여러 번 시도 가능하나 max 만 기록.
 *
 * 서버 동기화 X (로컬 only). 리더보드는 향후 Steamworks SDK.
 */
import { ChallengeId, CHALLENGES } from './challenges';
import { THEMES, ThemeId } from './themes';

export interface DailyInfo {
  /** YYYYMMDD 정수 — 시드 & 키 */
  seed: number;
  /** YYYY-MM-DD 표시용 */
  dateString: string;
  challengeId: string;
  themeId: ThemeId;
}

/** 오늘 (로컬 기준) 의 일일 챌린지 정보. */
export function todayDaily(): DailyInfo {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const seed = y * 10000 + m * 100 + d;
  const dateString = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  // 챌린지: seed % len
  const challengeIds = Object.keys(CHALLENGES) as ChallengeId[];
  const challengeId = challengeIds[seed % challengeIds.length]!;

  // 테마: seed 의 다른 dimension % len
  const themeIds = Object.keys(THEMES) as ThemeId[];
  const themeId = themeIds[Math.floor(seed / challengeIds.length) % themeIds.length]!;

  return { seed, dateString, challengeId, themeId };
}

const KEY = 'elevator-rogue.daily.v1';

interface DailyHistory {
  version: 1;
  /** seed → bestDay */
  bestBySeed: Record<string, number>;
  /** 누적 시도 횟수 */
  totalAttempts: number;
}

export function loadDailyHistory(): DailyHistory {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw) as DailyHistory;
      if (data.version === 1) return data;
    }
  } catch { /* ignore */ }
  return { version: 1, bestBySeed: {}, totalAttempts: 0 };
}

export function saveDailyHistory(h: DailyHistory): void {
  try { localStorage.setItem(KEY, JSON.stringify(h)); } catch { /* ignore */ }
}

/** 일일 챌린지 런 종료 시 호출. */
export function recordDailyRun(seed: number, finalDay: number): void {
  const h = loadDailyHistory();
  const prev = h.bestBySeed[String(seed)] ?? 0;
  if (finalDay > prev) h.bestBySeed[String(seed)] = finalDay;
  h.totalAttempts += 1;
  saveDailyHistory(h);
}

/** 오늘 일일 챌린지의 best day (없으면 0) */
export function todayBestDay(): number {
  const t = todayDaily();
  const h = loadDailyHistory();
  return h.bestBySeed[String(t.seed)] ?? 0;
}

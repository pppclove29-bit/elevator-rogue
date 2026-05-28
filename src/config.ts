export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const TICK_MS = 50;

export const INITIAL_FLOORS = 5;
export const INITIAL_ELEVATORS = 1;

// 게임 폰트 — Galmuri11 (한국어 픽셀 폰트, OFL) 우선, 없으면 system fallback.
// public/fonts/Galmuri11.woff2 두면 자동 적용 (index.html @font-face).
export const FONT = '"Galmuri11", -apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

export const COLORS = {
  bg: '#0b0b10',
  floorLine: 0x2a2a35,
  elevator: 0x4a90e2,
  passenger: 0xf5f5f5,
  passengerAngry: 0xe74c3c,
  text: '#f5f5f5',
  textDim: '#9aa0a6',
  wallPattern: 0x1a1a24,
  doorFrame: 0x6a5a3a,
  doorPanel: 0x3a2e1a,
  stairLine: 0x4a4a55,
  escalator: 0x7ed957,
} as const;

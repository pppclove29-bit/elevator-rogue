/**
 * 스프라이트 placeholder 자동 생성기 (Canvas API).
 *
 * 카테고리별 단순 모양 + 일관 색감으로 60개를 한 번에 생성.
 * 결과는 IndexedDB 에 저장 → 게임 자동 적용.
 *
 * 미니멀 톤이라 placeholder 가 final 역할도 가능. 마음에 안 드는 것만 교체.
 */
import { SpriteMeta } from '../render/sprites';

/** "16x24" → [16, 24]. 실패 시 [32,32]. */
function parseSize(s: string): [number, number] {
  const m = s.match(/^(\d+)x(\d+)/);
  if (!m) return [32, 32];
  return [parseInt(m[1]!, 10), parseInt(m[2]!, 10)];
}

/** key → 안정적 hash (0~360 hue). */
function keyHue(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

/** 카테고리별 base palette (전체 톤 통일). */
const CATEGORY_BG: Record<string, string> = {
  elevator: '#3a4a6a',     // 청회색
  passenger: '#4a4a55',    // 어두운 회색
  floor: '#2a2a35',        // 매우 어두운
  environment: '#2a3d2a',  // 어두운 녹
  ui: '#1c1c26',           // 거의 검정
  decoration: '#1a1a24',   // 거의 검정
  character: '#1c1c26',    // 거의 검정
};

const CATEGORY_ACCENT: Record<string, string> = {
  elevator: '#4a90e2',
  passenger: '#f5f5f5',
  floor: '#f5c542',
  environment: '#7ed957',
  ui: '#b08cff',
  decoration: '#5a5a68',
  character: '#e2a04a',
};

/** floor role 약자 (key=floor-<role>). 없으면 키 첫 글자. */
const FLOOR_ROLE_LABEL: Record<string, string> = {
  'floor-lobby': 'LB', 'floor-office': 'OF', 'floor-restaurant': 'RT',
  'floor-rooftop': 'RF', 'floor-basement': 'B1', 'floor-gym': 'GY',
  'floor-mall': 'ML', 'floor-medical': 'ER', 'floor-hotel-room': 'HR',
  'floor-gate': 'GT', 'floor-checkin': 'CI',
};

/** passenger archetype 색 (PassengerSprites 의 color 와 일치). */
const PASSENGER_COLOR: Record<string, string> = {
  'passenger-normal': '#f5f5f5',
  'passenger-vip': '#ffd700',
  'passenger-elderly': '#b08cff',
  'passenger-suit': '#4a90e2',
  'passenger-group': '#e67e22',
  'passenger-baggage': '#c0a000',
  'passenger-shady': '#6a3d3d',
  'passenger-tourist': '#7ed957',
  'passenger-staff': '#4a4a55',
  'passenger-thief': '#111111',
  'passenger-patient': '#ffe0e0',
  'passenger-medical': '#ffffff',
  'passenger-hotel-guest': '#c0a86a',
  'passenger-crew': '#4a90e2',
};

const CHARACTER_INITIAL: Record<string, string> = {
  'character-mentor-default': '구',
  'character-mentor-smirk': '구',
  'character-owner-default': '사',
  'character-owner-angry': '사',
  'character-player-default': '나',
  'character-player-worried': '나',
};

const SCALE = 4; // 픽셀 선명도 유지 위해 4배 업스케일

/** 캔버스 만들고 픽셀 정렬 + 사이즈 확대. 반환 = [canvas, ctx, w, h] (논리 사이즈). */
function makeCanvas(meta: SpriteMeta): [HTMLCanvasElement, CanvasRenderingContext2D, number, number] {
  const [w, h] = parseSize(meta.size);
  const canvas = document.createElement('canvas');
  canvas.width = w * SCALE;
  canvas.height = h * SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.scale(SCALE, SCALE); // 이후 그리기는 논리 픽셀 단위
  return [canvas, ctx, w, h];
}

/** 사람 모양 (머리 + 몸). 16×24 기준. */
function drawPerson(ctx: CanvasRenderingContext2D, w: number, _h: number, bodyColor: string, accent?: string): void {
  const cx = Math.floor(w / 2);
  const headSize = 4;
  const headY = 2;
  const bodyW = 6;
  const bodyH = 8;
  const bodyY = headY + headSize + 1;

  // 머리
  ctx.fillStyle = bodyColor;
  ctx.fillRect(cx - headSize / 2, headY, headSize, headSize);
  // 몸
  ctx.fillRect(cx - bodyW / 2, bodyY, bodyW, bodyH);
  // 다리 (2개)
  ctx.fillRect(cx - 2, bodyY + bodyH, 1, 4);
  ctx.fillRect(cx + 1, bodyY + bodyH, 1, 4);
  // 액센트 (가슴 1픽셀 등)
  if (accent) {
    ctx.fillStyle = accent;
    ctx.fillRect(cx - 1, bodyY + 2, 2, 1);
  }
  // 눈 (검정 도트)
  ctx.fillStyle = '#000000';
  ctx.fillRect(cx - 1, headY + 1, 1, 1);
  ctx.fillRect(cx, headY + 1, 1, 1);
}

/** 큰 사람 (짐꾼/호텔손님 등 spaceCost 2). */
function drawBigPerson(ctx: CanvasRenderingContext2D, w: number, _h: number, bodyColor: string): void {
  const cx = Math.floor(w / 2);
  ctx.fillStyle = bodyColor;
  ctx.fillRect(cx - 3, 2, 6, 5);                 // 머리
  ctx.fillRect(cx - 5, 8, 10, 12);               // 몸 (넓게)
  ctx.fillRect(cx - 3, 20, 2, 5); ctx.fillRect(cx + 1, 20, 2, 5); // 다리
  ctx.fillStyle = '#000000';
  ctx.fillRect(cx - 1, 4, 1, 1);
  ctx.fillRect(cx + 1, 4, 1, 1);
}

/** 박스 + 외곽선 + 가운데 텍스트. floor / ui icon 류. */
function drawBoxWithLabel(ctx: CanvasRenderingContext2D, w: number, h: number, bg: string, fg: string, label: string, fontSize = 8): void {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  ctx.fillStyle = fg;
  ctx.font = `bold ${fontSize}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, w / 2, h / 2 + 0.5);
}

/** 엘베 cab. 64×96 정도. */
function drawElevatorCab(ctx: CanvasRenderingContext2D, w: number, h: number, broken = false): void {
  // 박스
  ctx.fillStyle = broken ? '#4a3a3a' : '#3a4a6a';
  ctx.fillRect(2, 2, w - 4, h - 4);
  // 테두리
  ctx.strokeStyle = broken ? '#e74c3c' : '#4a90e2';
  ctx.lineWidth = 1;
  ctx.strokeRect(2.5, 2.5, w - 5, h - 5);
  // 가운데 세로 라인 (문)
  ctx.fillStyle = '#000000';
  ctx.fillRect(Math.floor(w / 2) - 0.5, 4, 1, h - 8);
  // 위쪽 디스플레이 박스 (층 표시 자리)
  ctx.fillStyle = broken ? '#e74c3c' : '#0e0e14';
  ctx.fillRect(w / 2 - 6, 6, 12, 6);
  ctx.fillStyle = broken ? '#ffffff' : '#f5c542';
  ctx.font = `4px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(broken ? '!' : '▲', w / 2, 9);
  // 노란 패널 라인
  if (!broken) {
    ctx.fillStyle = '#f5c542';
    ctx.fillRect(4, h - 8, w - 8, 1);
  }
  // 깨짐 표현
  if (broken) {
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(4, 4); ctx.lineTo(w - 4, h - 6);
    ctx.moveTo(8, h - 4); ctx.lineTo(w - 6, 6);
    ctx.stroke();
  }
}

/** 캐릭터 portrait (256×384). 큰 단색 박스 + 가운데 큰 한글 글자. */
function drawCharacterPortrait(ctx: CanvasRenderingContext2D, w: number, h: number, key: string): void {
  // 배경 그라데이션
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#2a2a35');
  grad.addColorStop(1, '#0e0e14');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  // 몸 실루엣 (단순 직사각형)
  const bodyW = w * 0.5;
  const bodyH = h * 0.5;
  ctx.fillStyle = '#3a3a48';
  ctx.fillRect((w - bodyW) / 2, h * 0.45, bodyW, bodyH);
  // 머리 (원)
  ctx.fillStyle = '#5a5a68';
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.32, w * 0.18, 0, Math.PI * 2);
  ctx.fill();
  // 이니셜 텍스트
  const initial = CHARACTER_INITIAL[key] ?? '?';
  ctx.fillStyle = '#f5c542';
  ctx.font = `bold ${Math.floor(w * 0.4)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial, w / 2, h * 0.32);
  // 이름 작게 (key 후미)
  ctx.fillStyle = '#9aa0a6';
  ctx.font = `${Math.floor(w * 0.05)}px sans-serif`;
  ctx.fillText(key.replace('character-', ''), w / 2, h - 16);
}

/** UI 아이콘 — 16×16 작은 심볼. */
function drawUiIcon(ctx: CanvasRenderingContext2D, w: number, h: number, key: string): void {
  const symbol: Record<string, string> = {
    'ui-icon-gold': 'G', 'ui-icon-anger': '!', 'ui-icon-clock': '◷',
    'ui-icon-passenger': '♟', 'ui-icon-elevator': '▣',
  };
  const sym = symbol[key] ?? '•';
  ctx.fillStyle = '#0e0e14';
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w / 2 - 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f5c542';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#f5c542';
  ctx.font = `bold ${Math.floor(h * 0.7)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sym, w / 2, h / 2 + 0.5);
}

/** 환경 (계단/엘베컬레이터/지하철 입구 등). */
function drawEnv(ctx: CanvasRenderingContext2D, w: number, h: number, key: string): void {
  ctx.fillStyle = CATEGORY_BG.environment ?? '#2a2a35';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = CATEGORY_ACCENT.environment ?? '#7ed957';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  // 카테고리별 심볼
  const symbol: Record<string, string> = {
    'env-subway': '🚇',
    'env-escalator': '⇧',
    'env-stairs': '/',
    'env-helipad': 'H',
    'env-toilet-clean': '🚻',
    'env-toilet-dirty': '✕',
  };
  ctx.fillStyle = CATEGORY_ACCENT.environment ?? '#7ed957';
  ctx.font = `bold ${Math.floor(Math.min(w, h) * 0.7)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(symbol[key] ?? '?', w / 2, h / 2);
}

/** 데코 — 단순 패턴. */
function drawDecor(ctx: CanvasRenderingContext2D, w: number, h: number, key: string): void {
  if (key === 'decor-wall-tile') {
    ctx.fillStyle = '#1a1a24';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2a2a35';
    for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) {
      if ((x + y) % 8 === 0) ctx.fillRect(x, y, 2, 2);
    }
  } else if (key === 'decor-window-lit') {
    ctx.fillStyle = '#f5c542';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#0e0e14';
    ctx.fillRect(0, h / 2 - 0.5, w, 1);
    ctx.fillRect(w / 2 - 0.5, 0, 1, h);
  } else if (key === 'decor-window-dark') {
    ctx.fillStyle = '#2a2a35';
    ctx.fillRect(0, 0, w, h);
  } else if (key === 'decor-title-building') {
    // 미니 빌딩
    ctx.fillStyle = '#14141c';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#3a3a48';
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    ctx.fillStyle = '#f5c542';
    for (let y = 8; y < h - 8; y += 12) for (let x = 8; x < w - 8; x += 12) {
      if (Math.random() < 0.4) ctx.fillRect(x, y, 4, 6);
    }
  }
}

/** 메인 디스패치. 모든 카테고리 처리. */
export async function generatePlaceholder(meta: SpriteMeta): Promise<File> {
  const [canvas, ctx, w, h] = makeCanvas(meta);

  switch (meta.category) {
    case 'passenger': {
      const color = PASSENGER_COLOR[meta.key] ?? '#888888';
      const big = ['passenger-baggage', 'passenger-hotel-guest'].includes(meta.key);
      if (big) drawBigPerson(ctx, w, h, color);
      else drawPerson(ctx, w, h, color);
      break;
    }
    case 'elevator': {
      if (meta.key === 'elevator-cab') drawElevatorCab(ctx, w, h, false);
      else if (meta.key === 'elevator-cab-broken') drawElevatorCab(ctx, w, h, true);
      else if (meta.key === 'elevator-door-open') {
        ctx.fillStyle = '#3a4a6a'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#000000'; ctx.fillRect(w / 2 - 1, 0, 2, h);
      } else if (meta.key === 'elevator-door-closed') {
        ctx.fillStyle = '#3a4a6a'; ctx.fillRect(2, 2, w - 4, h - 4);
        ctx.fillStyle = '#000000'; ctx.fillRect(w / 2 - 0.5, 2, 1, h - 4);
      } else if (meta.key === 'elevator-cable') {
        ctx.fillStyle = '#5a5a68'; ctx.fillRect(0, 0, w, h);
      }
      break;
    }
    case 'floor': {
      const label = FLOOR_ROLE_LABEL[meta.key] ?? meta.key.slice(-2).toUpperCase();
      const hue = keyHue(meta.key);
      const bg = `hsl(${hue}, 35%, 25%)`;
      const fg = `hsl(${hue}, 70%, 70%)`;
      drawBoxWithLabel(ctx, w, h, bg, fg, label, Math.floor(h * 0.4));
      break;
    }
    case 'environment': {
      drawEnv(ctx, w, h, meta.key);
      break;
    }
    case 'ui': {
      drawUiIcon(ctx, w, h, meta.key);
      break;
    }
    case 'decoration': {
      drawDecor(ctx, w, h, meta.key);
      break;
    }
    case 'character': {
      drawCharacterPortrait(ctx, w, h, meta.key);
      break;
    }
  }

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('toBlob failed')); return; }
      resolve(new File([blob], `${meta.key}.png`, { type: 'image/png' }));
    }, 'image/png');
  });
}

const KEY = 'elevator-rogue.options.v1';

export type DefaultTimeScale = 1 | 2 | 4 | 8;
export type ZoomLevel = 1 | 1.25 | 1.5 | 2;

export interface Options {
  version: 1;
  masterVolume: number;     // 0~1 (사운드 미구현 시 placeholder)
  sfxVolume: number;
  bgmVolume: number;
  defaultTimeScale: DefaultTimeScale;
  fullscreen: boolean;
  showTutorialOnStart: boolean;
  zoom: ZoomLevel;
}

export function defaultOptions(): Options {
  return {
    version: 1,
    masterVolume: 0.7,
    sfxVolume: 0.7,
    bgmVolume: 0.5,
    defaultTimeScale: 1,
    fullscreen: false,
    showTutorialOnStart: true,
    zoom: 1,
  };
}

/**
 * Canvas zoom + pan 적용 (CSS transform).
 * zoom > 1 일 때 pan 가능 (우클릭 드래그 / 화살표 키 — main.ts 에서 wiring).
 * zoom=1 로 돌아가면 pan 자동 리셋.
 */
let _zoom: number = 1;
let _panX = 0;
let _panY = 0;

function getCanvas(): HTMLCanvasElement | null {
  const container = document.getElementById('game');
  if (!container) return null;
  return container.querySelector('canvas') as HTMLCanvasElement | null;
}

function applyTransform(): void {
  const canvas = getCanvas();
  if (!canvas) return;
  // translate 가 scale 앞에 오면 화면 좌표계 기준 이동. 직관적.
  canvas.style.transform = `translate(${_panX}px, ${_panY}px) scale(${_zoom})`;
  canvas.style.transformOrigin = 'center center';
  canvas.style.cursor = _zoom > 1 ? 'grab' : '';
}

function clampPan(): void {
  // viewport 기준으로 canvas 가 잘리는 만큼 = pan 한계.
  const canvas = getCanvas();
  if (!canvas) return;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const maxX = Math.max(0, (w * (_zoom - 1)) / 2);
  const maxY = Math.max(0, (h * (_zoom - 1)) / 2);
  if (_panX > maxX) _panX = maxX;
  if (_panX < -maxX) _panX = -maxX;
  if (_panY > maxY) _panY = maxY;
  if (_panY < -maxY) _panY = -maxY;
}

export function applyZoom(zoom: ZoomLevel): void {
  _zoom = zoom;
  if (zoom === 1) { _panX = 0; _panY = 0; }
  else clampPan();
  applyTransform();
}

/** 우클릭 드래그 / 화살표 키에서 호출. zoom 1 이면 no-op. */
export function pan(dx: number, dy: number): void {
  if (_zoom <= 1) return;
  _panX += dx;
  _panY += dy;
  clampPan();
  applyTransform();
}

export function getZoom(): number { return _zoom; }

export function loadOptions(): Options {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    try {
      const data = JSON.parse(raw) as Options;
      if (data.version === 1) return { ...defaultOptions(), ...data };
    } catch { /* fallthrough */ }
  }
  return defaultOptions();
}

export function saveOptions(opt: Options): void {
  try { localStorage.setItem(KEY, JSON.stringify(opt)); } catch (e) { console.warn('[options] save fail', e); }
}

/** 데이터 초기화용 — 어느 키를 지울지 정의 */
export function clearAllGameData(): void {
  const keys = [
    'elevator-rogue.save.v1',
    'elevator-rogue.progression.v1',
    'elevator-rogue.tutorialShown',
    // 옵션 자체는 유지
  ];
  for (const k of keys) localStorage.removeItem(k);
}

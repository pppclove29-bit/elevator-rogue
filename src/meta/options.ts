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

/** canvas 또는 게임 컨테이너에 CSS transform: scale을 적용 */
export function applyZoom(zoom: ZoomLevel): void {
  const container = document.getElementById('game');
  if (!container) return;
  const canvas = container.querySelector('canvas') as HTMLCanvasElement | null;
  if (!canvas) return;
  canvas.style.transform = `scale(${zoom})`;
  canvas.style.transformOrigin = 'center center';
}

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

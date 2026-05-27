import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GameScene } from './scenes/GameScene';
import { HelpScene } from './scenes/HelpScene';
import { HUDScene } from './scenes/HUDScene';
import { ModifierScene } from './scenes/ModifierScene';
import { OptionsScene } from './scenes/OptionsScene';
import { RelicScene } from './scenes/RelicScene';
import { RuleEditorScene } from './scenes/RuleEditorScene';
import { ShopScene } from './scenes/ShopScene';
import { StatsScene } from './scenes/StatsScene';
import { TitleScene } from './scenes/TitleScene';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from './config';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: COLORS.bg,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scene: [BootScene, TitleScene, HelpScene, OptionsScene, StatsScene, GameScene, HUDScene, RuleEditorScene, ShopScene, ModifierScene, RelicScene, GameOverScene],
};

const game = new Phaser.Game(config);

// 옵션의 zoom + 볼륨을 부팅 시 자동 적용 (canvas 생성 후)
import('./meta/options').then(({ applyZoom, loadOptions }) => {
  import('./audio/sound').then(({ sound }) => {
    game.events.once(Phaser.Core.Events.READY, () => {
      sound.attach(game);
      const opt = loadOptions();
      applyZoom(opt.zoom);
      sound.setMasterVolume(opt.masterVolume);
      sound.setSfxVolume(opt.sfxVolume);
      sound.setBgmVolume(opt.bgmVolume);
    });
  });
});

// +/- 키 단축키 (전역 줌)
window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  const ZOOMS = [1, 1.25, 1.5, 2] as const;
  if (e.key === '=' || e.key === '+') {
    import('./meta/options').then(({ applyZoom, loadOptions, saveOptions }) => {
      const opt = loadOptions();
      const idx = ZOOMS.indexOf(opt.zoom as 1 | 1.25 | 1.5 | 2);
      if (idx >= 0 && idx < ZOOMS.length - 1) {
        opt.zoom = ZOOMS[idx + 1]; saveOptions(opt); applyZoom(opt.zoom);
      }
    });
  } else if (e.key === '-' || e.key === '_') {
    import('./meta/options').then(({ applyZoom, loadOptions, saveOptions }) => {
      const opt = loadOptions();
      const idx = ZOOMS.indexOf(opt.zoom as 1 | 1.25 | 1.5 | 2);
      if (idx > 0) {
        opt.zoom = ZOOMS[idx - 1]; saveOptions(opt); applyZoom(opt.zoom);
      }
    });
  } else if (e.key === '0') {
    import('./meta/options').then(({ applyZoom, loadOptions, saveOptions }) => {
      const opt = loadOptions();
      opt.zoom = 1; saveOptions(opt); applyZoom(opt.zoom);
    });
  } else if (e.key.startsWith('Arrow')) {
    // zoom > 1 시 화살표 키 pan (60px step)
    import('./meta/options').then(({ pan, getZoom }) => {
      if (getZoom() <= 1) return;
      const step = 60;
      if (e.key === 'ArrowLeft') pan(step, 0);
      else if (e.key === 'ArrowRight') pan(-step, 0);
      else if (e.key === 'ArrowUp') pan(0, step);
      else if (e.key === 'ArrowDown') pan(0, -step);
      e.preventDefault();
    });
  }
});

// ── 우클릭 드래그로 pan (zoom > 1 시) ──
// canvas 우클릭 메뉴 비활성화 + 드래그 동안 translate.
(() => {
  let dragging = false;
  let lastX = 0, lastY = 0;
  const container = document.getElementById('game');
  if (!container) return;
  container.addEventListener('contextmenu', (e) => e.preventDefault());
  container.addEventListener('mousedown', (e) => {
    if (e.button !== 2) return; // 우클릭만
    import('./meta/options').then(({ getZoom }) => {
      if (getZoom() <= 1) return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      document.body.style.cursor = 'grabbing';
    });
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    import('./meta/options').then(({ pan }) => pan(dx, dy));
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button !== 2 || !dragging) return;
    dragging = false;
    document.body.style.cursor = '';
  });
})();

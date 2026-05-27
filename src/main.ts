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

// 옵션의 zoom을 부팅 시 자동 적용 (canvas 생성 후)
import('./meta/options').then(({ applyZoom, loadOptions }) => {
  game.events.once(Phaser.Core.Events.READY, () => {
    applyZoom(loadOptions().zoom);
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
  }
});

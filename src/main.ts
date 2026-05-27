import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { DialogScene } from './scenes/DialogScene';
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
import { applyZoom, getZoom, loadOptions, pan, saveOptions, ZoomLevel } from './meta/options';
import { sound } from './audio/sound';

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
  scene: [BootScene, TitleScene, HelpScene, OptionsScene, StatsScene, GameScene, HUDScene, RuleEditorScene, ShopScene, ModifierScene, RelicScene, GameOverScene, DialogScene],
};

const game = new Phaser.Game(config);

// 옵션의 zoom + 볼륨을 부팅 시 자동 적용 (canvas 생성 후)
game.events.once(Phaser.Core.Events.READY, () => {
  sound.attach(game);
  const opt = loadOptions();
  applyZoom(opt.zoom);
  sound.setMasterVolume(opt.masterVolume);
  sound.setSfxVolume(opt.sfxVolume);
  sound.setBgmVolume(opt.bgmVolume);
});

// +/- 키 단축키 (전역 줌)
window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return;
  const ZOOMS = [1, 1.25, 1.5, 2] as const;
  if (e.key === '=' || e.key === '+') {
    const opt = loadOptions();
    const idx = ZOOMS.indexOf(opt.zoom as ZoomLevel);
    if (idx >= 0 && idx < ZOOMS.length - 1) {
      opt.zoom = ZOOMS[idx + 1]; saveOptions(opt); applyZoom(opt.zoom);
    }
  } else if (e.key === '-' || e.key === '_') {
    const opt = loadOptions();
    const idx = ZOOMS.indexOf(opt.zoom as ZoomLevel);
    if (idx > 0) {
      opt.zoom = ZOOMS[idx - 1]; saveOptions(opt); applyZoom(opt.zoom);
    }
  } else if (e.key === '0') {
    const opt = loadOptions();
    opt.zoom = 1; saveOptions(opt); applyZoom(opt.zoom);
  }
});

// ── 드래그앤드롭으로 화면 이동 (zoom > 1 시) ──
// 좌클릭은 게임 버튼과 충돌 → 우클릭(button 2) 또는 휠클릭(button 1)만.
// 우클릭 메뉴는 비활성화. listener는 window에 붙여 canvas 위/밖 모두 처리.
window.addEventListener('contextmenu', (e) => {
  if ((e.target as HTMLElement | null)?.closest('#game')) e.preventDefault();
});
{
  let dragging = false;
  let lastX = 0, lastY = 0;
  window.addEventListener('mousedown', (e) => {
    if (e.button !== 2 && e.button !== 1) return;
    if (getZoom() <= 1) return;
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    document.body.style.cursor = 'grabbing';
    e.preventDefault();
  }, { capture: true });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    pan(dx, dy);
  }, { capture: true });
  const endDrag = (e: MouseEvent) => {
    if (!dragging) return;
    dragging = false;
    document.body.style.cursor = '';
    e.preventDefault();
  };
  window.addEventListener('mouseup', endDrag, { capture: true });
  window.addEventListener('mouseleave', endDrag, { capture: true });
}

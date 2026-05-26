import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { HUDScene } from './scenes/HUDScene';
import { ModifierScene } from './scenes/ModifierScene';
import { RelicScene } from './scenes/RelicScene';
import { RuleEditorScene } from './scenes/RuleEditorScene';
import { ShopScene } from './scenes/ShopScene';
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
  scene: [BootScene, GameScene, HUDScene, RuleEditorScene, ShopScene, ModifierScene, RelicScene],
};

new Phaser.Game(config);

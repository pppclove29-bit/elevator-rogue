import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { localizeCard } from '../i18n/cards';
import { t } from '../i18n/locale';
import { RelicEntry, RELICS } from '../meta/relics';
import { Button } from '../ui/Button';
import { GameScene } from './GameScene';

export class RelicScene extends Phaser.Scene {
  private gs!: GameScene;

  constructor() { super('Relic'); }

  create(): void {
    this.gs = this.scene.get('Game') as GameScene;
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.8);

    this.add.text(GAME_WIDTH / 2, 60, t('relic.title'), {
      fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '28px', color: COLORS.text,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 96, t('relic.subtitle'), {
      fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '13px', color: COLORS.textDim,
    }).setOrigin(0.5);

    const owned = new Set(this.gs.state.ownedRelics);
    const all = Object.values(RELICS).filter((r) => !owned.has(r.id));
    const choices: RelicEntry[] = [];
    const used = new Set<string>();
    while (choices.length < 3 && used.size < all.length) {
      const idx = Math.floor(Math.random() * all.length);
      const c = all[idx]!;
      if (used.has(c.id)) continue;
      used.add(c.id);
      choices.push(c);
    }

    const cardW = 320, cardH = 360, gap = 40;
    const startX = (GAME_WIDTH - (cardW * 3 + gap * 2)) / 2;
    const cardY = 140;
    for (let i = 0; i < choices.length; i++) {
      this.drawCard(startX + i * (cardW + gap), cardY, cardW, cardH, choices[i]!);
    }

    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 50, 120, 36, t('reward.skip'), () => {
      this.gs.resolveRelic(null);
      this.scene.stop();
    }, { fontSize: 13 });
  }

  private drawCard(x: number, y: number, w: number, h: number, r: RelicEntry): void {
    const accent = r.type === 'pure' ? 0xe2a04a : r.type === 'tradeoff' ? 0xb08cff : 0x6a5a3a;
    const tag = r.type === 'pure' ? t('relic.tag.pure') : r.type === 'tradeoff' ? t('relic.tag.tradeoff') : t('relic.tag.curse');
    const localized = localizeCard('relic', r);

    this.add.rectangle(x, y, w, h, 0x1c1c26, 1).setOrigin(0, 0).setStrokeStyle(2, accent);
    this.add.rectangle(x, y, w, 32, accent, 1).setOrigin(0, 0);
    this.add.text(x + 14, y + 6, tag, { fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '12px', color: '#0b0b10' });
    this.add.text(x + 14, y + 50, localized.name, {
      fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '20px', color: COLORS.text, wordWrap: { width: w - 28 },
    });
    this.add.text(x + 14, y + 110, localized.desc, {
      fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '13px', color: COLORS.textDim, wordWrap: { width: w - 28 },
    });
    this.add.text(x + 14, y + h - 80, t('relic.note'), {
      fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '11px', color: '#e2a04a', fontStyle: 'italic',
    });
    new Button(this, x + w / 2, y + h - 36, w - 40, 40, t('reward.take'), () => {
      this.gs.resolveRelic(r.id);
      this.scene.stop();
    }, { fontSize: 14, bg: accent, bgHover: accent, textColor: '#0b0b10', textColorActive: '#0b0b10' });
  }
}

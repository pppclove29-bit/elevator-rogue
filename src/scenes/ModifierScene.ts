import Phaser from 'phaser';
import { sound } from '../audio/sound';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { localizeCard } from '../i18n/cards';
import { t } from '../i18n/locale';
import { ModifierEntry, MODIFIERS } from '../meta/modifiers';
import { Button } from '../ui/Button';
import { GameScene } from './GameScene';

export class ModifierScene extends Phaser.Scene {
  private gs!: GameScene;

  constructor() { super('Modifier'); }

  create(): void {
    this.gs = this.scene.get('Game') as GameScene;
    sound.modalOpen();
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.78);

    this.add.text(GAME_WIDTH / 2, 60, t('modifier.title'), {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', fontSize: '28px', color: COLORS.text,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 96, t('modifier.subtitle'), {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', fontSize: '13px', color: COLORS.textDim,
    }).setOrigin(0.5);

    // 무작위 3장 뽑기 (사용자 결정: 완전 랜덤)
    const all = Object.values(MODIFIERS);
    const choices: ModifierEntry[] = [];
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
  }

  private drawCard(x: number, y: number, w: number, h: number, m: ModifierEntry): void {
    const accent = m.type === 'debuff' ? 0xe74c3c : m.type === 'buff' ? 0x7ed957 : 0xb08cff;
    const tag = m.type === 'debuff' ? t('modifier.tag.debuff') : m.type === 'buff' ? t('modifier.tag.buff') : t('modifier.tag.mixed');
    const localized = localizeCard('mod', m);

    this.add.rectangle(x, y, w, h, 0x1c1c26, 1).setOrigin(0, 0).setStrokeStyle(2, accent);
    this.add.rectangle(x, y, w, 32, accent, 1).setOrigin(0, 0);
    this.add.text(x + 14, y + 6, tag, { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', fontSize: '12px', color: '#0b0b10' });
    this.add.text(x + 14, y + 50, localized.name, {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', fontSize: '20px', color: COLORS.text, wordWrap: { width: w - 28 },
    });
    this.add.text(x + 14, y + 110, localized.desc, {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', fontSize: '13px', color: COLORS.textDim, wordWrap: { width: w - 28 },
    });
    this.add.text(x + 14, y + h - 80, t('modifier.note'), {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', fontSize: '11px', color: '#9aa0a6', fontStyle: 'italic',
    });
    new Button(this, x + w / 2, y + h - 36, w - 40, 40, t('reward.take'), () => {
      this.gs.resolveModifier(m.id);
      this.scene.stop();
    }, { fontSize: 14, bg: accent, bgHover: accent, textColor: '#0b0b10', textColorActive: '#0b0b10' });
  }
}

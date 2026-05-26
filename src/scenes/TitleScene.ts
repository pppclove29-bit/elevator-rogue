import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { loadOptions } from '../meta/options';
import { isUnlocked, loadProgression, unlockLabel } from '../meta/progression';
import { readSave, saveExists, summarize } from '../meta/save';
import { DEFAULT_THEME, ThemeId, THEMES } from '../meta/themes';
import { Button } from '../ui/Button';

const TUTORIAL_KEY = 'elevator-rogue.tutorialShown';
const FONT = '"DotGothic16", "Press Start 2P", monospace';

export class TitleScene extends Phaser.Scene {
  private selectedTheme: ThemeId = DEFAULT_THEME;
  private themeRefresh: (() => void) | null = null;

  constructor() { super('Title'); }

  create(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0b0b10).setOrigin(0.5);

    // 좌측 빌딩 실루엣
    const g = this.add.graphics();
    g.fillStyle(0x14141c, 1);
    g.fillRect(80, 140, 240, 480);
    g.lineStyle(1, 0x2a2a35, 1);
    g.strokeRect(80, 140, 240, 480);
    for (let i = 0; i < 8; i++) g.lineBetween(80, 140 + i * 60, 320, 140 + i * 60);
    g.fillStyle(0x4a90e2, 1);
    g.fillRect(160, 360, 36, 56);
    g.fillStyle(0xf5c542, 0.5);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 5; c++) {
        if (((r * 5 + c) % 7) === 0) g.fillRect(100 + c * 40, 160 + r * 60, 6, 6);
      }
    }

    // 타이틀
    this.add.text(GAME_WIDTH / 2 + 30, 140, 'Elevator', {
      fontFamily: FONT, fontSize: '64px', color: COLORS.text, fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.add.text(GAME_WIDTH / 2 + 30, 200, 'Rogue', {
      fontFamily: FONT, fontSize: '64px', color: '#f5c542', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.add.text(GAME_WIDTH / 2 + 30, 280, '하루의 트래픽을 정책으로 받아치는 로그라이크', {
      fontFamily: FONT, fontSize: '13px', color: COLORS.textDim,
    }).setOrigin(0.5, 0);

    // 테마 선택
    this.add.text(GAME_WIDTH / 2 + 30, 320, '빌딩 테마', {
      fontFamily: FONT, fontSize: '14px', color: '#f5c542',
    }).setOrigin(0.5, 0);

    const themes = Object.values(THEMES);
    const cardW = 200, cardH = 110, gap = 8;
    const startX = GAME_WIDTH / 2 + 30 - (cardW * 2 + gap) / 2;
    const themeY = 348;
    const prog = loadProgression();

    const cardElements: Array<{ id: ThemeId; locked: boolean; bg: Phaser.GameObjects.Rectangle; nameText: Phaser.GameObjects.Text; descText: Phaser.GameObjects.Text }> = [];

    // 잠금 테마는 선택 못 함. selectedTheme이 잠금이면 첫 해금 테마로.
    if (!isUnlocked(prog, this.selectedTheme)) this.selectedTheme = 'office';

    for (let i = 0; i < themes.length; i++) {
      const t = themes[i]!;
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = startX + col * (cardW + gap);
      const y = themeY + row * (cardH + gap);
      const locked = !isUnlocked(prog, t.id);

      const bg = this.add.rectangle(x, y, cardW, cardH, locked ? 0x0e0e14 : 0x14141c, 1).setOrigin(0, 0)
        .setStrokeStyle(2, locked ? 0x2a2a35 : 0x3a3a48);
      if (!locked) bg.setInteractive({ useHandCursor: true });

      const nameText = this.add.text(x + 10, y + 8, locked ? `🔒 ${t.name}` : t.name, {
        fontFamily: FONT, fontSize: '14px', color: locked ? '#5a5a68' : COLORS.text,
      });
      this.add.text(x + 10, y + 28, t.flavor, {
        fontFamily: FONT, fontSize: '10px', color: locked ? '#3a3a48' : '#f5c542',
      });
      const descText = this.add.text(x + 10, y + 46, locked ? `해금 조건: ${unlockLabel(t.id)}` : t.desc, {
        fontFamily: FONT, fontSize: '10px', color: locked ? '#5a5a68' : COLORS.textDim,
        wordWrap: { width: cardW - 20 },
      });
      if (t.startingGoldBonus && !locked) {
        this.add.text(x + cardW - 10, y + 8, `+${t.startingGoldBonus}G`, {
          fontFamily: FONT, fontSize: '11px', color: '#f5c542',
        }).setOrigin(1, 0);
      }
      if (!locked) {
        bg.on('pointerdown', () => {
          this.selectedTheme = t.id;
          this.refreshThemeCards();
        });
      }
      cardElements.push({ id: t.id, locked, bg, nameText, descText });
    }

    this.themeRefresh = () => {
      for (const c of cardElements) {
        if (c.locked) continue;
        const sel = c.id === this.selectedTheme;
        c.bg.setStrokeStyle(2, sel ? 0x4a90e2 : 0x3a3a48);
        c.bg.setFillStyle(sel ? 0x1f2a3d : 0x14141c, 1);
        c.nameText.setColor(sel ? '#4a90e2' : COLORS.text);
        c.descText.setColor(sel ? COLORS.text : COLORS.textDim);
      }
    };
    this.refreshThemeCards();

    // 시작 / 계속하기 / 조작법
    const btnX = GAME_WIDTH / 2 + 30;
    let btnY = 596;

    const hasSave = saveExists();
    if (hasSave) {
      const save = readSave();
      new Button(this, btnX, btnY, 240, 44, '계속하기', () => this.continueGame(),
        { fontSize: 14, bg: 0x7ed957, bgHover: 0x8fea68, textColor: '#0b0b10', textColorActive: '#0b0b10' });
      if (save) {
        this.add.text(btnX, btnY + 26, summarize(save), {
          fontFamily: FONT, fontSize: '10px', color: '#0b0b10',
        }).setOrigin(0.5);
      }
      btnY += 50;
      new Button(this, btnX, btnY, 240, 36, '새 게임 시작', () => this.startGame(),
        { fontSize: 14, bg: 0x4a90e2, bgHover: 0x5aa0f2, textColor: '#0b0b10', textColorActive: '#0b0b10' });
      btnY += 40;
    } else {
      new Button(this, btnX, btnY, 240, 44, '게임 시작', () => this.startGame(),
        { fontSize: 16, bg: 0x4a90e2, bgHover: 0x5aa0f2, textColor: '#0b0b10', textColorActive: '#0b0b10' });
      btnY += 48;
    }
    new Button(this, btnX, btnY, 240, 32, '조작법', () => this.scene.launch('Help'),
      { fontSize: 13 });
    btnY += 36;
    new Button(this, btnX, btnY, 240, 32, '옵션', () => this.scene.launch('Options'),
      { fontSize: 13 });
    btnY += 36;
    if (import.meta.env.DEV) {
      new Button(this, btnX, btnY, 240, 26, '[DEV] 문서·디자인 페이지', () => {
        window.open('/docs.html', '_blank');
        window.open('/design.html', '_blank');
      }, { fontSize: 11 });
    }

    this.add.text(GAME_WIDTH - 16, GAME_HEIGHT - 16, 'v0.2 alpha', {
      fontFamily: FONT, fontSize: '10px', color: '#3a3a48',
    }).setOrigin(1, 1);

    const opt = loadOptions();
    if (opt.showTutorialOnStart && !localStorage.getItem(TUTORIAL_KEY)) {
      this.scene.launch('Help', { firstTime: true });
      localStorage.setItem(TUTORIAL_KEY, '1');
    }
  }

  private refreshThemeCards(): void {
    if (this.themeRefresh) this.themeRefresh();
  }

  private startGame(): void {
    this.scene.stop('Help');
    this.scene.start('Game', { theme: this.selectedTheme });
  }

  private continueGame(): void {
    this.scene.stop('Help');
    this.scene.start('Game', { load: true });
  }
}

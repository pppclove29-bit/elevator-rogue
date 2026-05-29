import Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { t as tr } from '../i18n/locale';
import { CHALLENGES, challengeById } from '../meta/challenges';
import { todayBestDay, todayDaily } from '../meta/daily';
import { loadOptions } from '../meta/options';
import { isAllThemesCleared, isStoryCleared, isUnlocked, loadProgression, unlockLabel } from '../meta/progression';
import { readSave, saveExists, summarize } from '../meta/save';
import { ThemeId, THEMES } from '../meta/themes';
import { Button } from '../ui/Button';

const TUTORIAL_KEY = 'elevator-rogue.tutorialShown';

/** 도전 모드 view 에 노출되는 테마들 (오피스 = 스토리 모드라 제외) */
const CHALLENGE_THEMES: ThemeId[] = ['airport', 'hospital', 'hotel', 'chaos'];

export class TitleScene extends Phaser.Scene {
  private view: 'main' | 'challenge' = 'main';
  private selectedTheme: ThemeId = 'airport';
  private selectedChallenge: string | null = null;
  private themeRefresh: (() => void) | null = null;
  private challengeLabel: Phaser.GameObjects.Text | null = null;

  constructor() { super('Title'); }

  create(): void {
    this.view = 'main';
    this.selectedTheme = 'airport';
    this.selectedChallenge = null;
    this.build();

    // 첫 도움말 한 번만 (튜토리얼 모달)
    const opt = loadOptions();
    if (opt.showTutorialOnStart && !localStorage.getItem(TUTORIAL_KEY)) {
      this.scene.launch('Help', { firstTime: true });
      localStorage.setItem(TUTORIAL_KEY, '1');
    }
  }

  // ───────────────────────────────────────────────────────
  //  view build
  // ───────────────────────────────────────────────────────
  private build(): void {
    // 현재 children 다 정리 후 재구성
    this.children.list.slice().forEach((c) => c.destroy());
    this.tweens.killAll();
    this.challengeLabel = null;
    this.themeRefresh = null;

    this.buildBackground();
    this.buildBuilding();
    this.buildTitle();

    if (this.view === 'main') this.buildMainView();
    else this.buildChallengeView();

    this.buildFooter();
  }

  private switchView(v: 'main' | 'challenge'): void {
    this.view = v;
    this.build();
  }

  // ───────────────────────────────────────────────────────
  //  공통: 배경/빌딩/타이틀/하단 footer
  // ───────────────────────────────────────────────────────
  private buildBackground(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0b0b10).setOrigin(0.5);
  }

  private buildBuilding(): void {
    const g = this.add.graphics();
    g.fillStyle(0x14141c, 1);
    g.fillRect(80, 140, 240, 480);
    g.lineStyle(1, 0x2a2a35, 1);
    g.strokeRect(80, 140, 240, 480);
    for (let i = 0; i < 8; i++) g.lineBetween(80, 140 + i * 60, 320, 140 + i * 60);
    g.fillStyle(0x4a90e2, 1);
    g.fillRect(160, 360, 36, 56);

    const windowConfigs: Array<{ r: number; c: number; baseAlpha: number; period: number }> = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 5; c++) {
        if (((r * 5 + c) % 7) === 0) windowConfigs.push({ r, c, baseAlpha: 0.45, period: 2400 + ((r * 5 + c) * 137) % 2000 });
        else if (((r * 5 + c) % 11) === 3) windowConfigs.push({ r, c, baseAlpha: 0.0, period: 3800 + ((r * 5 + c) * 211) % 2500 });
      }
    }
    for (const w of windowConfigs) {
      const rect = this.add.rectangle(100 + w.c * 40 + 3, 160 + w.r * 60 + 3, 6, 6, 0xf5c542, w.baseAlpha).setOrigin(0.5);
      this.tweens.add({
        targets: rect,
        alpha: w.baseAlpha > 0.2 ? { from: 0.45, to: 0.95 } : { from: 0, to: 0.6 },
        duration: w.period, yoyo: true, repeat: -1,
        delay: (w.r * 5 + w.c) * 73, ease: 'Sine.easeInOut',
      });
    }
    const cab = this.add.rectangle(178, 388, 36, 56, 0x4a90e2, 1).setOrigin(0.5);
    g.fillStyle(0x0b0b10, 1);
    g.fillRect(160, 360, 36, 56);
    this.tweens.add({ targets: cab, y: 268, duration: 6000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private buildTitle(): void {
    this.add.text(GAME_WIDTH / 2 + 30, 100, '분주한', {
      fontFamily: FONT, fontSize: '54px', color: COLORS.text, fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.add.text(GAME_WIDTH / 2 + 30, 156, '승강씨', {
      fontFamily: FONT, fontSize: '54px', color: '#f5c542', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.add.text(GAME_WIDTH / 2 + 30, 224, tr('title.subtitle'), {
      fontFamily: FONT, fontSize: '12px', color: COLORS.textDim,
    }).setOrigin(0.5, 0);
  }

  private buildFooter(): void {
    // 우하단 — Help/Options/Stats
    const btnX = GAME_WIDTH / 2 + 30;
    const subW = 90, subGap = 4;
    const subTotalW = subW * 3 + subGap * 2;
    const subStartX = btnX - subTotalW / 2 + subW / 2;
    const subY = GAME_HEIGHT - 56;
    new Button(this, subStartX, subY, subW, 30, tr('title.help'),
      () => this.scene.launch('Help'), { fontSize: 12 });
    new Button(this, subStartX + (subW + subGap), subY, subW, 30, tr('title.options'),
      () => this.scene.launch('Options'), { fontSize: 12 });
    new Button(this, subStartX + 2 * (subW + subGap), subY, subW, 30, tr('title.stats'),
      () => this.scene.launch('Stats'), { fontSize: 12 });

    if (import.meta.env.DEV) {
      new Button(this, btnX, GAME_HEIGHT - 24, 280, 22, '[DEV] docs·design·sounds·sprites·cms', () => {
        window.open('/docs.html', '_blank');
        window.open('/design.html', '_blank');
        window.open('/sounds.html', '_blank');
        window.open('/sprites.html', '_blank');
        window.open('/cms.html', '_blank');
      }, { fontSize: 10 });
    }

    this.add.text(GAME_WIDTH - 16, GAME_HEIGHT - 16, 'v0.2 alpha', {
      fontFamily: FONT, fontSize: '10px', color: '#3a3a48',
    }).setOrigin(1, 1);
    this.add.text(GAME_WIDTH - 90, GAME_HEIGHT - 16, 'Credits', {
      fontFamily: FONT, fontSize: '10px', color: '#5a5a68',
    }).setOrigin(1, 1).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.launch('Credits'));
  }

  // ───────────────────────────────────────────────────────
  //  Main view — 스토리 / 도전 두 큰 버튼
  // ───────────────────────────────────────────────────────
  private buildMainView(): void {
    const prog = loadProgression();
    const storyCleared = isStoryCleared(prog);

    const btnX = GAME_WIDTH / 2 + 30;
    let y = 280;

    // 계속하기 (세이브 있을 때만)
    if (saveExists()) {
      const save = readSave();
      new Button(this, btnX, y, 320, 44, tr('title.continue'),
        () => this.continueGame(),
        { fontSize: 14, bg: 0x7ed957, bgHover: 0x8fea68, textColor: '#0b0b10', textColorActive: '#0b0b10' });
      if (save) {
        this.add.text(btnX, y + 30, summarize(save), {
          fontFamily: FONT, fontSize: '11px', color: COLORS.textDim,
        }).setOrigin(0.5, 0);
      }
      y += 70;
    } else {
      y += 12;
    }

    // 스토리 모드 — 항상 열림
    new Button(this, btnX, y, 320, 56, '📖  스토리 모드',
      () => this.startStory(),
      { fontSize: 18, bg: 0x4a90e2, bgHover: 0x5aa0f2, textColor: '#0b0b10', textColorActive: '#0b0b10' });
    this.add.text(btnX, y + 40, '오피스 빌딩 · 멘토와 함께 운영을 배웁니다', {
      fontFamily: FONT, fontSize: '11px', color: COLORS.textDim,
    }).setOrigin(0.5, 0);
    y += 88;

    // 도전 모드 — 스토리 완주 후 열림
    if (storyCleared) {
      new Button(this, btnX, y, 320, 56, '🎯  도전 모드',
        () => this.switchView('challenge'),
        { fontSize: 18, bg: 0xe2a04a, bgHover: 0xf5b850, textColor: '#0b0b10', textColorActive: '#0b0b10' });
      this.add.text(btnX, y + 40, '다른 테마 / 룰셋 도전 / 일일 챌린지', {
        fontFamily: FONT, fontSize: '11px', color: COLORS.textDim,
      }).setOrigin(0.5, 0);
    } else {
      new Button(this, btnX, y, 320, 56, '🔒  도전 모드',
        () => this.toast('스토리 모드 7일차 도달 시 해금'),
        { fontSize: 18, bg: 0x2a2a35, bgHover: 0x2a2a35, textColor: '#5a5a68', textColorActive: '#5a5a68' });
      this.add.text(btnX, y + 40, '스토리 모드 7일차 도달 시 해금', {
        fontFamily: FONT, fontSize: '11px', color: '#5a5a68',
      }).setOrigin(0.5, 0);
    }
  }

  // ───────────────────────────────────────────────────────
  //  Challenge view — 테마 선택 + 룰셋/일일 챌린지
  // ───────────────────────────────────────────────────────
  private buildChallengeView(): void {
    const prog = loadProgression();
    const allCleared = isAllThemesCleared(prog);

    // 좌측 상단 — 메인으로 돌아가기
    new Button(this, 100, 36, 140, 28, '← 메인',
      () => this.switchView('main'), { fontSize: 12 });

    // 우측 제목
    this.add.text(GAME_WIDTH / 2 + 30, 256, '도전 테마 선택', {
      fontFamily: FONT, fontSize: '14px', color: '#f5c542', fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    // 테마 grid (2×2)
    const themes = CHALLENGE_THEMES.map((id) => THEMES[id]);
    const cardW = 160, cardH = 88, gap = 6;
    const startX = GAME_WIDTH / 2 + 30 - (cardW * 2 + gap) / 2;
    const themeY = 282;
    const cardElements: Array<{ id: ThemeId; locked: boolean; bg: Phaser.GameObjects.Rectangle; nameText: Phaser.GameObjects.Text; descText: Phaser.GameObjects.Text }> = [];

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

      const nameText = this.add.text(x + 10, y + 6, locked ? `🔒 ${t.name}` : t.name, {
        fontFamily: FONT, fontSize: '13px', color: locked ? '#5a5a68' : COLORS.text, fontStyle: 'bold',
      });
      this.add.text(x + 10, y + 26, t.flavor, {
        fontFamily: FONT, fontSize: '10px', color: locked ? '#3a3a48' : '#f5c542',
      });
      const descText = this.add.text(x + 10, y + 42, locked ? `해금: ${unlockLabel(t.id)}` : t.desc, {
        fontFamily: FONT, fontSize: '10px', color: locked ? '#5a5a68' : COLORS.textDim,
        wordWrap: { width: cardW - 20 },
      });
      if (t.startingGoldBonus && !locked) {
        this.add.text(x + cardW - 10, y + 6, `+${t.startingGoldBonus}G`, {
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

    // 첫 해금 테마를 자동 선택
    if (!isUnlocked(prog, this.selectedTheme)) {
      this.selectedTheme = (CHALLENGE_THEMES.find((id) => isUnlocked(prog, id)) ?? 'airport') as ThemeId;
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

    // 시작 버튼 — grid 아래
    const gridBottom = themeY + 2 * cardH + gap;
    const startY = gridBottom + 14;
    new Button(this, GAME_WIDTH / 2 + 30, startY, 320, 44, '도전 시작',
      () => this.startChallengeGame(),
      { fontSize: 16, bg: 0xe2a04a, bgHover: 0xf5b850, textColor: '#0b0b10', textColorActive: '#0b0b10' });

    // ── 룰셋 도전 모드 (좌측, 빌딩 아래) + 일일 챌린지 (좌측 우측) ──
    // 모든 테마 클리어 시 해금
    this.buildChallengeUnlockables(allCleared);
  }

  private buildChallengeUnlockables(unlocked: boolean): void {
    // 룰셋 도전 (좌측 하단)
    this.add.text(110, 640, '룰셋 도전 모드', {
      fontFamily: FONT, fontSize: '11px', color: unlocked ? '#f5c542' : '#5a5a68', fontStyle: 'bold',
    }).setOrigin(0.5);

    if (unlocked) {
      this.challengeLabel = this.add.text(110, 656, '', {
        fontFamily: FONT, fontSize: '11px', color: COLORS.text,
        wordWrap: { width: 200 }, align: 'center',
      }).setOrigin(0.5, 0);
      new Button(this, 50, 700, 50, 26, '◀', () => this.cycleChallenge(-1), { fontSize: 12 });
      new Button(this, 170, 700, 50, 26, '▶', () => this.cycleChallenge(1), { fontSize: 12 });
      this.refreshChallengeLabel();
    } else {
      this.add.text(110, 660, '🔒 모든 테마 7일차 클리어 시 해금', {
        fontFamily: FONT, fontSize: '10px', color: '#5a5a68', align: 'center',
        wordWrap: { width: 200 },
      }).setOrigin(0.5, 0);
    }

    // 일일 챌린지 (좌측 우측)
    const dx = 270;
    this.add.text(dx, 640, '오늘의 일일 챌린지', {
      fontFamily: FONT, fontSize: '11px', color: unlocked ? '#7ed957' : '#5a5a68', fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    if (unlocked) {
      const daily = todayDaily();
      const dailyBest = todayBestDay();
      this.add.text(dx, 656, `${daily.dateString}`, {
        fontFamily: FONT, fontSize: '10px', color: COLORS.textDim,
      });
      const dailyCh = challengeById(daily.challengeId);
      this.add.text(dx, 670, `${dailyCh?.name ?? '?'} (${daily.themeId})`, {
        fontFamily: FONT, fontSize: '11px', color: COLORS.text,
      });
      this.add.text(dx, 684, dailyBest > 0 ? `오늘 최고: ${dailyBest}일차` : '도전 안 함', {
        fontFamily: FONT, fontSize: '10px', color: dailyBest > 0 ? '#f5c542' : COLORS.textDim,
      });
      new Button(this, dx + 80, 706, 160, 24, '일일 도전 시작', () => this.startDaily(),
        { fontSize: 11, bg: 0x4a6a32, bgHover: 0x6a8a42, textColor: '#0b0b10', textColorActive: '#0b0b10' });
    } else {
      this.add.text(dx, 660, '🔒 모든 테마 7일차 클리어 시 해금', {
        fontFamily: FONT, fontSize: '10px', color: '#5a5a68', wordWrap: { width: 220 },
      }).setOrigin(0, 0);
    }
  }

  // ───────────────────────────────────────────────────────
  //  Actions
  // ───────────────────────────────────────────────────────
  private startStory(): void {
    this.scene.stop('Help');
    this.scene.start('Game', { theme: 'office', storyMode: true });
  }

  private startChallengeGame(): void {
    this.scene.stop('Help');
    this.scene.start('Game', { theme: this.selectedTheme, challenge: this.selectedChallenge });
  }

  private continueGame(): void {
    this.scene.stop('Help');
    this.scene.start('Game', { load: true });
  }

  private startDaily(): void {
    const d = todayDaily();
    this.scene.stop('Help');
    this.scene.start('Game', { theme: d.themeId, challenge: d.challengeId, dailySeed: d.seed });
  }

  // ───────────────────────────────────────────────────────
  //  Helpers
  // ───────────────────────────────────────────────────────
  private refreshThemeCards(): void { if (this.themeRefresh) this.themeRefresh(); }

  private cycleChallenge(dir: 1 | -1 = 1): void {
    const ids = [null, ...Object.keys(CHALLENGES)];
    const idx = ids.indexOf(this.selectedChallenge);
    const nextIdx = (idx + dir + ids.length) % ids.length;
    this.selectedChallenge = ids[nextIdx] as string | null;
    this.refreshChallengeLabel();
  }

  private refreshChallengeLabel(): void {
    if (!this.challengeLabel) return;
    if (!this.selectedChallenge) {
      this.challengeLabel.setText('일반 (없음)');
      this.challengeLabel.setColor(COLORS.textDim);
      return;
    }
    const ch = challengeById(this.selectedChallenge);
    if (!ch) { this.challengeLabel.setText('일반 (없음)'); return; }
    this.challengeLabel.setText(`${ch.name} — ${ch.desc}`);
    this.challengeLabel.setColor('#f5c542');
  }

  private toast(msg: string): void {
    const t = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 100, msg, {
      fontFamily: FONT, fontSize: '13px', color: '#f5c542',
      backgroundColor: '#14141c', padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setDepth(100);
    this.tweens.add({
      targets: t, alpha: 0, y: GAME_HEIGHT - 140, duration: 1800, ease: 'Quad.easeIn',
      onComplete: () => t.destroy(),
    });
  }
}

import Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { t as tr } from '../i18n/locale';
import { CHALLENGES, challengeById } from '../meta/challenges';
import { todayBestDay, todayDaily } from '../meta/daily';
import { loadOptions } from '../meta/options';
import { isUnlocked, loadProgression, unlockLabel } from '../meta/progression';
import { readSave, saveExists, summarize } from '../meta/save';
import { DEFAULT_THEME, ThemeId, THEMES } from '../meta/themes';
import { Button } from '../ui/Button';

const TUTORIAL_KEY = 'elevator-rogue.tutorialShown';

export class TitleScene extends Phaser.Scene {
  private selectedTheme: ThemeId = DEFAULT_THEME;
  private themeRefresh: (() => void) | null = null;
  /** 도전 모드 id. null = 일반 모드 */
  private selectedChallenge: string | null = null;
  private challengeLabel: Phaser.GameObjects.Text | null = null;

  constructor() { super('Title'); }

  create(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0b0b10).setOrigin(0.5);

    // 좌측 빌딩 실루엣 + 창문 깜빡임
    const g = this.add.graphics();
    g.fillStyle(0x14141c, 1);
    g.fillRect(80, 140, 240, 480);
    g.lineStyle(1, 0x2a2a35, 1);
    g.strokeRect(80, 140, 240, 480);
    for (let i = 0; i < 8; i++) g.lineBetween(80, 140 + i * 60, 320, 140 + i * 60);
    // 엘리베이터 cab (정적)
    g.fillStyle(0x4a90e2, 1);
    g.fillRect(160, 360, 36, 56);

    // 창문 픽셀 — 각각 Rectangle 객체로 만들어 깜빡임 tween 적용.
    const windowConfigs: Array<{ r: number; c: number; baseAlpha: number; period: number }> = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 5; c++) {
        if (((r * 5 + c) % 7) === 0) {
          // 항상 켜진 듯한 큰 base + 가끔 깜빡임
          windowConfigs.push({ r, c, baseAlpha: 0.45, period: 2400 + ((r * 5 + c) * 137) % 2000 });
        } else if (((r * 5 + c) % 11) === 3) {
          // 가끔 켜졌다 꺼지는 창문
          windowConfigs.push({ r, c, baseAlpha: 0.0, period: 3800 + ((r * 5 + c) * 211) % 2500 });
        }
      }
    }
    for (const w of windowConfigs) {
      const rect = this.add.rectangle(100 + w.c * 40 + 3, 160 + w.r * 60 + 3, 6, 6, 0xf5c542, w.baseAlpha).setOrigin(0.5);
      // 각 창문마다 다른 페이즈로 alpha 깜빡임 (불 켜졌다 꺼졌다)
      this.tweens.add({
        targets: rect,
        alpha: w.baseAlpha > 0.2 ? { from: 0.45, to: 0.95 } : { from: 0, to: 0.6 },
        duration: w.period,
        yoyo: true,
        repeat: -1,
        delay: (w.r * 5 + w.c) * 73,
        ease: 'Sine.easeInOut',
      });
    }
    // 엘리베이터 cab 도 위아래 천천히 움직임 (운영 분위기)
    const cab = this.add.rectangle(178, 388, 36, 56, 0x4a90e2, 1).setOrigin(0.5);
    g.fillStyle(0x0b0b10, 1); // graphics 의 cab 자리는 빈자리로
    g.fillRect(160, 360, 36, 56);
    this.tweens.add({
      targets: cab, y: 268, duration: 6000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // 타이틀 (위로 올려 공간 확보)
    this.add.text(GAME_WIDTH / 2 + 30, 100, '분주한', {
      fontFamily: FONT, fontSize: '54px', color: COLORS.text, fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.add.text(GAME_WIDTH / 2 + 30, 156, '승강씨', {
      fontFamily: FONT, fontSize: '54px', color: '#f5c542', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.add.text(GAME_WIDTH / 2 + 30, 224, tr('title.subtitle'), {
      fontFamily: FONT, fontSize: '12px', color: COLORS.textDim,
    }).setOrigin(0.5, 0);

    // 테마 선택
    this.add.text(GAME_WIDTH / 2 + 30, 256, tr('title.theme_section'), {
      fontFamily: FONT, fontSize: '13px', color: '#f5c542',
    }).setOrigin(0.5, 0);

    const themes = Object.values(THEMES);
    const cardW = 200, cardH = 62, gap = 6;
    const startX = GAME_WIDTH / 2 + 30 - (cardW * 2 + gap) / 2;
    const themeY = 280;
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

      const nameText = this.add.text(x + 10, y + 4, locked ? `🔒 ${t.name}` : t.name, {
        fontFamily: FONT, fontSize: '12px', color: locked ? '#5a5a68' : COLORS.text,
      });
      this.add.text(x + 10, y + 22, t.flavor, {
        fontFamily: FONT, fontSize: '10px', color: locked ? '#3a3a48' : '#f5c542',
      });
      const descText = this.add.text(x + 10, y + 38, locked ? `해금: ${unlockLabel(t.id)}` : t.desc, {
        fontFamily: FONT, fontSize: '10px', color: locked ? '#5a5a68' : COLORS.textDim,
        wordWrap: { width: cardW - 20 },
      });
      if (t.startingGoldBonus && !locked) {
        this.add.text(x + cardW - 10, y + 4, `+${t.startingGoldBonus}G`, {
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

    // 시작 / 계속하기 / 조작법 — 그리드 아래 충분한 마진 확보 (카오스 카드와 겹침 방지)
    const btnX = GAME_WIDTH / 2 + 30;
    const themeRows = Math.ceil(themes.length / 2);
    const gridBottom = themeY + themeRows * cardH + (themeRows - 1) * gap;
    let btnY = gridBottom + 28;

    const hasSave = saveExists();
    if (hasSave) {
      const save = readSave();
      new Button(this, btnX, btnY, 280, 42, tr('title.continue'), () => this.continueGame(),
        { fontSize: 14, bg: 0x7ed957, bgHover: 0x8fea68, textColor: '#0b0b10', textColorActive: '#0b0b10' });
      // summary 텍스트는 버튼 아래(밖)에 표시 — 안쪽에 두면 버튼 bg와 겹쳐 가독성 0.
      if (save) {
        this.add.text(btnX, btnY + 30, summarize(save), {
          fontFamily: FONT, fontSize: '11px', color: COLORS.textDim,
        }).setOrigin(0.5, 0);
      }
      btnY += 64;
      new Button(this, btnX, btnY, 280, 34, tr('title.new_game'), () => this.startGame(),
        { fontSize: 13, bg: 0x4a90e2, bgHover: 0x5aa0f2, textColor: '#0b0b10', textColorActive: '#0b0b10' });
      btnY += 38;
    } else {
      new Button(this, btnX, btnY, 280, 42, tr('title.start'), () => this.startGame(),
        { fontSize: 16, bg: 0x4a90e2, bgHover: 0x5aa0f2, textColor: '#0b0b10', textColorActive: '#0b0b10' });
      btnY += 48;
    }
    // 보조 버튼은 가로 row 1줄로 압축 (Help / Options / Stats)
    const subW = 90, subGap = 4;
    const subTotalW = subW * 3 + subGap * 2;
    const subStartX = btnX - subTotalW / 2 + subW / 2;
    new Button(this, subStartX, btnY + 16, subW, 30, tr('title.help'),
      () => this.scene.launch('Help'), { fontSize: 12 });
    new Button(this, subStartX + (subW + subGap), btnY + 16, subW, 30, tr('title.options'),
      () => this.scene.launch('Options'), { fontSize: 12 });
    new Button(this, subStartX + 2 * (subW + subGap), btnY + 16, subW, 30, tr('title.stats'),
      () => this.scene.launch('Stats'), { fontSize: 12 });
    btnY += 36;
    if (import.meta.env.DEV) {
      new Button(this, btnX, btnY + 20, 280, 22, '[DEV] docs·design·sounds·sprites', () => {
        window.open('/docs.html', '_blank');
        window.open('/design.html', '_blank');
        window.open('/sounds.html', '_blank');
        window.open('/sprites.html', '_blank');
      }, { fontSize: 10 });
    }

    this.add.text(GAME_WIDTH - 16, GAME_HEIGHT - 16, 'v0.2 alpha', {
      fontFamily: FONT, fontSize: '10px', color: '#3a3a48',
    }).setOrigin(1, 1);
    // Credits 작은 링크 — 우하단 v 옆
    this.add.text(GAME_WIDTH - 90, GAME_HEIGHT - 16, 'Credits', {
      fontFamily: FONT, fontSize: '10px', color: '#5a5a68',
    }).setOrigin(1, 1).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.launch('Credits'));

    // ── 도전 모드 (좌측, 빌딩 실루엣 아래) ──
    // 잠금 조건: 어떤 테마든 best day >= 3
    const CHALLENGE_UNLOCK_DAY = 3;
    const DAILY_UNLOCK_DAY = 5;
    const challengeUnlocked = prog.bestDayOverall >= CHALLENGE_UNLOCK_DAY;
    const dailyUnlocked = prog.bestDayOverall >= DAILY_UNLOCK_DAY;

    this.add.text(110, 640, '도전 모드', {
      fontFamily: FONT, fontSize: '11px', color: challengeUnlocked ? '#f5c542' : '#5a5a68', fontStyle: 'bold',
    }).setOrigin(0.5);

    if (challengeUnlocked) {
      this.challengeLabel = this.add.text(110, 656, '', {
        fontFamily: FONT, fontSize: '11px', color: COLORS.text,
        wordWrap: { width: 200 }, align: 'center',
      }).setOrigin(0.5, 0);
      // ◀ prev / next ▶ 두 버튼으로 분리
      new Button(this, 50, 700, 50, 26, '◀', () => this.cycleChallenge(-1), { fontSize: 12 });
      new Button(this, 170, 700, 50, 26, '▶', () => this.cycleChallenge(1), { fontSize: 12 });
      this.refreshChallengeLabel();
    } else {
      this.add.text(110, 660, `🔒 ${CHALLENGE_UNLOCK_DAY}일차 도달 시 해금`, {
        fontFamily: FONT, fontSize: '10px', color: '#5a5a68', align: 'center',
        wordWrap: { width: 200 },
      }).setOrigin(0.5, 0);
    }

    // ── 일일 챌린지 (좌측, 도전 모드 옆) ──
    const dx = 270;
    this.add.text(dx, 640, '오늘의 일일 챌린지', {
      fontFamily: FONT, fontSize: '11px', color: dailyUnlocked ? '#7ed957' : '#5a5a68', fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    if (dailyUnlocked) {
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
      this.add.text(dx, 660, `🔒 ${DAILY_UNLOCK_DAY}일차 도달 시 해금`, {
        fontFamily: FONT, fontSize: '10px', color: '#5a5a68', wordWrap: { width: 220 },
      }).setOrigin(0, 0);
    }

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
    this.scene.start('Game', { theme: this.selectedTheme, challenge: this.selectedChallenge });
  }

  private continueGame(): void {
    this.scene.stop('Help');
    this.scene.start('Game', { load: true });
  }

  /** 일일 챌린지 시작 — 시드/테마/챌린지 모두 오늘 날짜로 고정 */
  private startDaily(): void {
    const d = todayDaily();
    this.scene.stop('Help');
    this.scene.start('Game', { theme: d.themeId, challenge: d.challengeId, dailySeed: d.seed });
  }

  /** 도전 모드 cycle — 없음 → 5종 → 없음 반복. dir=+1 다음, -1 이전. */
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
}

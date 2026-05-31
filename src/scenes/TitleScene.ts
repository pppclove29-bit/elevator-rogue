import Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { t as tr } from '../i18n/locale';
import { CHALLENGES, challengeById } from '../meta/challenges';
import { todayBestDay, todayDaily } from '../meta/daily';
import { isAllThemesCleared, isStoryCleared, isUnlocked, loadProgression, unlockLabel } from '../meta/progression';
import { readSave, saveExists, summarize } from '../meta/save';
import { ThemeId, THEMES } from '../meta/themes';
import { Button } from '../ui/Button';


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
    // 빠른 가이드 자동 표시 제거 — 사용자가 [조작법] / [옵션] 등을 직접 누를 때만 표시.
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
    // 빌딩 + 옆 건물 + 도로 + 가로등 + 별 — 도시 야경 무드.
    // sprite (decor-title-building) 있으면 배경으로 사용, 절차적 디테일은 위에 덧붙임.
    const buildingX = 80, buildingY = 140, buildingW = 240, buildingH = 480;
    const g = this.add.graphics();

    // 1) 밤하늘 별
    g.fillStyle(0xffffff, 0.5);
    const starSeed = (n: number) => ((n * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < 60; i++) {
      const sx = starSeed(i) * (buildingX + buildingW + 40);
      const sy = starSeed(i + 100) * (buildingY - 20);
      g.fillRect(Math.floor(sx), Math.floor(sy + 10), 1, 1);
    }

    // 2) 옆 작은 건물들 (실루엣)
    g.fillStyle(0x0e0e16, 1);
    g.fillRect(20, 280, 56, 340);
    g.fillRect(buildingX + buildingW + 6, 320, 60, 300);
    g.lineStyle(1, 0x1c1c26, 1);
    g.strokeRect(20, 280, 56, 340);
    g.strokeRect(buildingX + buildingW + 6, 320, 60, 300);
    // 옆 건물 작은 창문
    g.fillStyle(0xf5c542, 0.35);
    for (let r = 0; r < 12; r++) {
      for (let c = 0; c < 3; c++) {
        if (((r * 3 + c) % 4) !== 0) continue;
        g.fillRect(28 + c * 16, 290 + r * 26, 5, 5);
      }
    }
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 3; c++) {
        if (((r * 3 + c + 1) % 5) !== 0) continue;
        g.fillRect(buildingX + buildingW + 14 + c * 16, 332 + r * 26, 5, 5);
      }
    }

    // 3) 메인 빌딩 본체
    g.fillStyle(0x14141c, 1);
    g.fillRect(buildingX, buildingY, buildingW, buildingH);
    g.lineStyle(1, 0x2a2a35, 1);
    g.strokeRect(buildingX, buildingY, buildingW, buildingH);
    // 층 구분선
    for (let i = 0; i < 8; i++) g.lineBetween(buildingX, buildingY + i * 60, buildingX + buildingW, buildingY + i * 60);
    // 옥상 패럽 (rooftop antenna 같은 디테일)
    g.fillStyle(0x2a2a35, 1);
    g.fillRect(buildingX + buildingW / 2 - 30, buildingY - 14, 60, 14);
    g.fillStyle(0xe2a04a, 0.6);
    g.fillRect(buildingX + buildingW / 2 - 2, buildingY - 32, 4, 18);
    // 안테나 깜빡임 효과 (빨간 등)
    const antLight = this.add.rectangle(buildingX + buildingW / 2, buildingY - 34, 6, 6, 0xff5555, 0.9).setOrigin(0.5);
    this.tweens.add({ targets: antLight, alpha: { from: 0.3, to: 1 }, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // 4) 엘베 샤프트 — 빌딩 가운데
    const shaftX = buildingX + buildingW / 2 - 18;
    const shaftW = 36;
    g.fillStyle(0x0b0b10, 1);
    g.fillRect(shaftX, buildingY + 4, shaftW, buildingH - 8);
    g.lineStyle(1, 0x222230, 1);
    g.lineBetween(shaftX, buildingY + 4, shaftX, buildingY + buildingH - 4);
    g.lineBetween(shaftX + shaftW, buildingY + 4, shaftX + shaftW, buildingY + buildingH - 4);

    // 5) 빌딩 창문 — 좌/우 컬럼 (샤프트 양쪽). 훨씬 더 채워서 도시 느낌.
    const winRows = 8;
    const winColsPerSide = 3;
    const cellW = 30;
    const cellH = 50;
    for (let r = 0; r < winRows; r++) {
      for (let c = 0; c < winColsPerSide * 2; c++) {
        // 좌측 3칸 / 우측 3칸 — 샤프트 건너뛰고
        const sideOffset = c < winColsPerSide
          ? buildingX + 18 + c * cellW
          : shaftX + shaftW + 6 + (c - winColsPerSide) * cellW;
        const wx = sideOffset;
        const wy = buildingY + 8 + r * cellH;
        // 단계별 알파 — 80% 셀이 어떤 형태로든 켜져있음
        const seed = r * 31 + c * 7;
        const pick = seed % 10;
        let baseAlpha: number;
        let blink: 'steady' | 'soft' | 'rare';
        if (pick < 4) { baseAlpha = 0.7; blink = 'steady'; }
        else if (pick < 7) { baseAlpha = 0.45; blink = 'soft'; }
        else if (pick < 9) { baseAlpha = 0.0; blink = 'rare'; }
        else continue; // 어두운 방
        const rect = this.add.rectangle(wx + cellW / 2 - 6, wy + cellH / 2 - 4, 12, 14, 0xf5c542, baseAlpha).setOrigin(0.5);
        if (blink === 'steady') {
          this.tweens.add({ targets: rect, alpha: { from: 0.55, to: 0.95 }, duration: 1800 + seed * 31, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: seed * 17 });
        } else if (blink === 'soft') {
          this.tweens.add({ targets: rect, alpha: { from: 0.25, to: 0.7 }, duration: 2400 + seed * 41, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: seed * 29 });
        } else {
          this.tweens.add({ targets: rect, alpha: { from: 0, to: 0.6 }, duration: 4000 + seed * 53, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: seed * 41 });
        }
      }
    }

    // 6) 인도(sidewalk) + 도로 + 가로등
    //    인도: 건물 바로 아래 14px 회색 띠 — 사람이 다니는 곳
    //    도로: 인도 아래, 어두운 색 + 차선 점선
    const sidewalkY = buildingY + buildingH;
    const sidewalkH = 16;
    const roadY = sidewalkY + sidewalkH;
    g.fillStyle(0x1c1c26, 1); // 인도
    g.fillRect(0, sidewalkY, GAME_WIDTH, sidewalkH);
    g.fillStyle(0x080810, 1); // 도로
    g.fillRect(0, roadY, GAME_WIDTH, 80);
    g.lineStyle(1, 0x222230, 1);
    g.lineBetween(0, sidewalkY, GAME_WIDTH, sidewalkY);
    g.lineBetween(0, roadY, GAME_WIDTH, roadY);
    // 도로 점선 (중앙 차선)
    g.fillStyle(0x2a2a35, 1);
    for (let dx = 0; dx < GAME_WIDTH; dx += 24) g.fillRect(dx, roadY + 28, 12, 2);
    // 가로등 (좌측 작은 건물 옆)
    g.fillStyle(0x3a3a48, 1);
    g.fillRect(86, sidewalkY - 30, 2, 30);
    g.fillStyle(0xfff0a0, 0.6);
    g.fillCircle(87, sidewalkY - 32, 5);

    // 7) 움직이는 엘베 캐브 — 샤프트 안에서 부드럽게 위아래
    const cabW = shaftW - 8;
    const cabH = 48;
    const cab = this.add.rectangle(shaftX + shaftW / 2, buildingY + buildingH - 50, cabW, cabH, 0x4a90e2, 1).setOrigin(0.5);
    // cab 내부 디테일 (창문 라인)
    const cabLine = this.add.rectangle(shaftX + shaftW / 2, buildingY + buildingH - 50, cabW - 6, 2, 0x0b0b10, 0.5).setOrigin(0.5);
    this.tweens.add({
      targets: [cab, cabLine],
      y: buildingY + 50,
      duration: 7000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // 8) 보행자 — 인도(sidewalk) 위에서 좌우 왕복. 도로 X.
    const streetY = sidewalkY + sidewalkH / 2;
    const PEDESTRIAN_COLORS = [0xb0b0c0, 0xb89968, 0xb08cff, 0x7ed957, 0xf5c542, 0xff9ed8, 0xc0a86a];
    const pedestrianCount = 7;
    for (let i = 0; i < pedestrianCount; i++) {
      const goLeftToRight = i % 2 === 0;
      const startX = goLeftToRight ? -12 : GAME_WIDTH + 12;
      const endX = goLeftToRight ? GAME_WIDTH + 12 : -12;
      const yJitter = (i % 3) * 4 - 2;
      const color = PEDESTRIAN_COLORS[i % PEDESTRIAN_COLORS.length]!;
      const ped = this.add.container(startX, streetY + yJitter);
      const body = this.add.rectangle(0, 2, 4, 8, color, 1).setOrigin(0.5);
      const head = this.add.rectangle(0, -5, 3, 3, color, 1).setOrigin(0.5);
      // 가방/짐 — 일부 보행자만
      if (i % 3 === 0) {
        const bag = this.add.rectangle(2.5, 2, 2, 4, 0x4a4a55, 1).setOrigin(0.5);
        ped.add(bag);
      }
      ped.add([body, head]);
      // 좌우 방향에 따라 뒤집어서 가방 위치 다르게 보이도록
      if (!goLeftToRight) ped.scaleX = -1;

      const duration = 9000 + (i * 1700) % 6000;  // 사람마다 다른 속도
      const delay = (i * 1300) % 8000;

      // 살짝 위아래 흔들리는 걸음 (별도 tween)
      this.tweens.add({
        targets: ped, y: streetY + yJitter - 1.5,
        duration: 240 + (i * 17) % 80,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay,
      });
      // 좌우 이동 — 끝까지 가면 즉시 반대편에서 다시 시작
      this.tweens.add({
        targets: ped, x: endX,
        duration, repeat: -1, ease: 'Linear', delay,
        onRepeat: () => { ped.x = startX; },
      });
    }
  }

  private buildTitle(): void {
    this.add.text(GAME_WIDTH / 2 + 30, 100, '분주한', {
      fontFamily: FONT, fontSize: '54px', color: COLORS.text, fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.add.text(GAME_WIDTH / 2 + 30, 156, '승강씨', {
      fontFamily: FONT, fontSize: '54px', color: '#f5c542', fontStyle: 'bold',
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
    y += 72;

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

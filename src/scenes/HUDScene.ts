import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, COLORS, TICK_MS } from '../config';
import { DAY_OF_WEEK_LABEL, dayOfWeekFor, dayToDate, phaseAtTick, PHASE_LABEL, WEEKEND } from '../domain/phase';
import { countActiveAngry, GAME_OVER_ACTIVE_ANGRY, repairElevator } from '../domain/simulation';
import { REPAIR_COST } from '../domain/types';
import { MAX_SKILLS, skillById } from '../meta/skills';
import { GameScene } from './GameScene';

const SPEEDS = [1, 2, 4, 8] as const;

export class HUDScene extends Phaser.Scene {
  private timeText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private dangerText!: Phaser.GameObjects.Text;
  private modifierText!: Phaser.GameObjects.Text;
  private relicText!: Phaser.GameObjects.Text;
  private eventText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private phaseBarBg!: Phaser.GameObjects.Rectangle;
  private phaseBarFill!: Phaser.GameObjects.Rectangle;
  private pauseBtn!: ControlButton;
  private speedBtns: ControlButton[] = [];
  private restartBtn!: ControlButton;
  private skillSlots: SkillSlotView[] = [];
  private repairContainer!: Phaser.GameObjects.Container;

  constructor() {
    super('HUD');
  }

  create(): void {
    const game = this.scene.get('Game') as GameScene;

    this.timeText = this.add.text(16, 12, '0:00', {
      fontFamily: '"DotGothic16", "Press Start 2P", monospace',
      fontSize: '22px',
      color: COLORS.text,
    });

    this.goldText = this.add.text(120, 16, '0G', {
      fontFamily: '"DotGothic16", "Press Start 2P", monospace',
      fontSize: '18px',
      color: '#f5c542',
    });

    this.dangerText = this.add.text(GAME_WIDTH - 16, 12, '', {
      fontFamily: '"DotGothic16", "Press Start 2P", monospace',
      fontSize: '14px',
      color: COLORS.textDim,
    }).setOrigin(1, 0);

    this.modifierText = this.add.text(GAME_WIDTH - 16, 32, '', {
      fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '11px', color: '#e74c3c',
    }).setOrigin(1, 0);

    this.relicText = this.add.text(GAME_WIDTH - 16, 50, '', {
      fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '11px', color: '#e2a04a',
    }).setOrigin(1, 0);

    this.eventText = this.add.text(GAME_WIDTH - 16, 68, '', {
      fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '12px', color: '#ff6a6a',
    }).setOrigin(1, 0);

    this.phaseText = this.add.text(GAME_WIDTH / 2, 16, '', {
      fontFamily: '"DotGothic16", "Press Start 2P", monospace',
      fontSize: '20px',
      color: COLORS.text,
    }).setOrigin(0.5, 0);

    const barW = 220;
    const barH = 6;
    const barX = GAME_WIDTH / 2 - barW / 2;
    const barY = 46;
    this.phaseBarBg = this.add.rectangle(barX, barY, barW, barH, 0x222230).setOrigin(0, 0);
    this.phaseBarFill = this.add.rectangle(barX, barY, 0, barH, 0x4a90e2).setOrigin(0, 0);

    this.buildControlBar(game);
    this.buildSkillBar(game);
    this.repairContainer = this.add.container(0, 0);
    if (import.meta.env.DEV) this.buildDevLinks();
  }

  private buildDevLinks(): void {
    const y = GAME_HEIGHT - 28;
    const open = (path: string) => () => window.open(path, '_blank');
    new ControlButton(this, 16, y - 14, 70, 24, 'DOCS', open('/docs.html'));
    new ControlButton(this, 92, y - 14, 80, 24, 'DESIGN', open('/design.html'));
    this.add.text(180, y - 12, '[DEV]', {
      fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '10px', color: '#5a5a68',
    });
  }

  private buildSkillBar(game: GameScene): void {
    const keys = ['Q', 'W', 'E'];
    const slotW = 150;
    const slotH = 70;
    const gap = 10;
    const totalW = slotW * MAX_SKILLS + gap * (MAX_SKILLS - 1);
    const startX = GAME_WIDTH - totalW - 16;
    const y = GAME_HEIGHT - slotH - 16;
    for (let i = 0; i < MAX_SKILLS; i++) {
      const slot = new SkillSlotView(this, startX + i * (slotW + gap), y, slotW, slotH, keys[i]!, () => game.useSkillSlot(i));
      this.skillSlots.push(slot);
    }
  }

  private buildControlBar(game: GameScene): void {
    const y = 44;
    let x = 16;
    const gap = 6;

    this.pauseBtn = new ControlButton(this, x, y, 80, 28, '일시정지', () => game.togglePause());
    x += 80 + gap + 8;

    for (const s of SPEEDS) {
      const btn = new ControlButton(this, x, y, 40, 28, `${s}x`, () => game.setSpeed(s));
      this.speedBtns.push(btn);
      x += 40 + gap;
    }

    x += 8;
    this.restartBtn = new ControlButton(this, x, y, 80, 28, '재시작', () => game.restart());
  }

  update(): void {
    const game = this.scene.get('Game') as GameScene;
    if (!game?.state) return;

    const totalSec = Math.floor((game.state.tick * TICK_MS) / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    this.timeText.setText(`${m}:${s.toString().padStart(2, '0')}`);
    this.goldText.setText(`${game.state.gold}G`);

    const info = phaseAtTick(game.state.tick);
    const dayNum = info.day + 1;
    const cal = dayToDate(dayNum);
    const dow = dayOfWeekFor(dayNum);
    const dowLabel = DAY_OF_WEEK_LABEL[dow];
    const weekendColor = WEEKEND.has(dow) ? '#ffd700' : COLORS.text;
    const yearPrefix = cal.year > 1 ? `${cal.year}년차 ` : '';
    this.phaseText.setText(`${yearPrefix}${cal.monthName} ${cal.date}일 (${dowLabel}) · ${PHASE_LABEL[info.phase]}`);
    this.phaseText.setColor(weekendColor);
    const ratio = info.tickInPhase / info.phaseTicks;
    const barW = this.phaseBarBg.width;
    this.phaseBarFill.width = Math.max(2, Math.floor(barW * ratio));

    this.pauseBtn.setLabel(game.paused ? '재개' : '일시정지');
    this.pauseBtn.setActive(game.paused);
    for (let i = 0; i < SPEEDS.length; i++) {
      this.speedBtns[i]!.setActive(!game.paused && game.timeScale === SPEEDS[i]);
    }
    this.restartBtn.setActive(false);

    const angry = countActiveAngry(game.state);
    this.dangerText.setText(`불만  ${angry} / ${GAME_OVER_ACTIVE_ANGRY}`);
    this.dangerText.setColor(angry >= GAME_OVER_ACTIVE_ANGRY - 1 ? '#e74c3c' : COLORS.textDim);

    const mods = game.state.activeModifiers;
    this.modifierText.setText(mods.length > 0 ? `오늘의 변수: ${mods.length}` : '');
    this.relicText.setText(game.state.ownedRelics.length > 0 ? `유물 ${game.state.ownedRelics.length}` : '');
    if (game.activeEventToday) {
      const isBoss = game.activeEventToday.name.includes('🔥');
      this.eventText.setText(isBoss ? game.activeEventToday.name : `⚠ ${game.activeEventToday.name}`);
      this.eventText.setFontSize(isBoss ? 14 : 12);
      this.eventText.setColor(isBoss ? '#ffd700' : '#ff6a6a');
    } else {
      this.eventText.setText('');
    }

    this.updateRepairButtons(game);

    for (let i = 0; i < this.skillSlots.length; i++) {
      const slotId = game.state.ownedSkills[i];
      if (!slotId) {
        this.skillSlots[i]!.renderEmpty();
        continue;
      }
      const skill = skillById(slotId);
      const cd = game.state.skillCooldowns[slotId] ?? 0;
      this.skillSlots[i]!.renderSkill(skill.name, cd, skill.cooldownTicks);
    }
  }

  private updateRepairButtons(game: GameScene): void {
    this.repairContainer.removeAll(true);
    const broken = game.state.building.elevators.filter((e) => e.state.kind === 'broken');
    if (broken.length === 0) return;

    const startY = 84;
    const titleY = startY;
    const title = this.add.text(GAME_WIDTH - 16, titleY, '긴급 수리', {
      fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '11px', color: '#e74c3c',
    }).setOrigin(1, 0);
    this.repairContainer.add(title);

    let y = titleY + 18;
    for (const e of broken) {
      const affordable = game.state.gold >= REPAIR_COST;
      const bg = this.add.rectangle(GAME_WIDTH - 16, y, 150, 24, affordable ? 0xe74c3c : 0x4a2222, affordable ? 1 : 0.6)
        .setOrigin(1, 0).setStrokeStyle(1, 0x6a2c2c)
        .setInteractive({ useHandCursor: affordable });
      const txt = this.add.text(GAME_WIDTH - 16 - 75, y + 12, `🔧 E${e.id + 1} 수리 ${REPAIR_COST}G`, {
        fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '11px',
        color: affordable ? '#0b0b10' : '#7a5a5a',
      }).setOrigin(0.5);
      if (affordable) {
        bg.on('pointerdown', () => { repairElevator(game.state, e.id); });
      }
      this.repairContainer.add([bg, txt]);
      y += 28;
    }
  }
}

class SkillSlotView {
  private bg: Phaser.GameObjects.Rectangle;
  private keyLabel: Phaser.GameObjects.Text;
  private nameLabel: Phaser.GameObjects.Text;
  private cdFill: Phaser.GameObjects.Rectangle;
  private cdText: Phaser.GameObjects.Text;
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, x: number, y: number, w: number, h: number, key: string, onClick: () => void) {
    this.container = scene.add.container(x + w / 2, y + h / 2);
    this.bg = scene.add.rectangle(0, 0, w, h, 0x1c1c26, 0.85).setStrokeStyle(1, 0x3a3a48);
    this.keyLabel = scene.add.text(-w / 2 + 8, -h / 2 + 6, key, {
      fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '12px', color: '#7ed957',
    });
    this.nameLabel = scene.add.text(0, -4, '', {
      fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '13px', color: COLORS.text,
      wordWrap: { width: w - 16 }, align: 'center',
    }).setOrigin(0.5);
    this.cdFill = scene.add.rectangle(-w / 2, h / 2 - 4, 0, 4, 0x7ed957, 1).setOrigin(0, 0.5);
    this.cdText = scene.add.text(0, h / 2 - 14, '', {
      fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '10px', color: COLORS.textDim,
    }).setOrigin(0.5);
    this.container.add([this.bg, this.keyLabel, this.nameLabel, this.cdFill, this.cdText]);
    this.container.setSize(w, h);
    this.container.setInteractive({ useHandCursor: true });
    this.container.on('pointerdown', onClick);
  }

  renderEmpty(): void {
    this.bg.setFillStyle(0x111119, 0.6);
    this.bg.setStrokeStyle(1, 0x2a2a35);
    this.nameLabel.setText('empty');
    this.nameLabel.setColor('#3a3a48');
    this.keyLabel.setColor('#3a3a48');
    this.cdFill.width = 0;
    this.cdText.setText('');
  }

  renderSkill(name: string, cd: number, maxCd: number): void {
    const ready = cd <= 0;
    this.bg.setFillStyle(ready ? 0x1c2620 : 0x1c1c26, 0.9);
    this.bg.setStrokeStyle(1, ready ? 0x7ed957 : 0x3a3a48);
    this.nameLabel.setText(name);
    this.nameLabel.setColor(ready ? COLORS.text : '#9aa0a6');
    this.keyLabel.setColor(ready ? '#7ed957' : '#3a3a48');
    const w = this.bg.width;
    const ratio = ready ? 1 : 1 - cd / maxCd;
    this.cdFill.width = Math.max(0, w * ratio);
    this.cdFill.setFillStyle(ready ? 0x7ed957 : 0x4a90e2, 1);
    this.cdText.setText(ready ? 'READY' : `${((cd * 50) / 1000).toFixed(1)}s`);
    this.cdText.setColor(ready ? '#7ed957' : COLORS.textDim);
  }
}

class ControlButton {
  container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private currentlyActive = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    onClick: () => void,
    relative = false,
  ) {
    this.container = scene.add.container(relative ? x : x + w / 2, relative ? y : y + h / 2);
    this.bg = scene.add.rectangle(0, 0, w, h, 0x222230, 1).setStrokeStyle(1, 0x3a3a48);
    this.label = scene.add.text(0, 0, text, {
      fontFamily: '"DotGothic16", "Press Start 2P", monospace',
      fontSize: '13px',
      color: COLORS.text,
    }).setOrigin(0.5);
    this.container.add([this.bg, this.label]);
    this.container.setSize(w, h);
    this.container.setInteractive({ useHandCursor: true });
    this.container.on('pointerdown', onClick);
    this.container.on('pointerover', () => {
      if (!this.currentlyActive) this.bg.setFillStyle(0x2c2c3a, 1);
    });
    this.container.on('pointerout', () => {
      this.bg.setFillStyle(this.currentlyActive ? 0x4a90e2 : 0x222230, 1);
    });
  }

  setLabel(text: string): void {
    this.label.setText(text);
  }

  setActive(active: boolean): void {
    if (this.currentlyActive === active) return;
    this.currentlyActive = active;
    this.bg.setFillStyle(active ? 0x4a90e2 : 0x222230, 1);
    this.label.setColor(active ? '#0b0b10' : COLORS.text);
  }
}

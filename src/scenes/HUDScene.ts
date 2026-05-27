import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, COLORS, TICK_MS } from '../config';
import { dayOfWeekFor, dayToDate, phaseAtTick, WEEKEND } from '../domain/phase';
import { localizeEvent } from '../i18n/cards';
import { t } from '../i18n/locale';
import { countActiveAngry, GAME_OVER_ACTIVE_ANGRY, repairElevator } from '../domain/simulation';
import { REPAIR_COST } from '../domain/types';
import { MAX_SKILLS, skillById } from '../meta/skills';
import { hasSprite } from '../render/sprites';
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

    // 좌측 시계 아이콘 (sprite 있을 때만 visible). 텍스트 자리 약간 우측으로.
    if (hasSprite(this, 'ui-icon-clock')) {
      this.add.image(20, 23, 'ui-icon-clock').setDisplaySize(16, 16).setOrigin(0.5);
    }
    const timeX = hasSprite(this, 'ui-icon-clock') ? 34 : 16;
    this.timeText = this.add.text(timeX, 12, '0:00', {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
      fontSize: '22px',
      color: COLORS.text,
    });

    if (hasSprite(this, 'ui-icon-gold')) {
      this.add.image(124, 25, 'ui-icon-gold').setDisplaySize(16, 16).setOrigin(0.5);
    }
    const goldX = hasSprite(this, 'ui-icon-gold') ? 138 : 120;
    this.goldText = this.add.text(goldX, 16, '0G', {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
      fontSize: '18px',
      color: '#f5c542',
    });

    this.dangerText = this.add.text(GAME_WIDTH - 16, 12, '', {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
      fontSize: '14px',
      color: COLORS.textDim,
    }).setOrigin(1, 0);
    if (hasSprite(this, 'ui-icon-anger')) {
      // dangerText 는 우측 정렬 — 텍스트 좌측에 아이콘 두려면 update 시 텍스트 width 알아야 함.
      // 단순화: 우측 모서리에서 적당히 안쪽에 고정 배치 (텍스트는 자동으로 왼쪽으로 밀려서 그려짐).
      this.add.image(GAME_WIDTH - 120, 22, 'ui-icon-anger').setDisplaySize(16, 16).setOrigin(0.5);
    }

    this.modifierText = this.add.text(GAME_WIDTH - 16, 32, '', {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', fontSize: '11px', color: '#e74c3c',
    }).setOrigin(1, 0);

    this.relicText = this.add.text(GAME_WIDTH - 16, 50, '', {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', fontSize: '11px', color: '#e2a04a',
    }).setOrigin(1, 0);

    this.eventText = this.add.text(GAME_WIDTH - 16, 68, '', {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', fontSize: '12px', color: '#ff6a6a',
    }).setOrigin(1, 0);

    this.phaseText = this.add.text(GAME_WIDTH / 2, 16, '', {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
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
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', fontSize: '10px', color: '#5a5a68',
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

    this.pauseBtn = new ControlButton(this, x, y, 80, 28, t('hud.pause'), () => game.togglePause());
    x += 80 + gap + 8;

    for (const s of SPEEDS) {
      const btn = new ControlButton(this, x, y, 40, 28, `${s}x`, () => game.setSpeed(s));
      this.speedBtns.push(btn);
      x += 40 + gap;
    }

    x += 8;
    this.restartBtn = new ControlButton(this, x, y, 80, 28, t('hud.restart'), () => game.restart());
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
    const dowLabel = t(`dow.${dow}` as 'dow.mon');
    const phaseLabel = t(`phase.${info.phase}` as 'phase.morning');
    const weekendColor = WEEKEND.has(dow) ? '#ffd700' : COLORS.text;
    const yearPrefix = cal.year > 1 ? t('hud.day_year_prefix', { year: cal.year }) : '';
    this.phaseText.setText(t('hud.day_format', {
      prefix: yearPrefix, month: cal.month, date: cal.date, dow: dowLabel, phase: phaseLabel,
    }));
    this.phaseText.setColor(weekendColor);
    const ratio = info.tickInPhase / info.phaseTicks;
    const barW = this.phaseBarBg.width;
    this.phaseBarFill.width = Math.max(2, Math.floor(barW * ratio));

    this.pauseBtn.setLabel(game.paused ? t('hud.resume') : t('hud.pause'));
    this.pauseBtn.setActive(game.paused);
    for (let i = 0; i < SPEEDS.length; i++) {
      this.speedBtns[i]!.setActive(!game.paused && game.timeScale === SPEEDS[i]);
    }
    this.restartBtn.setActive(false);

    const angry = countActiveAngry(game.state);
    this.dangerText.setText(`${t('hud.angry')}  ${angry} / ${GAME_OVER_ACTIVE_ANGRY}`);
    this.dangerText.setColor(angry >= GAME_OVER_ACTIVE_ANGRY - 1 ? '#e74c3c' : COLORS.textDim);

    const mods = game.state.activeModifiers;
    this.modifierText.setText(mods.length > 0 ? t('hud.modifier_count', { n: mods.length }) : '');
    this.relicText.setText(game.state.ownedRelics.length > 0 ? t('hud.relic_count', { n: game.state.ownedRelics.length }) : '');
    if (game.activeEventToday) {
      const locName = localizeEvent(game.activeEventToday).name;
      const isBoss = locName.includes('🔥');
      this.eventText.setText(isBoss ? locName : `⚠ ${locName}`);
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
    const title = this.add.text(GAME_WIDTH - 16, titleY, t('hud.emergency_repair'), {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', fontSize: '11px', color: '#e74c3c',
    }).setOrigin(1, 0);
    this.repairContainer.add(title);

    let y = titleY + 18;
    for (const e of broken) {
      const affordable = game.state.gold >= REPAIR_COST;
      const bg = this.add.rectangle(GAME_WIDTH - 16, y, 150, 24, affordable ? 0xe74c3c : 0x4a2222, affordable ? 1 : 0.6)
        .setOrigin(1, 0).setStrokeStyle(1, 0x6a2c2c)
        .setInteractive({ useHandCursor: affordable });
      const txt = this.add.text(GAME_WIDTH - 16 - 75, y + 12, t('hud.repair_button', { id: e.id + 1, cost: REPAIR_COST }), {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', fontSize: '11px',
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
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', fontSize: '12px', color: '#7ed957',
    });
    this.nameLabel = scene.add.text(0, -4, '', {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', fontSize: '13px', color: COLORS.text,
      wordWrap: { width: w - 16 }, align: 'center',
    }).setOrigin(0.5);
    this.cdFill = scene.add.rectangle(-w / 2, h / 2 - 4, 0, 4, 0x7ed957, 1).setOrigin(0, 0.5);
    this.cdText = scene.add.text(0, h / 2 - 14, '', {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', fontSize: '10px', color: COLORS.textDim,
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
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
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

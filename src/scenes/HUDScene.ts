import Phaser from 'phaser';
import {  GAME_HEIGHT, GAME_WIDTH, COLORS, TICK_MS , FONT } from '../config';
import { dayLengthTicks, dayOfWeekFor, dayToDate, PHASES, PHASE_TICKS, phaseAtTick, WEEKEND, Phase } from '../domain/phase';
import { localizeEvent } from '../i18n/cards';
import { t } from '../i18n/locale';
import { countActiveAngry, GAME_OVER_ACTIVE_ANGRY, repairElevator } from '../domain/simulation';
import { REPAIR_COST } from '../domain/types';
import { MAX_SKILLS, skillById } from '../meta/skills';
import { MAX_TRINKETS, trinketById } from '../meta/trinkets';
import { TRANSFORMATIONS } from '../meta/transformations';
import { curseById } from '../meta/curses';
import { hasSprite } from '../render/sprites';
import { GameScene } from './GameScene';

export class HUDScene extends Phaser.Scene {
  private timeText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  /** 옛 danger 텍스트 자리에 평판 게이지로 교체. dangerText/reputationLabel 은 보유만 (ref 유지). */
  // @ts-expect-error 보관 — 호환성 (외부 코드 호출 가능성)
  private dangerText!: Phaser.GameObjects.Text;
  // @ts-expect-error 보관 — 정적 라벨이라 setText 호출 없음
  private reputationLabel!: Phaser.GameObjects.Text;
  private reputationBarBg!: Phaser.GameObjects.Rectangle;
  private reputationBarFill!: Phaser.GameObjects.Rectangle;
  private reputationValue!: Phaser.GameObjects.Text;
  private isaacBadges!: Phaser.GameObjects.Text;
  private trinketSlotsContainer!: Phaser.GameObjects.Container;
  private modifierText!: Phaser.GameObjects.Text;
  private relicText!: Phaser.GameObjects.Text;
  private eventText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  /** 24시간 시계 (페이즈 wedge + 시침). phaseBar 대체. */
  private clockG!: Phaser.GameObjects.Graphics;
  private clockTimeLabel!: Phaser.GameObjects.Text;
  private pauseBtn!: ControlButton;
  private speedBtn!: ControlButton;
  private manageBtn!: ControlButton;
  private skillSlots: SkillSlotView[] = [];
  private repairContainer!: Phaser.GameObjects.Container;
  private tutorialBanner: Phaser.GameObjects.Container | null = null;
  private tutorialBannerText: Phaser.GameObjects.Text | null = null;

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
      fontFamily: FONT,
      fontSize: '22px',
      color: COLORS.text,
    });

    if (hasSprite(this, 'ui-icon-gold')) {
      this.add.image(124, 25, 'ui-icon-gold').setDisplaySize(16, 16).setOrigin(0.5);
    }
    const goldX = hasSprite(this, 'ui-icon-gold') ? 138 : 120;
    this.goldText = this.add.text(goldX, 16, '0G', {
      fontFamily: FONT,
      fontSize: '18px',
      color: '#f5c542',
    });

    // ── 평판 게이지 (우상단, 옛 dangerText 자리) ──
    // 0~100, 게임오버 = 0. 20 이하 = 캐스케이드. 색 단계: 빨/주/노/녹.
    this.reputationLabel = this.add.text(GAME_WIDTH - 16, 10, t('hud.reputation') ?? '평판', {
      fontFamily: FONT, fontSize: '12px', color: COLORS.textDim,
    }).setOrigin(1, 0);
    const repBarW = 180, repBarH = 10;
    this.reputationBarBg = this.add.rectangle(GAME_WIDTH - 16, 26, repBarW, repBarH, 0x14141c)
      .setOrigin(1, 0).setStrokeStyle(1, 0x3a3a48);
    this.reputationBarFill = this.add.rectangle(GAME_WIDTH - 16 - repBarW + 1, 27, repBarW - 2, repBarH - 2, 0x7ed957)
      .setOrigin(0, 0);
    this.reputationValue = this.add.text(GAME_WIDTH - 16, 40, '', {
      fontFamily: FONT, fontSize: '11px', color: COLORS.text,
    }).setOrigin(1, 0);

    // ── 소품 3슬롯 (평판 게이지 아래) ──
    this.trinketSlotsContainer = this.add.container(0, 0);

    // ── 아이작 시스템 배지 (변신/악재/부활/거래) — 소품 슬롯 아래 ──
    this.isaacBadges = this.add.text(GAME_WIDTH - 16, 110, '', {
      fontFamily: FONT, fontSize: '11px', color: COLORS.text, align: 'right',
    }).setOrigin(1, 0);

    // dangerText 는 이제 미사용 — 호환성 위해 객체는 만들되 빈 텍스트 (다른 코드가 setText 호출).
    this.dangerText = this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '1px' }).setVisible(false);

    this.modifierText = this.add.text(GAME_WIDTH - 16, 32, '', {
      fontFamily: FONT, fontSize: '11px', color: '#e74c3c',
    }).setOrigin(1, 0);

    this.relicText = this.add.text(GAME_WIDTH - 16, 50, '', {
      fontFamily: FONT, fontSize: '11px', color: '#e2a04a',
    }).setOrigin(1, 0);

    this.eventText = this.add.text(GAME_WIDTH - 16, 68, '', {
      fontFamily: FONT, fontSize: '12px', color: '#ff6a6a',
    }).setOrigin(1, 0);

    this.phaseText = this.add.text(GAME_WIDTH / 2, 16, '', {
      fontFamily: FONT,
      fontSize: '18px',
      color: COLORS.text,
    }).setOrigin(0.5, 0);

    // 24시간 시계 — 중앙 상단, phaseText 우측
    this.clockG = this.add.graphics();
    this.clockTimeLabel = this.add.text(GAME_WIDTH / 2 + 200, 30, '06:00', {
      fontFamily: FONT,
      fontSize: '14px', color: COLORS.text, fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    this.buildControlBar(game);
    this.buildSkillBar(game);
    this.repairContainer = this.add.container(0, 0);
    this.buildTutorialBanner();
    if (import.meta.env.DEV) this.buildDevLinks();
  }

  private buildTutorialBanner(): void {
    const bg = this.add.rectangle(0, 0, 480, 44, 0xf5c542, 0.95).setStrokeStyle(2, 0xffffff);
    const txt = this.add.text(0, 0, '', {
      fontFamily: FONT,
      fontSize: '16px', color: '#0b0b10', fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5);
    this.tutorialBanner = this.add.container(GAME_WIDTH / 2, 100, [bg, txt]).setDepth(10).setVisible(false);
    this.tutorialBannerText = txt;
    this.tweens.add({
      targets: this.tutorialBanner, scale: 1.04, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.easeInOut',
    });
  }

  private updateTutorialBanner(game: GameScene): void {
    if (!this.tutorialBanner || !this.tutorialBannerText) return;
    const await_ = game.tutorialAwaiting;
    if (!await_) {
      if (this.tutorialBanner.visible) this.tutorialBanner.setVisible(false);
      return;
    }
    const msg = await_ === 'pause'
      ? '⬇ Space 또는 [일시정지] 버튼을 눌러봐!'
      : '⬇ [엘베 관리] 버튼을 눌러봐!';
    if (this.tutorialBannerText.text !== msg) this.tutorialBannerText.setText(msg);
    this.tutorialBanner.setVisible(true);
  }

  private buildDevLinks(): void {
    const y = GAME_HEIGHT - 28;
    const open = (path: string) => () => window.open(path, '_blank');
    new ControlButton(this, 16, y - 14, 70, 24, 'DOCS', open('/docs.html'));
    new ControlButton(this, 92, y - 14, 80, 24, 'DESIGN', open('/design.html'));
    new ControlButton(this, 178, y - 14, 90, 24, '🖼 SPRITES', open('/sprites.html'));
    new ControlButton(this, 274, y - 14, 90, 24, '🔊 SOUNDS', open('/sounds.html'));
    new ControlButton(this, 370, y - 14, 70, 24, '📝 CMS', open('/cms.html'));
    this.add.text(446, y - 12, '[DEV]', {
      fontFamily: FONT, fontSize: '10px', color: '#5a5a68',
    });
  }

  /**
   * 24시간 시계 그리기. 게임 하루(3000 tick) 를 24시간에 매핑.
   * 게임 시작 = 6:00, 한 바퀴 돌면 다음날 6:00.
   * 5개 페이즈를 색상 wedge 로 표시 + 시침이 회전.
   */
  private drawClock(tick: number): void {
    const cx = GAME_WIDTH / 2 + 165;
    const cy = 30;
    const radius = 22;
    const g = this.clockG;
    g.clear();

    const dayTotal = dayLengthTicks();
    const tickInDay = ((tick % dayTotal) + dayTotal) % dayTotal;

    // 페이즈 색상 — 출근/근무/점심/퇴근/야간
    const PHASE_COLOR: Record<Phase, number> = {
      morning: 0x4a90e2,
      work: 0x7ed957,
      lunch: 0xf5c542,
      evening: 0xe2a04a,
      night: 0x6c5ce7,
    };

    // 페이즈별 wedge — 시작 각도 -90° (위) 부터 시계방향.
    let cumTick = 0;
    for (const p of PHASES) {
      const phaseTicks = PHASE_TICKS[p];
      const startAngle = -Math.PI / 2 + (cumTick / dayTotal) * Math.PI * 2;
      const endAngle = -Math.PI / 2 + ((cumTick + phaseTicks) / dayTotal) * Math.PI * 2;
      g.fillStyle(PHASE_COLOR[p], 0.5);
      g.beginPath();
      g.moveTo(cx, cy);
      g.arc(cx, cy, radius, startAngle, endAngle, false);
      g.closePath();
      g.fillPath();
      cumTick += phaseTicks;
    }

    // 외곽선
    g.lineStyle(1.5, 0x3a3a48, 1);
    g.strokeCircle(cx, cy, radius);

    // 시간 눈금 (6, 12, 18, 24 시 위치에 짧은 선)
    for (let h = 0; h < 24; h += 6) {
      const angle = -Math.PI / 2 + (h / 24) * Math.PI * 2;
      const x1 = cx + Math.cos(angle) * (radius - 4);
      const y1 = cy + Math.sin(angle) * (radius - 4);
      const x2 = cx + Math.cos(angle) * radius;
      const y2 = cy + Math.sin(angle) * radius;
      g.lineStyle(1, 0xffffff, 0.6);
      g.lineBetween(x1, y1, x2, y2);
    }

    // 시침 — 게임 하루 진행률 비율로 0~360°
    const handAngle = -Math.PI / 2 + (tickInDay / dayTotal) * Math.PI * 2;
    const handX = cx + Math.cos(handAngle) * (radius - 4);
    const handY = cy + Math.sin(handAngle) * (radius - 4);
    g.lineStyle(2.5, 0xffffff, 1);
    g.lineBetween(cx, cy, handX, handY);
    // 중심점
    g.fillStyle(0xffffff, 1);
    g.fillCircle(cx, cy, 2);

    // 우측 시각 텍스트 — 06:00 시작
    const hourFloat = 6 + (tickInDay / dayTotal) * 24;
    const hour = Math.floor(hourFloat) % 24;
    const minute = Math.floor((hourFloat - Math.floor(hourFloat)) * 60);
    const hh = hour.toString().padStart(2, '0');
    const mm = minute.toString().padStart(2, '0');
    this.clockTimeLabel.setText(`${hh}:${mm}`);
  }

  /** 소품 3슬롯 — 평판 게이지 아래 우상단. 카테고리별 색상 + 호버 시 툴팁. */
  private drawTrinketSlots(game: GameScene): void {
    this.trinketSlotsContainer.removeAll(true);
    const slotW = 22, slotH = 22, gap = 4;
    const totalW = slotW * MAX_TRINKETS + gap * (MAX_TRINKETS - 1);
    const startX = GAME_WIDTH - 16 - totalW;
    const y = 80;
    for (let i = 0; i < MAX_TRINKETS; i++) {
      const id = game.state.ownedTrinkets[i];
      const x = startX + i * (slotW + gap);
      let color = 0x14141c, borderC = 0x3a3a48;
      let icon = '·';
      if (id) {
        const t = trinketById(id);
        const cat = t?.category ?? 'common';
        if (cat === 'common') { color = 0x2a3a35; borderC = 0x7ed957; icon = 'C'; }
        else if (cat === 'conditional') { color = 0x3a3528; borderC = 0xf5c542; icon = '?'; }
        else { color = 0x3a282a; borderC = 0xe74c3c; icon = '!'; }
      }
      const bg = this.add.rectangle(x + slotW / 2, y + slotH / 2, slotW, slotH, color, 1).setStrokeStyle(1, borderC);
      const label = this.add.text(x + slotW / 2, y + slotH / 2, icon, {
        fontFamily: FONT, fontSize: '11px', color: id ? '#ffffff' : '#3a3a48', fontStyle: 'bold',
      }).setOrigin(0.5);
      if (id) {
        bg.setInteractive({ useHandCursor: true });
        const t = trinketById(id);
        bg.on('pointerover', () => {
          if (!t) return;
          const tip = this.add.text(x + slotW / 2, y + slotH + 6, `${t.name}\n${t.desc}`, {
            fontFamily: FONT, fontSize: '11px', color: COLORS.text,
            backgroundColor: '#0e0e14', padding: { x: 6, y: 4 },
            wordWrap: { width: 200 }, align: 'right',
          }).setOrigin(1, 0).setDepth(2000);
          tip.setPosition(GAME_WIDTH - 16, y + slotH + 6);
          (bg as any)._tip = tip;
          this.trinketSlotsContainer.add(tip);
        });
        bg.on('pointerout', () => {
          const tip = (bg as any)._tip as Phaser.GameObjects.Text | undefined;
          if (tip) { tip.destroy(); (bg as any)._tip = null; }
        });
      }
      this.trinketSlotsContainer.add([bg, label]);
    }
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
    x += 80 + gap;

    // 단일 배속 사이클 버튼 (1x → 2x → 4x → 8x → 1x)
    this.speedBtn = new ControlButton(this, x, y, 56, 28, `${game.timeScale}x`, () => game.cycleSpeed());
    x += 56 + gap;

    // 엘베 관리 (정책 편집기 토글, 자동 일시정지)
    this.manageBtn = new ControlButton(this, x, y, 110, 28, t('hud.manage') ?? '엘베 관리', () => game.toggleManage());
    x += 110 + gap;

    // 설정 (톱니바퀴) — Options 모달 launch
    new ControlButton(this, x, y, 36, 28, '⚙', () => {
      if (!this.scene.isActive('Options')) this.scene.launch('Options');
    });
  }

  update(): void {
    const game = this.scene.get('Game') as GameScene;
    if (!game?.state) return;

    const totalSec = Math.floor((game.state.tick * TICK_MS) / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    this.timeText.setText(`${m}:${s.toString().padStart(2, '0')}`);

    // 저주 UI 마스킹 — 어둠/혼란/시각장애 시 일부 정보 가림
    const curse = game.state.activeCurse ? curseById(game.state.activeCurse.id) : null;
    const mask = curse?.uiMaskId ?? null;
    this.goldText.setText(mask === 'hide-gold' ? '???G' : `${game.state.gold}G`);
    this.goldText.setColor(mask === 'hide-gold' ? '#7a4a4a' : '#f5c542');

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

    this.pauseBtn.setLabel(game.paused ? t('hud.resume') : t('hud.pause'));
    this.pauseBtn.setActive(game.paused);
    this.speedBtn.setLabel(`${game.timeScale}x`);
    this.speedBtn.setActive(false);
    this.manageBtn.setActive(this.scene.isActive('RuleEditor'));

    this.drawClock(game.state.tick);

    // 평판 게이지 — 비율 + 색 단계 (저주 hide-rep 시 가림)
    const rep = Math.max(0, Math.min(100, game.state.reputation ?? 50));
    const ratio = rep / 100;
    const fullW = this.reputationBarBg.width - 2;
    if (mask === 'hide-rep') {
      this.reputationBarFill.width = fullW;
      this.reputationBarFill.setFillStyle(0x4a4a55, 1);
      this.reputationValue.setText('???');
      this.reputationValue.setColor('#7a4a4a');
    } else {
      this.reputationBarFill.width = Math.max(1, fullW * ratio);
      let color = 0x7ed957;
      if (rep < 20) color = 0xe74c3c;
      else if (rep < 40) color = 0xe2a04a;
      else if (rep < 70) color = 0xf5c542;
      this.reputationBarFill.setFillStyle(color, 1);
      this.reputationValue.setText(`${Math.round(rep)} / 100`);
      this.reputationValue.setColor(rep < 20 ? '#e74c3c' : rep < 40 ? '#e2a04a' : COLORS.text);
    }

    // ── 소품 3슬롯 (아이콘) ──
    this.drawTrinketSlots(game);

    // ── 아이작 배지 — 변신/악재/부활/거래 한 줄 요약 ──
    const badges: string[] = [];
    const transforms = game.state.activeTransformations ?? [];
    if (transforms.length > 0) {
      const tfName = transforms.map((id) => TRANSFORMATIONS[id]?.name ?? id).join('+');
      badges.push(`✨ ${tfName}`);
    }
    if (game.state.activeCurse) {
      const cname = curseById(game.state.activeCurse.id)?.name ?? game.state.activeCurse.id;
      badges.push(`⚠ ${cname}`);
    }
    if (game.state.revivesRemaining > 0) badges.push(`💀 부활 ${game.state.revivesRemaining}`);
    if (game.state.devilDealCount > 0) badges.push(`😈 ${game.state.devilDealCount}`);
    if (game.state.angelDealCount > 0) badges.push(`👼 ${game.state.angelDealCount}`);
    this.isaacBadges.setText(badges.join('  '));

    // dangerText 는 이제 사용 안 함 — 호환성 위해 빈 호출 유지.
    const _angry = countActiveAngry(game.state);
    void _angry;
    void GAME_OVER_ACTIVE_ANGRY;

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
    this.updateTutorialBanner(game);

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
      fontFamily: FONT, fontSize: '11px', color: '#e74c3c',
    }).setOrigin(1, 0);
    this.repairContainer.add(title);

    let y = titleY + 18;
    for (const e of broken) {
      const affordable = game.state.gold >= REPAIR_COST;
      const bg = this.add.rectangle(GAME_WIDTH - 16, y, 150, 24, affordable ? 0xe74c3c : 0x4a2222, affordable ? 1 : 0.6)
        .setOrigin(1, 0).setStrokeStyle(1, 0x6a2c2c)
        .setInteractive({ useHandCursor: affordable });
      const txt = this.add.text(GAME_WIDTH - 16 - 75, y + 12, t('hud.repair_button', { id: e.id + 1, cost: REPAIR_COST }), {
        fontFamily: FONT, fontSize: '11px',
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
      fontFamily: FONT, fontSize: '12px', color: '#7ed957',
    });
    this.nameLabel = scene.add.text(0, -4, '', {
      fontFamily: FONT, fontSize: '13px', color: COLORS.text,
      wordWrap: { width: w - 16 }, align: 'center',
    }).setOrigin(0.5);
    this.cdFill = scene.add.rectangle(-w / 2, h / 2 - 4, 0, 4, 0x7ed957, 1).setOrigin(0, 0.5);
    this.cdText = scene.add.text(0, h / 2 - 14, '', {
      fontFamily: FONT, fontSize: '10px', color: COLORS.textDim,
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
      fontFamily: FONT,
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

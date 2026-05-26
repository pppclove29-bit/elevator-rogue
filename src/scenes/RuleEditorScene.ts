import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { ElevatorId, ElevatorPolicy, FloorRole, PolicyParity, PolicyPickup } from '../domain/types';
import { ROLE_COLOR, ROLE_SHORT } from '../domain/spawner';
import { t } from '../i18n/locale';
import { Button } from '../ui/Button';
import { GameScene } from './GameScene';

const PANEL_BG = 0x14141c;
const ROW_BG = 0x1c1c26;
const ROW_BG_ACTIVE = 0x1f2a3d;
const BORDER = 0x3a3a48;
const BORDER_SEL = 0x4a90e2;

export class RuleEditorScene extends Phaser.Scene {
  private gs!: GameScene;
  private content!: Phaser.GameObjects.Container;
  private currentElevator: ElevatorId = 0;

  constructor() { super('RuleEditor'); }

  create(): void {
    this.gs = this.scene.get('Game') as GameScene;
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.78);
    this.add.text(GAME_WIDTH / 2, 16, t('policy.title'), {
      fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '22px', color: COLORS.text,
    }).setOrigin(0.5, 0);

    new Button(this, GAME_WIDTH - 100, 30, 140, 32, t('policy.resume'), () => this.gs.togglePause(), { fontSize: 13 });

    this.content = this.add.container(0, 0);
    this.input.keyboard?.on('keydown-ESC', () => this.gs.togglePause());
    this.input.keyboard?.on('keydown-SPACE', () => this.gs.togglePause());

    if (this.gs.state.building.elevators.length > 0) {
      this.currentElevator = this.gs.state.building.elevators[0]!.id;
    }
    this.rebuild();
  }

  private rebuild(): void {
    this.content.removeAll(true);
    this.drawTabs();
    this.drawForm();
  }

  private drawTabs(): void {
    const y = 60;
    const startX = 24;
    const w = 64; const h = 32; const gap = 6;

    for (let i = 0; i < this.gs.state.building.elevators.length; i++) {
      const e = this.gs.state.building.elevators[i]!;
      const active = e.id === this.currentElevator;
      const bg = this.add.rectangle(startX + i * (w + gap), y, w, h, active ? BORDER_SEL : ROW_BG, 1)
        .setOrigin(0, 0).setStrokeStyle(1, active ? BORDER_SEL : BORDER)
        .setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => { this.currentElevator = e.id; this.rebuild(); });
      const t = this.add.text(startX + i * (w + gap) + w / 2, y + h / 2, `E${e.id + 1}`, {
        fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '14px',
        color: active ? '#0b0b10' : COLORS.text,
      }).setOrigin(0.5);
      this.content.add([bg, t]);
    }

    const hint = this.add.text(GAME_WIDTH / 2, 68, t('policy.hint'), {
      fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '12px', color: COLORS.textDim,
    }).setOrigin(0.5, 0);
    this.content.add(hint);
  }

  private drawForm(): void {
    const policy = this.gs.getPolicy(this.currentElevator);
    const floorCount = this.gs.state.building.floors.length;
    const px = 80, py = 130, pw = GAME_WIDTH - 160;

    const bg = this.add.rectangle(px, py, pw, 480, PANEL_BG, 1).setOrigin(0, 0).setStrokeStyle(1, BORDER);
    this.content.add(bg);

    let rowY = py + 24;
    const rowGap = 80;

    // 1. 운영 층 범위
    rowY = this.drawRangeRow(px + 24, rowY, pw - 48, t('policy.floor_range'), policy, floorCount);
    rowY += rowGap;

    // 2. 층 패리티
    rowY = this.drawParityRow(px + 24, rowY, pw - 48, t('policy.parity'), policy);
    rowY += rowGap;

    // 3. 픽업 모드
    rowY = this.drawPickupRow(px + 24, rowY, pw - 48, t('policy.pickup_mode'), policy);
    rowY += rowGap;

    // 4. 정원 풀 시 하차 우선
    this.drawToggleRow(px + 24, rowY, pw - 48, t('policy.unload_when_full'), policy.prioritizeUnloadWhenFull, (v) => {
      this.gs.updatePolicy(this.currentElevator, { prioritizeUnloadWhenFull: v });
      this.rebuild();
    });
  }

  private drawRangeRow(x: number, y: number, w: number, label: string, policy: ElevatorPolicy, floorCount: number): number {
    this.content.add(this.add.rectangle(x, y, w, 60, ROW_BG, 1).setOrigin(0, 0).setStrokeStyle(1, BORDER));
    this.content.add(this.add.text(x + 14, y + 8, label, { fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '13px', color: COLORS.text }));

    const minF = policy.minFloor;
    const maxF = policy.maxFloor < 0 ? floorCount - 1 : policy.maxFloor;

    let bx = x + 140;
    this.content.add(this.add.text(bx, y + 34, t('policy.min_floor'), { fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '11px', color: COLORS.textDim }));
    bx += 48;
    const minDec = new Button(this, bx + 12, y + 34, 24, 22, '−', () => {
      this.gs.updatePolicy(this.currentElevator, { minFloor: Math.max(0, minF - 1) }); this.rebuild();
    }, { fontSize: 14 });
    const minValTxt = this.add.text(bx + 36, y + 34, `${minF + 1}F`, { fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '14px', color: COLORS.text }).setOrigin(0, 0.5);
    const minInc = new Button(this, bx + 72, y + 34, 24, 22, '+', () => {
      this.gs.updatePolicy(this.currentElevator, { minFloor: Math.min(maxF, minF + 1) }); this.rebuild();
    }, { fontSize: 14 });

    bx += 120;
    this.content.add(this.add.text(bx, y + 34, t('policy.max_floor'), { fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '11px', color: COLORS.textDim }));
    bx += 48;
    const maxDec = new Button(this, bx + 12, y + 34, 24, 22, '−', () => {
      this.gs.updatePolicy(this.currentElevator, { maxFloor: Math.max(minF, maxF - 1) }); this.rebuild();
    }, { fontSize: 14 });
    const maxValTxt = this.add.text(bx + 36, y + 34, `${maxF + 1}F`, { fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '14px', color: COLORS.text }).setOrigin(0, 0.5);
    const maxInc = new Button(this, bx + 72, y + 34, 24, 22, '+', () => {
      this.gs.updatePolicy(this.currentElevator, { maxFloor: Math.min(floorCount - 1, maxF + 1) }); this.rebuild();
    }, { fontSize: 14 });

    bx += 120;
    const noLimit = new Button(this, bx + 60, y + 34, 100, 24, t('policy.unlimited'), () => {
      this.gs.updatePolicy(this.currentElevator, { minFloor: 0, maxFloor: -1 }); this.rebuild();
    }, { fontSize: 11 });

    this.content.add([minDec.container, minValTxt, minInc.container, maxDec.container, maxValTxt, maxInc.container, noLimit.container]);
    return y + 60;
  }

  private drawParityRow(x: number, y: number, w: number, label: string, policy: ElevatorPolicy): number {
    this.content.add(this.add.rectangle(x, y, w, 60, ROW_BG, 1).setOrigin(0, 0).setStrokeStyle(1, BORDER));
    this.content.add(this.add.text(x + 14, y + 8, label, { fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '13px', color: COLORS.text }));
    const opts: Array<[PolicyParity, string]> = [['all', t('policy.parity.all')], ['even', t('policy.parity.even')], ['odd', t('policy.parity.odd')]];
    let bx = x + 140;
    for (const [val, name] of opts) {
      const active = policy.parity === val;
      const btn = new Button(this, bx + 60, y + 34, 130, 26, name, () => {
        this.gs.updatePolicy(this.currentElevator, { parity: val }); this.rebuild();
      }, { fontSize: 12, bg: active ? 0x4a90e2 : 0x222230, bgHover: active ? 0x4a90e2 : 0x2c2c3a,
           textColor: active ? '#0b0b10' : COLORS.text, textColorActive: '#0b0b10' });
      this.content.add(btn.container);
      bx += 140;
    }
    return y + 60;
  }

  private drawPickupRow(x: number, y: number, w: number, label: string, policy: ElevatorPolicy): number {
    this.content.add(this.add.rectangle(x, y, w, 100, ROW_BG, 1).setOrigin(0, 0).setStrokeStyle(1, BORDER));
    this.content.add(this.add.text(x + 14, y + 8, label, { fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '13px', color: COLORS.text }));

    const opts: Array<[PolicyPickup, string]> = [
      ['any', t('policy.pickup.any')],
      ['lobby-only', t('policy.pickup.lobby_only')],
      ['role', t('policy.pickup.role')],
    ];
    let bx = x + 140;
    for (const [val, name] of opts) {
      const active = policy.pickupMode === val;
      const btn = new Button(this, bx + 70, y + 34, 150, 26, name, () => {
        this.gs.updatePolicy(this.currentElevator, { pickupMode: val }); this.rebuild();
      }, { fontSize: 12, bg: active ? 0x4a90e2 : 0x222230, bgHover: active ? 0x4a90e2 : 0x2c2c3a,
           textColor: active ? '#0b0b10' : COLORS.text, textColorActive: '#0b0b10' });
      this.content.add(btn.container);
      bx += 160;
    }

    // 역할 선택 (pickupMode='role' 일 때만 활성)
    if (policy.pickupMode === 'role') {
      const roles: FloorRole[] = ['lobby', 'office', 'restaurant', 'rooftop', 'basement'];
      let rx = x + 140;
      for (const r of roles) {
        const roleActive = policy.pickupRole === r;
        const color = ROLE_COLOR[r];
        const btn = new Button(this, rx + 30, y + 70, 56, 22, ROLE_SHORT[r], () => {
          this.gs.updatePolicy(this.currentElevator, { pickupRole: r }); this.rebuild();
        }, { fontSize: 11, bg: roleActive ? color : 0x222230, bgHover: roleActive ? color : 0x2c2c3a,
             textColor: roleActive ? '#0b0b10' : COLORS.text, textColorActive: '#0b0b10' });
        this.content.add(btn.container);
        rx += 66;
      }
    }
    return y + 100;
  }

  private drawToggleRow(x: number, y: number, w: number, label: string, value: boolean, onChange: (v: boolean) => void): void {
    this.content.add(this.add.rectangle(x, y, w, 60, value ? ROW_BG_ACTIVE : ROW_BG, 1).setOrigin(0, 0).setStrokeStyle(1, value ? BORDER_SEL : BORDER));
    this.content.add(this.add.text(x + 14, y + 22, label, { fontFamily: '"DotGothic16", "Press Start 2P", monospace', fontSize: '14px', color: COLORS.text }));
    const btn = new Button(this, x + w - 100, y + 30, 80, 26, value ? 'ON' : 'OFF', () => onChange(!value),
      { fontSize: 12, bg: value ? 0x4a90e2 : 0x222230, bgHover: value ? 0x4a90e2 : 0x2c2c3a,
        textColor: value ? '#0b0b10' : COLORS.text, textColorActive: '#0b0b10' });
    this.content.add(btn.container);
  }
}

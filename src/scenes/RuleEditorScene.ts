import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { ElevatorId } from '../domain/types';
import { ROLE_COLOR } from '../domain/spawner';
import { ARCHETYPES, PassengerArchetype } from '../domain/archetypes';
import { t } from '../i18n/locale';
import { Button } from '../ui/Button';
import { GameScene } from './GameScene';

const PANEL_BG = 0x14141c;
const ROW_BG = 0x1c1c26;
const BORDER = 0x3a3a48;
const BORDER_SEL = 0x4a90e2;

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

export class RuleEditorScene extends Phaser.Scene {
  private gs!: GameScene;
  private content!: Phaser.GameObjects.Container;
  private currentElevator: ElevatorId = 0;

  constructor() { super('RuleEditor'); }

  create(): void {
    this.gs = this.scene.get('Game') as GameScene;
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.78)
      .setInteractive();
    this.add.text(GAME_WIDTH / 2, 16, t('policy.title'), {
      fontFamily: FONT, fontSize: '22px', color: COLORS.text,
    }).setOrigin(0.5, 0);

    new Button(this, GAME_WIDTH - 40, 30, 44, 32, '✕', () => this.gs.toggleManage(), { fontSize: 16 });
    new Button(this, 90, 30, 160, 32, '💾 저장 후 타이틀', () => this.gs.saveAndExitToTitle(), {
      fontSize: 12, bg: 0x4a6a32, bgHover: 0x6a8a42, textColor: '#0b0b10', textColorActive: '#0b0b10',
    });

    this.content = this.add.container(0, 0);
    this.input.keyboard?.on('keydown-ESC', () => this.gs.toggleManage());

    // 다른 scene 입력 비활성화 (모달 동작)
    const hud = this.scene.get('HUD');
    const game = this.scene.get('Game');
    if (hud) hud.input.enabled = false;
    if (game) game.input.enabled = false;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (hud) hud.input.enabled = true;
      if (game) game.input.enabled = true;
    });

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
    const w = 64, h = 32, gap = 6;

    for (let i = 0; i < this.gs.state.building.elevators.length; i++) {
      const e = this.gs.state.building.elevators[i]!;
      const active = e.id === this.currentElevator;
      const bg = this.add.rectangle(startX + i * (w + gap), y, w, h, active ? BORDER_SEL : ROW_BG, 1)
        .setOrigin(0, 0).setStrokeStyle(1, active ? BORDER_SEL : BORDER)
        .setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => { this.currentElevator = e.id; this.rebuild(); });
      const lbl = this.add.text(startX + i * (w + gap) + w / 2, y + h / 2, `E${e.id + 1}`, {
        fontFamily: FONT, fontSize: '14px',
        color: active ? '#0b0b10' : COLORS.text,
      }).setOrigin(0.5);
      this.content.add([bg, lbl]);
    }

    const hint = this.add.text(GAME_WIDTH / 2, 68, t('policy.hint'), {
      fontFamily: FONT, fontSize: '12px', color: COLORS.textDim,
    }).setOrigin(0.5, 0);
    this.content.add(hint);
  }

  private drawForm(): void {
    const policy = this.gs.getPolicy(this.currentElevator);
    const floorCount = this.gs.state.building.floors.length;
    const px = 80, py = 120, pw = GAME_WIDTH - 160;

    const bg = this.add.rectangle(px, py, pw, 520, PANEL_BG, 1).setOrigin(0, 0).setStrokeStyle(1, BORDER);
    this.content.add(bg);

    let y = py + 16;
    const rowGap = 8;

    // 1. 멈출 층
    y = this.drawFloorMultiSelect(px + 20, y, pw - 40, '🛑 멈출 층',
      '체크한 층에만 정차. 모두 해제 = 전층 정차 (제약 없음).',
      policy.stopFloors, floorCount, (next) => {
        this.gs.updatePolicy(this.currentElevator, { stopFloors: next });
        this.rebuild();
      });
    y += rowGap;

    // 2. 승차 전용 층
    y = this.drawFloorMultiSelect(px + 20, y, pw - 40, '⬆ 승차 전용 층',
      '이 층에서만 손님을 태움 (다른 층에선 드롭만). 모두 해제 = 제한 없음.',
      policy.pickupOnlyFloors, floorCount, (next) => {
        this.gs.updatePolicy(this.currentElevator, { pickupOnlyFloors: next });
        this.rebuild();
      });
    y += rowGap;

    // 3. 하차 전용 층
    y = this.drawFloorMultiSelect(px + 20, y, pw - 40, '⬇ 하차 전용 층',
      '이 층에서는 손님을 안 태움 (내리기만). 모두 해제 = 제한 없음.',
      policy.dropoffOnlyFloors, floorCount, (next) => {
        this.gs.updatePolicy(this.currentElevator, { dropoffOnlyFloors: next });
        this.rebuild();
      });
    y += rowGap;

    // 4. 태울 승객 종류
    this.drawArchetypeMultiSelect(px + 20, y, pw - 40, '👥 태울 승객 종류',
      '체크한 종류만 태움. 모두 해제 = 모든 손님 태움.',
      policy.pickupArchetypes, (next) => {
        this.gs.updatePolicy(this.currentElevator, { pickupArchetypes: next });
        this.rebuild();
      });
  }

  /** 층 다중 선택 row — 토글 가능한 층 칩 배열. */
  private drawFloorMultiSelect(x: number, y: number, w: number, label: string, hint: string,
                                selected: number[], floorCount: number, onChange: (next: number[]) => void): number {
    const rowH = 72;
    this.content.add(this.add.rectangle(x, y, w, rowH, ROW_BG, 1).setOrigin(0, 0).setStrokeStyle(1, BORDER));
    this.content.add(this.add.text(x + 14, y + 8, label, {
      fontFamily: FONT, fontSize: '13px', color: COLORS.text, fontStyle: 'bold',
    }));
    this.content.add(this.add.text(x + 14, y + 26, hint, {
      fontFamily: FONT, fontSize: '11px', color: COLORS.textDim,
    }));

    const chipW = 50, chipH = 22, chipGap = 4;
    let bx = x + 14;
    const by = y + 44;
    for (let i = 0; i < floorCount; i++) {
      const isSel = selected.includes(i);
      const role = this.gs.state.building.floors[i]?.role;
      const roleColor = role ? ROLE_COLOR[role] : 0x4a90e2;
      const btn = new Button(this, bx + chipW / 2, by + chipH / 2, chipW, chipH, `${i + 1}F`, () => {
        const next = isSel ? selected.filter((f) => f !== i) : [...selected, i].sort((a, b) => a - b);
        onChange(next);
      }, {
        fontSize: 11,
        bg: isSel ? roleColor : 0x222230,
        bgHover: isSel ? roleColor : 0x2c2c3a,
        textColor: isSel ? '#0b0b10' : COLORS.text,
        textColorActive: '#0b0b10',
      });
      this.content.add(btn.container);
      bx += chipW + chipGap;
      if (bx + chipW > x + w - 14) { bx = x + 14; }
    }

    // 우측 — 전체/없음 토글
    const allBtn = new Button(this, x + w - 80, by + chipH / 2, 50, chipH, '전체', () => {
      onChange(Array.from({ length: floorCount }, (_, i) => i));
    }, { fontSize: 11 });
    const noneBtn = new Button(this, x + w - 24, by + chipH / 2, 50, chipH, '없음', () => onChange([]), { fontSize: 11 });
    this.content.add([allBtn.container, noneBtn.container]);

    return y + rowH;
  }

  /** 승객 archetype 다중 선택 row — 14종 칩. */
  private drawArchetypeMultiSelect(x: number, y: number, w: number, label: string, hint: string,
                                    selected: string[], onChange: (next: string[]) => void): number {
    const archetypes = Object.keys(ARCHETYPES) as PassengerArchetype[];
    const rows = Math.ceil(archetypes.length / 7);
    const rowH = 60 + rows * 28;
    this.content.add(this.add.rectangle(x, y, w, rowH, ROW_BG, 1).setOrigin(0, 0).setStrokeStyle(1, BORDER));
    this.content.add(this.add.text(x + 14, y + 8, label, {
      fontFamily: FONT, fontSize: '13px', color: COLORS.text, fontStyle: 'bold',
    }));
    this.content.add(this.add.text(x + 14, y + 26, hint, {
      fontFamily: FONT, fontSize: '11px', color: COLORS.textDim,
    }));

    const chipW = 88, chipH = 24, chipGap = 6;
    let bx = x + 14;
    let by = y + 48;
    for (const a of archetypes) {
      const spec = ARCHETYPES[a];
      const isSel = selected.includes(a);
      const c = spec.color;
      const btn = new Button(this, bx + chipW / 2, by + chipH / 2, chipW, chipH, spec.name, () => {
        const next = isSel ? selected.filter((x) => x !== a) : [...selected, a];
        onChange(next);
      }, {
        fontSize: 11,
        bg: isSel ? c : 0x222230,
        bgHover: isSel ? c : 0x2c2c3a,
        textColor: isSel ? '#0b0b10' : COLORS.text,
        textColorActive: '#0b0b10',
      });
      this.content.add(btn.container);
      bx += chipW + chipGap;
      if (bx + chipW > x + w - 100) { bx = x + 14; by += chipH + 4; }
    }

    // 우측 — 전체/없음
    const allBtn = new Button(this, x + w - 80, y + 48 + chipH / 2, 50, chipH, '전체', () => {
      onChange(archetypes as string[]);
    }, { fontSize: 11 });
    const noneBtn = new Button(this, x + w - 24, y + 48 + chipH / 2, 50, chipH, '없음', () => onChange([]), { fontSize: 11 });
    this.content.add([allBtn.container, noneBtn.container]);

    return y + rowH;
  }
}

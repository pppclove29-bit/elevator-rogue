import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { clearAllGameData, DefaultTimeScale, loadOptions, Options, saveOptions } from '../meta/options';
import { Button } from '../ui/Button';

const FONT = '"DotGothic16", "Press Start 2P", monospace';
const PANEL_BG = 0x14141c;
const ROW_BG = 0x1c1c26;
const BORDER = 0x3a3a48;

export class OptionsScene extends Phaser.Scene {
  private opt!: Options;
  private content!: Phaser.GameObjects.Container;
  private confirmingReset = false;

  constructor() { super('Options'); }

  create(): void {
    this.opt = loadOptions();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.85);

    this.add.text(GAME_WIDTH / 2, 28, '옵션', {
      fontFamily: FONT, fontSize: '24px', color: COLORS.text,
    }).setOrigin(0.5, 0);

    new Button(this, GAME_WIDTH - 80, 38, 100, 28, '닫기 (ESC)', () => this.close(),
      { fontSize: 12 });

    this.content = this.add.container(0, 0);
    this.input.keyboard?.on('keydown-ESC', () => this.close());

    this.rebuild();
  }

  private close(): void {
    saveOptions(this.opt);
    this.scene.stop();
  }

  private rebuild(): void {
    this.content.removeAll(true);

    const panelX = 200, panelY = 90, panelW = GAME_WIDTH - 400, panelH = 480;
    const bg = this.add.rectangle(panelX, panelY, panelW, panelH, PANEL_BG, 1).setOrigin(0, 0).setStrokeStyle(1, BORDER);
    this.content.add(bg);

    let y = panelY + 16;
    const rowGap = 12;

    // 1. 사운드 (미구현 표시)
    y = this.drawSection(panelX + 16, y, panelW - 32, '사운드 (구현 예정)', '#9aa0a6');
    y = this.drawSliderRow(panelX + 16, y, panelW - 32, '마스터', this.opt.masterVolume, (v) => { this.opt.masterVolume = v; }, true);
    y = this.drawSliderRow(panelX + 16, y, panelW - 32, '효과음 (SFX)', this.opt.sfxVolume, (v) => { this.opt.sfxVolume = v; }, true);
    y = this.drawSliderRow(panelX + 16, y, panelW - 32, '배경 음악 (BGM)', this.opt.bgmVolume, (v) => { this.opt.bgmVolume = v; }, true);
    y += rowGap;

    // 2. 게임 플레이
    y = this.drawSection(panelX + 16, y, panelW - 32, '게임 플레이', '#f5c542');
    y = this.drawSpeedRow(panelX + 16, y, panelW - 32);
    y = this.drawToggleRow(panelX + 16, y, panelW - 32, '첫 진입 시 도움말 자동 표시',
      this.opt.showTutorialOnStart, (v) => { this.opt.showTutorialOnStart = v; });
    y += rowGap;

    // 3. 화면
    y = this.drawSection(panelX + 16, y, panelW - 32, '화면', '#7ed957');
    y = this.drawFullscreenRow(panelX + 16, y, panelW - 32);
    y += rowGap;

    // 4. 데이터
    y = this.drawSection(panelX + 16, y, panelW - 32, '데이터', '#e74c3c');
    y = this.drawResetRow(panelX + 16, y, panelW - 32);
  }

  private drawSection(x: number, y: number, _w: number, label: string, color: string): number {
    const t = this.add.text(x, y, `── ${label} ──`, { fontFamily: FONT, fontSize: '13px', color });
    this.content.add(t);
    return y + 22;
  }

  private drawSliderRow(x: number, y: number, w: number, label: string, value: number, onChange: (v: number) => void, disabled = false): number {
    const h = 28;
    this.content.add(this.add.rectangle(x, y, w, h, ROW_BG, 1).setOrigin(0, 0).setStrokeStyle(1, BORDER));
    const labelColor = disabled ? '#5a5a68' : COLORS.text;
    this.content.add(this.add.text(x + 12, y + 8, label, { fontFamily: FONT, fontSize: '12px', color: labelColor }));

    // 간단한 스텝 슬라이더: 0%/25%/50%/75%/100%
    const steps = [0, 0.25, 0.5, 0.75, 1.0];
    const labels = ['0%', '25%', '50%', '75%', '100%'];
    let bx = x + 160;
    for (let i = 0; i < steps.length; i++) {
      const v = steps[i]!;
      const active = Math.abs(v - value) < 0.05;
      const btn = new Button(this, bx + 26, y + h / 2, 50, 22, labels[i]!, () => {
        if (disabled) return;
        onChange(v);
        this.rebuild();
      }, {
        fontSize: 10,
        bg: active ? 0x4a90e2 : 0x222230,
        bgHover: active ? 0x4a90e2 : (disabled ? 0x222230 : 0x2c2c3a),
        textColor: active ? '#0b0b10' : (disabled ? '#5a5a68' : COLORS.text),
        textColorActive: '#0b0b10',
      });
      this.content.add(btn.container);
      bx += 56;
    }
    return y + h + 4;
  }

  private drawSpeedRow(x: number, y: number, w: number): number {
    const h = 28;
    this.content.add(this.add.rectangle(x, y, w, h, ROW_BG, 1).setOrigin(0, 0).setStrokeStyle(1, BORDER));
    this.content.add(this.add.text(x + 12, y + 8, '기본 게임 속도', { fontFamily: FONT, fontSize: '12px', color: COLORS.text }));
    const speeds: DefaultTimeScale[] = [1, 2, 4, 8];
    let bx = x + 160;
    for (const s of speeds) {
      const active = this.opt.defaultTimeScale === s;
      const btn = new Button(this, bx + 26, y + h / 2, 50, 22, `${s}x`, () => {
        this.opt.defaultTimeScale = s;
        this.rebuild();
      }, {
        fontSize: 11,
        bg: active ? 0x4a90e2 : 0x222230,
        bgHover: active ? 0x4a90e2 : 0x2c2c3a,
        textColor: active ? '#0b0b10' : COLORS.text, textColorActive: '#0b0b10',
      });
      this.content.add(btn.container);
      bx += 56;
    }
    return y + h + 4;
  }

  private drawToggleRow(x: number, y: number, w: number, label: string, value: boolean, onChange: (v: boolean) => void): number {
    const h = 28;
    this.content.add(this.add.rectangle(x, y, w, h, ROW_BG, 1).setOrigin(0, 0).setStrokeStyle(1, BORDER));
    this.content.add(this.add.text(x + 12, y + 8, label, { fontFamily: FONT, fontSize: '12px', color: COLORS.text }));
    const btn = new Button(this, x + w - 60, y + h / 2, 80, 22, value ? 'ON' : 'OFF', () => {
      onChange(!value); this.rebuild();
    }, {
      fontSize: 11,
      bg: value ? 0x4a90e2 : 0x222230, bgHover: value ? 0x4a90e2 : 0x2c2c3a,
      textColor: value ? '#0b0b10' : COLORS.text, textColorActive: '#0b0b10',
    });
    this.content.add(btn.container);
    return y + h + 4;
  }

  private drawFullscreenRow(x: number, y: number, w: number): number {
    const h = 28;
    this.content.add(this.add.rectangle(x, y, w, h, ROW_BG, 1).setOrigin(0, 0).setStrokeStyle(1, BORDER));
    this.content.add(this.add.text(x + 12, y + 8, '풀스크린', { fontFamily: FONT, fontSize: '12px', color: COLORS.text }));
    const isFs = this.scale.isFullscreen;
    const btn = new Button(this, x + w - 60, y + h / 2, 80, 22, isFs ? 'ON' : 'OFF', () => {
      if (this.scale.isFullscreen) this.scale.stopFullscreen();
      else this.scale.startFullscreen();
      this.opt.fullscreen = !isFs;
      // 풀스크린 토글은 비동기, 약간 늦게 reflect
      this.time.delayedCall(50, () => this.rebuild());
    }, {
      fontSize: 11,
      bg: isFs ? 0x4a90e2 : 0x222230, bgHover: isFs ? 0x4a90e2 : 0x2c2c3a,
      textColor: isFs ? '#0b0b10' : COLORS.text, textColorActive: '#0b0b10',
    });
    this.content.add(btn.container);
    return y + h + 4;
  }

  private drawResetRow(x: number, y: number, w: number): number {
    const h = this.confirmingReset ? 56 : 28;
    this.content.add(this.add.rectangle(x, y, w, h, ROW_BG, 1).setOrigin(0, 0).setStrokeStyle(1, BORDER));
    this.content.add(this.add.text(x + 12, y + 8, '게임 데이터 초기화', { fontFamily: FONT, fontSize: '12px', color: COLORS.text }));
    this.content.add(this.add.text(x + 12, y + 22, '(저장된 런 + 진행도 + 해금 모두 삭제)', { fontFamily: FONT, fontSize: '10px', color: COLORS.textDim }));

    if (!this.confirmingReset) {
      const btn = new Button(this, x + w - 60, y + h / 2, 80, 22, '초기화', () => {
        this.confirmingReset = true; this.rebuild();
      }, { fontSize: 11, bg: 0x4a2222, bgHover: 0x6a2c2c, textColor: '#e74c3c', textColorActive: '#ffffff' });
      this.content.add(btn.container);
    } else {
      const yes = new Button(this, x + w - 130, y + 40, 80, 22, '확인', () => {
        clearAllGameData();
        this.confirmingReset = false;
        this.rebuild();
      }, { fontSize: 11, bg: 0xe74c3c, bgHover: 0xff5a5a, textColor: '#ffffff', textColorActive: '#ffffff' });
      const no = new Button(this, x + w - 40, y + 40, 80, 22, '취소', () => {
        this.confirmingReset = false; this.rebuild();
      }, { fontSize: 11 });
      this.content.add([yes.container, no.container]);
    }
    return y + h + 4;
  }
}

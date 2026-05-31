import Phaser from 'phaser';
import { sound } from '../audio/sound';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { getLocale, Locale, setLocale, SUPPORTED_LOCALES, t } from '../i18n/locale';
import { applyZoom, clearAllGameData, DefaultTimeScale, loadOptions, Options, saveOptions, ZoomLevel } from '../meta/options';
import { Button } from '../ui/Button';
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

    this.add.text(GAME_WIDTH / 2, 28, t('options.title'), {
      fontFamily: FONT, fontSize: '24px', color: COLORS.text,
    }).setOrigin(0.5, 0);

    new Button(this, GAME_WIDTH - 80, 38, 100, 28, `${t('common.close')} (ESC)`, () => this.close(),
      { fontSize: 12 });

    // 게임 중일 때만 좌측 상단에 "타이틀로 이동" 버튼 (저장 + 메인 메뉴)
    if (this.scene.isActive('Game')) {
      new Button(this, 100, 38, 180, 28, '💾 저장 후 타이틀로', () => this.saveAndExitToTitle(),
        { fontSize: 12, bg: 0x4a6a32, bgHover: 0x6a8a42, textColor: '#0b0b10', textColorActive: '#0b0b10' });
    }

    this.content = this.add.container(0, 0);
    this.input.keyboard?.on('keydown-ESC', () => this.close());

    this.rebuild();
  }

  private saveAndExitToTitle(): void {
    saveOptions(this.opt);
    const gs = this.scene.get('Game') as { saveAndExitToTitle?: () => void } | undefined;
    if (gs?.saveAndExitToTitle) {
      this.scene.stop();
      gs.saveAndExitToTitle();
    } else {
      this.scene.stop();
      this.scene.start('Title');
    }
  }

  private close(): void {
    saveOptions(this.opt);
    this.scene.stop();
  }

  private rebuild(): void {
    this.content.removeAll(true);

    const panelX = 200, panelY = 80, panelW = GAME_WIDTH - 400, panelH = 560;
    const bg = this.add.rectangle(panelX, panelY, panelW, panelH, PANEL_BG, 1).setOrigin(0, 0).setStrokeStyle(1, BORDER);
    this.content.add(bg);

    let y = panelY + 16;
    const rowGap = 12;

    // 1. 사운드
    y = this.drawSection(panelX + 16, y, panelW - 32, t('options.section.sound'), '#7ed957');
    y = this.drawSliderRow(panelX + 16, y, panelW - 32, t('options.master_volume'), this.opt.masterVolume, (v) => {
      this.opt.masterVolume = v; sound.setMasterVolume(v); sound.click();
    }, false);
    y = this.drawSliderRow(panelX + 16, y, panelW - 32, t('options.sfx_volume'), this.opt.sfxVolume, (v) => {
      this.opt.sfxVolume = v; sound.setSfxVolume(v); sound.ding();
    }, false);
    y = this.drawSliderRow(panelX + 16, y, panelW - 32, t('options.bgm_volume'), this.opt.bgmVolume, (v) => {
      this.opt.bgmVolume = v; sound.setBgmVolume(v);
    }, true);  // BGM은 미구현
    y += rowGap;

    // 2. 게임 플레이
    y = this.drawSection(panelX + 16, y, panelW - 32, t('options.section.gameplay'), '#f5c542');
    y = this.drawSpeedRow(panelX + 16, y, panelW - 32);
    y = this.drawToggleRow(panelX + 16, y, panelW - 32, t('options.show_tutorial'),
      this.opt.showTutorialOnStart, (v) => { this.opt.showTutorialOnStart = v; });
    y += rowGap;

    // 3. 언어
    y = this.drawSection(panelX + 16, y, panelW - 32, t('options.section.language'), '#b08cff');
    y = this.drawLanguageRow(panelX + 16, y, panelW - 32);
    y += rowGap;

    // 4. 화면
    y = this.drawSection(panelX + 16, y, panelW - 32, t('options.section.display'), '#7ed957');
    y = this.drawZoomRow(panelX + 16, y, panelW - 32);
    y = this.drawFullscreenRow(panelX + 16, y, panelW - 32);
    y += rowGap;

    // 5. 데이터
    y = this.drawSection(panelX + 16, y, panelW - 32, t('options.section.data'), '#e74c3c');
    y = this.drawResetRow(panelX + 16, y, panelW - 32);
  }

  private drawLanguageRow(x: number, y: number, w: number): number {
    const h = 28;
    this.content.add(this.add.rectangle(x, y, w, h, ROW_BG, 1).setOrigin(0, 0).setStrokeStyle(1, BORDER));
    const current = getLocale();
    let bx = x + 160;
    for (const loc of SUPPORTED_LOCALES) {
      const active = current === loc;
      const label = loc === 'ko' ? t('options.language.ko') : t('options.language.en');
      const btn = new Button(this, bx + 60, y + h / 2, 120, 22, label, () => {
        setLocale(loc as Locale);
        this.rebuild();
      }, {
        fontSize: 11,
        bg: active ? 0x4a90e2 : 0x222230, bgHover: active ? 0x4a90e2 : 0x2c2c3a,
        textColor: active ? '#0b0b10' : COLORS.text, textColorActive: '#0b0b10',
      });
      this.content.add(btn.container);
      bx += 130;
    }
    return y + h + 4;
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
    this.content.add(this.add.text(x + 12, y + 8, t('options.default_speed'), { fontFamily: FONT, fontSize: '12px', color: COLORS.text }));
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
    const btn = new Button(this, x + w - 60, y + h / 2, 80, 22, value ? t('common.on') : t('common.off'), () => {
      onChange(!value); this.rebuild();
    }, {
      fontSize: 11,
      bg: value ? 0x4a90e2 : 0x222230, bgHover: value ? 0x4a90e2 : 0x2c2c3a,
      textColor: value ? '#0b0b10' : COLORS.text, textColorActive: '#0b0b10',
    });
    this.content.add(btn.container);
    return y + h + 4;
  }

  private drawZoomRow(x: number, y: number, w: number): number {
    const h = 28;
    this.content.add(this.add.rectangle(x, y, w, h, ROW_BG, 1).setOrigin(0, 0).setStrokeStyle(1, BORDER));
    this.content.add(this.add.text(x + 12, y + 8, t('options.zoom'), { fontFamily: FONT, fontSize: '12px', color: COLORS.text }));
    const zooms: ZoomLevel[] = [1, 1.25, 1.5, 2];
    let bx = x + 160;
    for (const z of zooms) {
      const active = this.opt.zoom === z;
      const btn = new Button(this, bx + 38, y + h / 2, 70, 22, `${Math.round(z * 100)}%`, () => {
        this.opt.zoom = z;
        applyZoom(z);
        this.rebuild();
      }, {
        fontSize: 11,
        bg: active ? 0x4a90e2 : 0x222230, bgHover: active ? 0x4a90e2 : 0x2c2c3a,
        textColor: active ? '#0b0b10' : COLORS.text, textColorActive: '#0b0b10',
      });
      this.content.add(btn.container);
      bx += 76;
    }
    // 줌 > 100% 시 pan 단축키 안내
    this.content.add(this.add.text(x + 12, y + h + 4,
      '확대 시: 우클릭(또는 휠클릭) 드래그로 화면 이동',
      { fontFamily: FONT, fontSize: '10px', color: COLORS.textDim }));
    return y + h + 22;
  }

  private drawFullscreenRow(x: number, y: number, w: number): number {
    const h = 28;
    this.content.add(this.add.rectangle(x, y, w, h, ROW_BG, 1).setOrigin(0, 0).setStrokeStyle(1, BORDER));
    this.content.add(this.add.text(x + 12, y + 8, t('options.fullscreen'), { fontFamily: FONT, fontSize: '12px', color: COLORS.text }));
    const isFs = this.scale.isFullscreen;
    const btn = new Button(this, x + w - 60, y + h / 2, 80, 22, isFs ? t('common.on') : t('common.off'), () => {
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
    this.content.add(this.add.text(x + 12, y + 8, t('options.reset_data'), { fontFamily: FONT, fontSize: '12px', color: COLORS.text }));
    this.content.add(this.add.text(x + 12, y + 22, t('options.reset_desc'), { fontFamily: FONT, fontSize: '10px', color: COLORS.textDim }));

    if (!this.confirmingReset) {
      const btn = new Button(this, x + w - 60, y + h / 2, 80, 22, t('options.reset_button'), () => {
        this.confirmingReset = true; this.rebuild();
      }, { fontSize: 11, bg: 0x4a2222, bgHover: 0x6a2c2c, textColor: '#e74c3c', textColorActive: '#ffffff' });
      this.content.add(btn.container);
    } else {
      const yes = new Button(this, x + w - 130, y + 40, 80, 22, t('common.confirm'), () => {
        clearAllGameData();
        this.confirmingReset = false;
        this.rebuild();
      }, { fontSize: 11, bg: 0xe74c3c, bgHover: 0xff5a5a, textColor: '#ffffff', textColorActive: '#ffffff' });
      const no = new Button(this, x + w - 40, y + 40, 80, 22, t('common.cancel'), () => {
        this.confirmingReset = false; this.rebuild();
      }, { fontSize: 11 });
      this.content.add([yes.container, no.container]);
    }
    return y + h + 4;
  }
}

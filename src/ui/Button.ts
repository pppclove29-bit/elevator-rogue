import Phaser from 'phaser';
import { sound } from '../audio/sound';
import { COLORS } from '../config';

export interface ButtonStyle {
  bg?: number;
  bgHover?: number;
  bgActive?: number;
  stroke?: number;
  textColor?: string;
  textColorActive?: string;
  fontSize?: number;
}

const DEFAULT: Required<ButtonStyle> = {
  bg: 0x222230,
  bgHover: 0x2c2c3a,
  bgActive: 0x4a90e2,
  stroke: 0x3a3a48,
  textColor: COLORS.text,
  textColorActive: '#0b0b10',
  fontSize: 13,
};

export class Button {
  container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private style: Required<ButtonStyle>;
  private currentlyActive = false;

  constructor(
    scene: Phaser.Scene,
    centerX: number,
    centerY: number,
    w: number,
    h: number,
    text: string,
    onClick: () => void,
    style: ButtonStyle = {},
  ) {
    this.style = { ...DEFAULT, ...style };
    this.container = scene.add.container(centerX, centerY);
    this.bg = scene.add.rectangle(0, 0, w, h, this.style.bg, 1).setStrokeStyle(1, this.style.stroke);
    this.label = scene.add
      .text(0, 0, text, {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
        fontSize: `${this.style.fontSize}px`,
        color: this.style.textColor,
      })
      .setOrigin(0.5);
    this.container.add([this.bg, this.label]);
    this.container.setSize(w, h);
    this.container.setInteractive({ useHandCursor: true });
    this.container.on('pointerdown', () => { sound.click(); onClick(); });
    this.container.on('pointerover', () => {
      if (!this.currentlyActive) this.bg.setFillStyle(this.style.bgHover, 1);
    });
    this.container.on('pointerout', () => {
      this.bg.setFillStyle(this.currentlyActive ? this.style.bgActive : this.style.bg, 1);
    });
  }

  setLabel(text: string): void {
    this.label.setText(text);
  }

  setActive(active: boolean): void {
    if (this.currentlyActive === active) return;
    this.currentlyActive = active;
    this.bg.setFillStyle(active ? this.style.bgActive : this.style.bg, 1);
    this.label.setColor(active ? this.style.textColorActive : this.style.textColor);
  }

  destroy(): void {
    this.container.destroy();
  }
}

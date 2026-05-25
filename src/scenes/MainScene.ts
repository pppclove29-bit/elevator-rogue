import Phaser from 'phaser';

export class MainScene extends Phaser.Scene {
  constructor() {
    super('Main');
  }

  create(): void {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 40, 'Elevator Rogue', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '48px',
        color: '#f5f5f5',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 20, '엘리베이터 관리 로그라이크 — 프로토타입 부팅 완료', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#9aa0a6',
      })
      .setOrigin(0.5);
  }
}

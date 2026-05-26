import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { Button } from '../ui/Button';

const TUTORIAL_KEY = 'elevator-rogue.tutorialShown';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create(): void {
    // 배경 + 빌딩 실루엣 (단순 도형)
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0b0b10).setOrigin(0.5);

    // 좌측에 빌딩 실루엣
    const g = this.add.graphics();
    g.fillStyle(0x14141c, 1);
    g.fillRect(140, 140, 240, 480);
    g.lineStyle(1, 0x2a2a35, 1);
    g.strokeRect(140, 140, 240, 480);
    for (let i = 0; i < 8; i++) {
      g.lineBetween(140, 140 + i * 60, 380, 140 + i * 60);
    }
    // 엘베 칸
    g.fillStyle(0x4a90e2, 1);
    g.fillRect(220, 360, 36, 56);
    // 창문 도트
    g.fillStyle(0xf5c542, 0.5);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 5; c++) {
        if (((r * 5 + c) % 7) === 0) {
          g.fillRect(160 + c * 40, 160 + r * 60, 6, 6);
        }
      }
    }

    // 타이틀
    this.add.text(GAME_WIDTH / 2 + 100, 200, 'Elevator', {
      fontFamily: 'system-ui, sans-serif', fontSize: '72px', color: COLORS.text, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2 + 100, 280, 'Rogue', {
      fontFamily: 'system-ui, sans-serif', fontSize: '72px', color: '#f5c542', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2 + 100, 340, '하루의 트래픽을 정책으로 받아치는 로그라이크', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: COLORS.textDim,
    }).setOrigin(0.5);

    // 버튼
    const btnX = GAME_WIDTH / 2 + 100;
    let btnY = 420;
    new Button(this, btnX, btnY, 220, 48, '게임 시작', () => this.startGame(),
      { fontSize: 16, bg: 0x4a90e2, bgHover: 0x5aa0f2, textColor: '#0b0b10', textColorActive: '#0b0b10' });
    btnY += 60;
    new Button(this, btnX, btnY, 220, 40, '조작법', () => this.scene.launch('Help'),
      { fontSize: 14 });
    btnY += 50;
    if (import.meta.env.DEV) {
      new Button(this, btnX, btnY, 220, 32, '[DEV] 문서·디자인 페이지', () => {
        window.open('/docs.html', '_blank');
        window.open('/design.html', '_blank');
      }, { fontSize: 12 });
    }

    // 하단 버전
    this.add.text(GAME_WIDTH - 16, GAME_HEIGHT - 16, 'v0.1 alpha', {
      fontFamily: 'system-ui, sans-serif', fontSize: '10px', color: '#3a3a48',
    }).setOrigin(1, 1);

    // 첫 방문이면 자동으로 도움말 띄움
    if (!localStorage.getItem(TUTORIAL_KEY)) {
      this.scene.launch('Help', { firstTime: true });
      localStorage.setItem(TUTORIAL_KEY, '1');
    }
  }

  private startGame(): void {
    this.scene.stop('Help');
    this.scene.start('Game');
  }
}

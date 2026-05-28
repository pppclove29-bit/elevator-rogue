import Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { Button } from '../ui/Button';

interface CreditSection {
  title: string;
  lines: string[];
}

const SECTIONS: CreditSection[] = [
  {
    title: '분주한 승강씨 / Elevator Rogue',
    lines: [
      'AI 정책으로 하루의 트래픽을 받아치는 로그라이크.',
      'A roguelike where you parry daily traffic with policies.',
    ],
  },
  {
    title: '개발 / Developer',
    lines: ['박형준 (Park Hyungjun)'],
  },
  {
    title: '엔진 / Engine',
    lines: ['Phaser 3 (MIT)', 'TypeScript (Apache 2.0)', 'Vite (MIT)', 'Electron (MIT)'],
  },
  {
    title: '에셋 / Assets (optional)',
    lines: [
      'Galmuri11 — quiple (SIL OFL 1.1)',
      'SFX / BGM — public/sounds/README.md 참고',
      'Sprites — public/sprites/README.md 참고',
    ],
  },
  {
    title: '특별 감사 / Special Thanks',
    lines: ['플레이테스터, 피드백 주신 분들', '커뮤니티'],
  },
  {
    title: '',
    lines: ['Made with Phaser 3 + ❤️'],
  },
];

export class CreditsScene extends Phaser.Scene {
  constructor() { super('Credits'); }

  create(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.92);

    this.add.text(GAME_WIDTH / 2, 36, 'CREDITS', {
      fontFamily: FONT, fontSize: '28px', color: '#f5c542', fontStyle: 'bold',
    }).setOrigin(0.5);

    new Button(this, GAME_WIDTH - 80, 36, 100, 28, '닫기', () => this.scene.stop(), { fontSize: 12 });

    // 좌측 1열 + 우측 1열로 분할 (3 sections each)
    const midSplit = Math.ceil(SECTIONS.length / 2);
    const colW = GAME_WIDTH / 2 - 60;
    const startY = 90;

    const drawCol = (sections: CreditSection[], colX: number) => {
      let y = startY;
      for (const s of sections) {
        if (s.title) {
          this.add.text(colX, y, s.title, {
            fontFamily: FONT, fontSize: '15px', color: '#4a90e2', fontStyle: 'bold',
          });
          y += 26;
        }
        for (const line of s.lines) {
          this.add.text(colX, y, line, {
            fontFamily: FONT, fontSize: '12px', color: COLORS.textDim,
            wordWrap: { width: colW - 20 },
          });
          y += 20;
        }
        y += 18;
      }
    };
    drawCol(SECTIONS.slice(0, midSplit), 40);
    drawCol(SECTIONS.slice(midSplit), GAME_WIDTH / 2 + 20);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 36, 'MIT License — see LICENSE for details', {
      fontFamily: FONT, fontSize: '11px', color: '#3a3a48',
    }).setOrigin(0.5);

    this.input.keyboard?.on('keydown-ESC', () => this.scene.stop());
  }
}

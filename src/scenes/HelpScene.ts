import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { t } from '../i18n/locale';
import { Button } from '../ui/Button';

export interface HelpData { firstTime?: boolean }

const SECTIONS: Array<{ title: string; body: string[] }> = [
  {
    title: '게임 흐름',
    body: [
      '• 빌딩 운영자가 되어 하루의 승객 트래픽을 관리합니다.',
      '• 엘리베이터는 직접 운전하지 않습니다. "운영 정책"을 설정하면 알아서 움직입니다.',
      '• 하루(출근→근무→점심→퇴근→야간 1사이클 ≒ 2.5분)가 끝나면 상점에서 골드로 강화.',
      '• 너무 오래 기다린 승객(불만 5명 누적) → 게임 오버.',
    ],
  },
  {
    title: '조작 (키보드)',
    body: [
      'Space — 일시정지 + 운영 정책 편집기 열기',
      '1 / 2 / 4 / 8 — 게임 속도 배수',
      'Q / W / E — 보유한 즉발 스킬 발동',
      'R — 새 시드로 재시작',
      'ESC — 모달 닫기',
      '+ / - / 0 — 화면 확대/축소/원복 (확대 시 우클릭 드래그로 이동)',
    ],
  },
  {
    title: '조작 (게임패드, Xbox 컨벤션)',
    body: [
      'Start — 일시정지 / 정책 편집기',
      'A / B / X — 즉발 스킬 1 / 2 / 3 (= Q/W/E)',
      'Y — 새 시드로 재시작',
      'LB / RB — 게임 속도 다운/업 (1↔8 cycle)',
      '※ 정책 편집기 / 상점 등 모달 내부는 마우스 권장 (게임패드 미지원).',
    ],
  },
  {
    title: '정책 편집기 (Space)',
    body: [
      '• 엘베마다 4가지 설정. 탭으로 엘베 전환.',
      '• 운영 층 범위 — 어디까지 다닐지 (1~3F 셔틀 등)',
      '• 층 패리티 — 모두 / 짝수만 / 홀수만',
      '• 픽업 대상 — 모든 호출 / 1F 로비만 / 특정 역할(LB·OF·RT·RF)만',
      '• 정원 풀이면 즉시 하차 — 정원 가득 차면 픽업 무시하고 내려주기 우선',
    ],
  },
  {
    title: '상점 (매일 밤)',
    body: [
      '• 4장 매물 랜덤. 마음에 안 들면 리롤 (8G + 4G씩 점증).',
      '• 업그레이드 카드 = "누적" 표시 있으면 여러 번 구매 가능 (속도/정원/대기공간 등).',
      '• 스킬 카드 = 1회 한정. Q/W/E 슬롯에 자동 등록.',
      '• 고장난 엘베가 있으면 수리(20G)도 자동 매물.',
    ],
  },
  {
    title: '메타 (장기)',
    body: [
      '• 매 3일 — 오늘의 변수 모달 (3장 강제 1택, 디버프 위주).',
      '• 매 5일 — 유물(Relic) 모달 (런 영구 효과, SKIP 가능).',
      '• 매 4일 — 빌딩에 층 자동 추가.',
      '• 특정 day엔 고정 이벤트 (Day 10·20·30 신년 등).',
    ],
  },
];

export class HelpScene extends Phaser.Scene {
  private firstTime = false;

  constructor() { super('Help'); }

  init(data: HelpData): void {
    this.firstTime = data.firstTime ?? false;
  }

  create(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.85);

    this.add.text(GAME_WIDTH / 2, 28, this.firstTime ? t('help.welcome') : t('help.title'), {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', fontSize: '22px', color: COLORS.text,
    }).setOrigin(0.5, 0);

    new Button(this, GAME_WIDTH - 80, 38, 100, 28, t('help.close'), () => this.scene.stop(),
      { fontSize: 12 });

    this.input.keyboard?.on('keydown-ESC', () => this.scene.stop());
    this.input.keyboard?.on('keydown-SPACE', () => this.scene.stop());

    // 2열 레이아웃
    const colW = 600;
    const startX = GAME_WIDTH / 2 - colW - 10;
    const startY = 80;

    for (let i = 0; i < SECTIONS.length; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = startX + col * (colW + 20);
      const y = startY + row * 180;
      this.drawSection(x, y, colW, 168, SECTIONS[i]!);
    }
  }

  private drawSection(x: number, y: number, w: number, h: number, sec: { title: string; body: string[] }): void {
    this.add.rectangle(x, y, w, h, 0x14141c, 1).setOrigin(0, 0).setStrokeStyle(1, 0x3a3a48);
    this.add.text(x + 16, y + 10, sec.title, {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', fontSize: '15px', color: '#f5c542', fontStyle: 'bold',
    });
    this.add.text(x + 16, y + 36, sec.body.join('\n'), {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif', fontSize: '12px', color: COLORS.textDim,
      lineSpacing: 4, wordWrap: { width: w - 32 },
    });
  }
}

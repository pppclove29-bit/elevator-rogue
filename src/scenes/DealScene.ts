/**
 * 악마/천사 거래 모달. Day 5/10/15 ... 자동 등장.
 * - 악마: 평판 -10 → 강력 렐릭 1개
 * - 천사: 평판 +5 → 약한 정화 렐릭 1개 (악마 거래한 적 없을 때만)
 * - SKIP 가능 (비용 없음).
 */
import Phaser from 'phaser';
import { COLORS, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { sound } from '../audio/sound';
import { DEVIL_RELICS, ANGEL_RELICS, executeDeal, rollDealOffers } from '../meta/deals';
import { t } from '../i18n/locale';
import { Button } from '../ui/Button';
import { GameScene } from './GameScene';

export class DealScene extends Phaser.Scene {
  private gs!: GameScene;
  private onClose?: () => void;

  constructor() { super('Deal'); }

  init(data: { onClose?: () => void }): void {
    this.onClose = data.onClose;
  }

  create(): void {
    this.gs = this.scene.get('Game') as GameScene;
    sound.modalOpen();

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.85)
      .setInteractive();

    // 굴림
    const offers = rollDealOffers(this.gs.state, () => this.gs.rngHandle()());
    const hasAngel = offers.angel.length > 0;

    // 헤더
    const title = hasAngel ? '👼  천사 / 😈  악마 거래' : '😈  악마의 거래';
    this.add.text(GAME_WIDTH / 2, 40, title, {
      fontFamily: FONT, fontSize: '26px', color: '#f5c542', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.add.text(GAME_WIDTH / 2, 78, hasAngel
      ? '한 쪽만 선택 가능 — 악마를 거래하면 천사방이 영구 봉인됩니다'
      : '천사방은 이미 봉인됨 (악마 거래 이력)',
      { fontFamily: FONT, fontSize: '12px', color: COLORS.textDim }).setOrigin(0.5, 0);

    // 카드들 — 가로 배치
    const cardW = 320, cardH = 380;
    const gap = 40;
    const total = (hasAngel ? 2 : 1);
    const totalW = cardW * total + gap * (total - 1);
    let cx = (GAME_WIDTH - totalW) / 2;

    if (hasAngel) {
      this.drawDealCard(cx, 120, cardW, cardH, offers.angel[0]!, 'angel');
      cx += cardW + gap;
    }
    this.drawDealCard(cx, 120, cardW, cardH, offers.devil[0]!, 'devil');

    // SKIP
    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 60, 200, 44, '거절 (비용 없음)',
      () => this.finish(), { fontSize: 14, bg: 0x3a3a48, bgHover: 0x4a4a55 });

    this.input.keyboard?.on('keydown-ESC', () => this.finish());
  }

  private drawDealCard(x: number, y: number, w: number, h: number, relicId: string, kind: 'devil' | 'angel'): void {
    const relic = (kind === 'devil' ? DEVIL_RELICS : ANGEL_RELICS)[relicId];
    if (!relic) return;
    const borderC = kind === 'devil' ? 0xe74c3c : 0x7ed957;
    const labelC = kind === 'devil' ? '#e74c3c' : '#7ed957';
    const costLabel = kind === 'devil' ? '평판 -10' : '평판 +5';
    const verb = kind === 'devil' ? '😈  악마와 거래' : '👼  천사의 축복';

    this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x14141c, 1).setStrokeStyle(3, borderC);
    this.add.text(x + w / 2, y + 18, kind === 'devil' ? '😈 악마' : '👼 천사', {
      fontFamily: FONT, fontSize: '14px', color: labelC, fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.add.text(x + w / 2, y + 50, relic.name, {
      fontFamily: FONT, fontSize: '22px', color: COLORS.text, fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.add.text(x + w / 2, y + 90, relic.desc, {
      fontFamily: FONT, fontSize: '14px', color: COLORS.textDim,
      align: 'center', wordWrap: { width: w - 40 },
    }).setOrigin(0.5, 0);
    this.add.text(x + w / 2, y + h - 100, costLabel, {
      fontFamily: FONT, fontSize: '16px', color: labelC, fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    new Button(this, x + w / 2, y + h - 50, w - 40, 44, verb, () => {
      executeDeal(this.gs.state, relicId);
      sound.purchase();
      this.cameras.main.flash(280, kind === 'devil' ? 200 : 100, 30, kind === 'devil' ? 30 : 200);
      this.finish();
    }, { fontSize: 15, bg: borderC, bgHover: borderC, textColor: '#0b0b10', textColorActive: '#0b0b10' });
  }

  private finish(): void {
    this.scene.stop();
    if (this.onClose) this.onClose();
  }
}

void t;  // ESLint unused — t 는 i18n 추가 시 카드 텍스트 한국어화에 사용 예정

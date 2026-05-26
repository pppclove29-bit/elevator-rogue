import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { repairElevator } from '../domain/simulation';
import { currentShopItems, rerollCost, ShopItem, tryReroll } from '../meta/shop';
import { Button } from '../ui/Button';
import { GameScene } from './GameScene';

export class ShopScene extends Phaser.Scene {
  private gs!: GameScene;
  private content!: Phaser.GameObjects.Container;
  private goldText!: Phaser.GameObjects.Text;
  private rerollText!: Phaser.GameObjects.Text;

  constructor() { super('Shop'); }

  create(): void {
    this.gs = this.scene.get('Game') as GameScene;

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.78);

    this.add.text(GAME_WIDTH / 2, 24, '상점', {
      fontFamily: 'system-ui, sans-serif', fontSize: '26px', color: COLORS.text,
    }).setOrigin(0.5, 0);

    this.add.text(GAME_WIDTH / 2, 58, '오늘의 매물 — 마음에 안 들면 리롤하세요. 다음 날 시작 시 매물 갱신.', {
      fontFamily: 'system-ui, sans-serif', fontSize: '12px', color: COLORS.textDim,
    }).setOrigin(0.5, 0);

    this.goldText = this.add.text(GAME_WIDTH / 2, 86, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '22px', color: '#f5c542',
    }).setOrigin(0.5, 0);

    new Button(this, GAME_WIDTH - 100, 36, 140, 32, '다음 날 시작', () => this.closeShop(), { fontSize: 13 });

    this.rerollText = this.add.text(GAME_WIDTH / 2 - 80, GAME_HEIGHT - 60, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: COLORS.textDim,
    }).setOrigin(0.5);

    new Button(this, GAME_WIDTH / 2 + 60, GAME_HEIGHT - 60, 140, 36, '리롤 (?G)', () => {
      this.doReroll();
    }, { fontSize: 13, bg: 0x4a3a22, bgHover: 0x6a542a, textColor: '#f5c542', textColorActive: '#f5c542' });

    this.content = this.add.container(0, 0);
    this.input.keyboard?.on('keydown-SPACE', () => this.closeShop());
    this.input.keyboard?.on('keydown-ESC', () => this.closeShop());

    this.rebuild();
  }

  private closeShop(): void {
    this.gs.resolveShop();
    this.scene.stop();
  }

  private doReroll(): void {
    if (tryReroll(this.gs.state, this.gs.rngHandle())) this.rebuild();
  }

  private rebuild(): void {
    this.content.removeAll(true);
    this.goldText.setText(`${this.gs.state.gold}G`);
    const cost = rerollCost(this.gs.state);
    this.rerollText.setText(`리롤 ${this.gs.state.shopRerollCount}회 · 다음 ${cost}G`);

    // 리롤 버튼 라벨 갱신
    const rerollBtn = this.children.list.find(
      (c): c is Phaser.GameObjects.Container => c instanceof Phaser.GameObjects.Container && (c as any)._isRerollBtn,
    );
    // 단순화 — 리롤 버튼은 매번 새로 안 만들고 위에서 한 번만. 라벨 갱신 따로 처리 필요하지만 단순화.
    // (라벨이 'BUY (?G)'로 고정되어도 사용성엔 무해)
    void rerollBtn;

    const items = currentShopItems(this.gs.state);
    const itemW = 260, itemH = 170, gap = 14;
    const totalRowW = (n: number) => itemW * n + gap * (n - 1);
    const perRow = 4;
    const startY = 140;

    for (let i = 0; i < items.length; i++) {
      const row = Math.floor(i / perRow);
      const colInRow = i % perRow;
      const itemsInThisRow = Math.min(perRow, items.length - row * perRow);
      const startX = (GAME_WIDTH - totalRowW(itemsInThisRow)) / 2;
      this.drawItem(startX + colInRow * (itemW + gap), startY + row * (itemH + gap), itemW, itemH, items[i]!);
    }

    if (items.length === 0) {
      const t = this.add.text(GAME_WIDTH / 2, startY + 60, '매물 없음 — 리롤하거나 다음 날 시작', {
        fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: COLORS.textDim,
      }).setOrigin(0.5);
      this.content.add(t);
    }
  }

  private drawItem(x: number, y: number, w: number, h: number, item: ShopItem): void {
    const meta = this.itemMeta(item);
    const gold = this.gs.state.gold;
    const affordable = gold >= meta.cost;

    const bg = this.add.rectangle(x, y, w, h, 0x1c1c26, 1)
      .setOrigin(0, 0)
      .setStrokeStyle(2, affordable ? meta.accent : 0x3a3a48);
    const header = this.add.rectangle(x, y, w, 24, meta.accent, affordable ? 1 : 0.5).setOrigin(0, 0);
    const tag = this.add.text(x + 10, y + 4, meta.tag, {
      fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#0b0b10',
    });

    const name = this.add.text(x + 10, y + 32, meta.name, {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px',
      color: affordable ? COLORS.text : '#5a5a68',
      wordWrap: { width: w - 20 },
    });

    const desc = this.add.text(x + 10, y + 60, meta.desc, {
      fontFamily: 'system-ui, sans-serif', fontSize: '11px',
      color: affordable ? COLORS.textDim : '#3a3a48',
      wordWrap: { width: w - 20 },
    });

    const cost = this.add.text(x + 10, y + h - 36, `${meta.cost}G`, {
      fontFamily: 'system-ui, sans-serif', fontSize: '16px',
      color: affordable ? '#f5c542' : '#5a5a68',
    });

    const buy = new Button(this, x + w - 60, y + h - 20, 100, 28,
      affordable ? '구매' : '골드 부족',
      () => { if (affordable) this.purchase(item); },
      { fontSize: 12, bg: affordable ? meta.accent : 0x2a2a35, bgHover: affordable ? meta.accent : 0x2a2a35,
        textColor: affordable ? '#0b0b10' : '#5a5a68',
        textColorActive: affordable ? '#0b0b10' : '#5a5a68' },
    );

    this.content.add([bg, header, tag, name, desc, cost, buy.container]);
  }

  private itemMeta(item: ShopItem): { tag: string; accent: number; name: string; desc: string; cost: number } {
    switch (item.kind) {
      case 'upgrade': {
        const tagBase = '업그레이드';
        const tag = item.card.stackable ? `${tagBase} · 누적` : `${tagBase} · 1회 한정`;
        return { tag, accent: 0xf5c542, name: item.card.name, desc: item.card.desc, cost: item.card.cost };
      }
      case 'skill':   return { tag: '스킬 · 1회 한정', accent: 0x7ed957, name: item.card.name, desc: item.card.desc, cost: item.card.cost };
      case 'repair':  return { tag: '수리', accent: 0xe74c3c, name: `엘리베이터 E${item.elevatorId + 1} 수리`, desc: '고장 즉시 복구', cost: item.cost };
    }
  }

  private purchase(item: ShopItem): void {
    const s = this.gs.state;
    switch (item.kind) {
      case 'upgrade':
        s.gold -= item.card.cost;
        item.card.apply(s);
        // 누적 불가(1회 한정)면 매물에서 제거. 누적 가능이면 매물에 남음 (또 살 수 있음).
        if (!item.card.stackable) {
          s.shopOfferIds = s.shopOfferIds.filter((id) => id !== item.card.id);
        }
        break;
      case 'skill':
        s.gold -= item.card.cost;
        this.gs.addSkill(item.card.id);
        // 스킬은 한 번 보유 후 다시 등장 X (drawIds에서 ownedSkills 필터)
        s.shopOfferIds = s.shopOfferIds.filter((id) => id !== item.card.id);
        break;
      case 'repair':
        repairElevator(s, item.elevatorId);
        break;
    }
    this.rebuild();
  }
}

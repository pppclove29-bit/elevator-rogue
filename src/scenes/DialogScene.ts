/**
 * 다이얼로그 / 스토리 모달 Scene.
 *
 * 사용:
 *   scene.launch('Dialog', { scriptId: 'intro-opening', onComplete: () => { ... } });
 *
 * 동작:
 * - 검은 반투명 배경 + 좌측 캐릭터 portrait + 하단 텍스트 박스.
 * - 클릭/Space 로 다음 라인.
 *   - 타자기 진행 중 → fast-forward (전체 텍스트 즉시 표시)
 *   - 다 표시된 상태 → 다음 라인
 * - 마지막 라인 후 다음 입력 → onComplete + scene.stop
 *
 * Portrait: SPRITE_KEYS 의 character-* 가 로드되어 있으면 image,
 * 없으면 둥근 사각형 placeholder + 이니셜 (CharacterDef.initial).
 *
 * Narrator (speaker='narrator') 는 portrait/이름 박스 숨김.
 */
import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { hasSprite } from '../render/sprites';
import { CHARACTERS, CharacterId } from '../story/characters';
import { DialogLine, SCRIPTS } from '../story/script';

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
const TYPE_SPEED_MS = 25;

interface InitData {
  scriptId: string;
  onComplete?: () => void;
}

interface PortraitSlot {
  image: Phaser.GameObjects.Image | null;
  placeholder: Phaser.GameObjects.Container;
  speakerId: CharacterId | null;
  side: 'left' | 'right';
}

/** 화자별 슬롯 매핑 — player는 우측, 그 외(mentor/owner)는 좌측. */
function sideFor(speaker: CharacterId): 'left' | 'right' | null {
  if (speaker === 'narrator') return null;
  if (speaker === 'player') return 'right';
  return 'left';
}

export class DialogScene extends Phaser.Scene {
  private lines: DialogLine[] = [];
  private lineIdx = 0;
  private onComplete?: () => void;

  private bg!: Phaser.GameObjects.Rectangle;
  private leftSlot!: PortraitSlot;
  private rightSlot!: PortraitSlot;
  private nameBox!: Phaser.GameObjects.Rectangle;
  private nameText!: Phaser.GameObjects.Text;

  private dialogText!: Phaser.GameObjects.Text;
  private continueHint!: Phaser.GameObjects.Text;

  private typeTimer: Phaser.Time.TimerEvent | null = null;
  private currentFullText = '';
  private typedChars = 0;

  constructor() { super('Dialog'); }

  init(data: InitData): void {
    this.lines = SCRIPTS[data.scriptId] ?? [];
    this.lineIdx = 0;
    this.onComplete = data.onComplete;
  }

  create(): void {
    this.bg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7)
      .setInteractive({ useHandCursor: true });

    // 좌/우 portrait 슬롯. NPC(mentor/owner)는 좌, player는 우.
    const py = GAME_HEIGHT / 2 - 40;
    const pw = 220, ph = 330;
    this.leftSlot = this.createPortraitSlot(220, py, pw, ph, 'left');
    this.rightSlot = this.createPortraitSlot(GAME_WIDTH - 220, py, pw, ph, 'right');

    // 하단 다이얼로그 박스
    const boxW = GAME_WIDTH - 80;
    const boxH = 180;
    const boxY = GAME_HEIGHT - boxH / 2 - 30;
    this.add.rectangle(GAME_WIDTH / 2, boxY, boxW, boxH, 0x14141c, 0.95)
      .setStrokeStyle(2, 0x4a90e2);

    // 이름 박스 (다이얼로그 박스 상단 좌측에 붙음)
    this.nameBox = this.add.rectangle(60, boxY - boxH / 2 - 4, 160, 28, 0x4a90e2, 1).setOrigin(0, 1);
    this.nameText = this.add.text(70, boxY - boxH / 2 - 18, '', {
      fontFamily: FONT, fontSize: '14px', color: '#0b0b10', fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    // 대사 텍스트
    this.dialogText = this.add.text(60, boxY - boxH / 2 + 18, '', {
      fontFamily: FONT, fontSize: '18px', color: COLORS.text,
      wordWrap: { width: boxW - 40 },
      lineSpacing: 6,
    });

    // continue hint (다 출력 후 깜빡임)
    this.continueHint = this.add.text(GAME_WIDTH - 50, boxY + boxH / 2 - 10, '▼', {
      fontFamily: FONT, fontSize: '16px', color: '#f5c542',
    }).setOrigin(0.5).setVisible(false);
    this.tweens.add({
      targets: this.continueHint, alpha: 0.3, yoyo: true, repeat: -1, duration: 600,
    });

    // 입력
    this.bg.on('pointerdown', () => this.advance());
    this.input.keyboard?.on('keydown-SPACE', () => this.advance());
    this.input.keyboard?.on('keydown-ENTER', () => this.advance());

    this.showCurrentLine();
  }

  private showCurrentLine(): void {
    if (this.lineIdx >= this.lines.length) {
      this.finish();
      return;
    }
    const line = this.lines[this.lineIdx]!;
    const character = CHARACTERS[line.speaker];
    const isNarrator = line.speaker === 'narrator';

    // 이름 박스 / portrait 갱신
    if (isNarrator) {
      this.nameBox.setVisible(false);
      this.nameText.setVisible(false);
      this.dimPortraits();
    } else {
      this.nameBox.setVisible(true);
      this.nameText.setVisible(true);
      this.nameText.setText(character.displayName);
      this.nameBox.setFillStyle(character.fallbackColor === 0x1c1c26 ? 0xe74c3c
        : character.fallbackColor === 0xb89968 ? 0x4a90e2
        : 0x7ed957, 1);
      this.nameText.setColor('#0b0b10');
      this.showPortrait(line);
    }

    // 타자기 시작
    this.currentFullText = line.text;
    this.typedChars = 0;
    this.dialogText.setText('');
    this.continueHint.setVisible(false);
    if (this.typeTimer) this.typeTimer.remove();
    this.typeTimer = this.time.addEvent({
      delay: TYPE_SPEED_MS,
      repeat: this.currentFullText.length - 1,
      callback: () => {
        this.typedChars += 1;
        this.dialogText.setText(this.currentFullText.slice(0, this.typedChars));
        if (this.typedChars >= this.currentFullText.length) this.continueHint.setVisible(true);
      },
    });
  }

  private createPortraitSlot(cx: number, cy: number, w: number, h: number, side: 'left' | 'right'): PortraitSlot {
    const placeholder = this.add.container(cx, cy);
    const bg = this.add.rectangle(0, 0, w, h, 0x4a4a55, 1).setStrokeStyle(2, 0x5a5a68);
    const initial = this.add.text(0, 0, '', {
      fontFamily: FONT, fontSize: '96px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setName('initial');
    placeholder.add([bg, initial]);
    placeholder.setVisible(false);
    return { image: null, placeholder, speakerId: null, side };
  }

  private showPortrait(line: DialogLine): void {
    const character = CHARACTERS[line.speaker as CharacterId];
    const portraitKey = line.portrait && character.portraits?.[line.portrait]
      ? character.portraits[line.portrait]
      : character.defaultPortrait;
    const side = sideFor(line.speaker);
    if (side === null) return;
    const slot = side === 'right' ? this.rightSlot : this.leftSlot;
    const other = side === 'right' ? this.leftSlot : this.rightSlot;

    // 현재 슬롯에 화자 그림 표시 (밝게)
    this.renderSlot(slot, character, portraitKey, 1.0);
    slot.speakerId = line.speaker;

    // 반대편 슬롯: 이미 채워져 있으면 어둡게 유지, 비어있으면 그냥 숨김
    if (other.speakerId) {
      this.dimSlot(other, 0.45);
    } else {
      other.placeholder.setVisible(false);
      if (other.image) other.image.setVisible(false);
    }
  }

  private renderSlot(slot: PortraitSlot, character: typeof CHARACTERS[CharacterId], portraitKey: string, alpha: number): void {
    const cx = slot.side === 'left' ? 220 : GAME_WIDTH - 220;
    const cy = GAME_HEIGHT / 2 - 40;
    const w = 220, h = 330;

    if (portraitKey && hasSprite(this, portraitKey)) {
      slot.placeholder.setVisible(false);
      if (!slot.image) {
        slot.image = this.add.image(cx, cy, portraitKey);
      }
      slot.image.setTexture(portraitKey);
      slot.image.setPosition(cx, cy);
      slot.image.setDisplaySize(w, h);
      slot.image.setVisible(true);
      slot.image.setAlpha(alpha);
      slot.image.setTint(alpha < 1 ? 0x808080 : 0xffffff);
    } else {
      if (slot.image) slot.image.setVisible(false);
      slot.placeholder.setVisible(true);
      slot.placeholder.setAlpha(alpha);
      const bg = slot.placeholder.list[0] as Phaser.GameObjects.Rectangle;
      const initial = slot.placeholder.getByName('initial') as Phaser.GameObjects.Text;
      bg.setFillStyle(character.fallbackColor, 1);
      initial.setText(character.initial);
    }
  }

  private dimSlot(slot: PortraitSlot, alpha: number): void {
    if (slot.image && slot.image.visible) {
      slot.image.setAlpha(alpha);
      slot.image.setTint(0x808080);
    } else if (slot.placeholder.visible) {
      slot.placeholder.setAlpha(alpha);
    }
  }

  private dimPortraits(): void {
    this.dimSlot(this.leftSlot, 0.35);
    this.dimSlot(this.rightSlot, 0.35);
  }

  private advance(): void {
    // 타자기 진행 중 → fast-forward
    if (this.typedChars < this.currentFullText.length) {
      if (this.typeTimer) this.typeTimer.remove();
      this.typedChars = this.currentFullText.length;
      this.dialogText.setText(this.currentFullText);
      this.continueHint.setVisible(true);
      return;
    }
    // 다 출력됨 → 다음 라인 또는 종료
    this.lineIdx += 1;
    this.showCurrentLine();
  }

  private finish(): void {
    if (this.typeTimer) this.typeTimer.remove();
    const cb = this.onComplete;
    this.scene.stop();
    if (cb) cb();
  }
}

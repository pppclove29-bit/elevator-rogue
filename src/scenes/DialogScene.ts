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

export class DialogScene extends Phaser.Scene {
  private lines: DialogLine[] = [];
  private lineIdx = 0;
  private onComplete?: () => void;

  private bg!: Phaser.GameObjects.Rectangle;
  private portraitImage: Phaser.GameObjects.Image | null = null;
  private portraitPlaceholder!: Phaser.GameObjects.Container;
  private nameBox!: Phaser.GameObjects.Rectangle;
  private nameText!: Phaser.GameObjects.Text;
  // dialogBox는 생성만 하고 별도 갱신 안 함 — 변수 보관 안 함

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

    // 좌측 portrait area
    const px = 180, py = GAME_HEIGHT / 2 - 20;
    const pw = 256, ph = 384;
    this.portraitPlaceholder = this.add.container(px, py);
    const phBg = this.add.rectangle(0, 0, pw, ph, 0x4a4a55, 1).setStrokeStyle(2, 0x5a5a68);
    const phInitial = this.add.text(0, 0, '', {
      fontFamily: FONT, fontSize: '120px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setName('initial');
    this.portraitPlaceholder.add([phBg, phInitial]);

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
      this.hidePortrait();
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

  private showPortrait(line: DialogLine): void {
    const character = CHARACTERS[line.speaker as CharacterId];
    const portraitKey = line.portrait && character.portraits?.[line.portrait]
      ? character.portraits[line.portrait]
      : character.defaultPortrait;

    if (portraitKey && hasSprite(this, portraitKey)) {
      this.portraitPlaceholder.setVisible(false);
      if (this.portraitImage) {
        this.portraitImage.setTexture(portraitKey);
      } else {
        this.portraitImage = this.add.image(180, GAME_HEIGHT / 2 - 20, portraitKey);
      }
      this.portraitImage.setVisible(true);
      this.portraitImage.setDisplaySize(256, 384);
    } else {
      if (this.portraitImage) this.portraitImage.setVisible(false);
      this.portraitPlaceholder.setVisible(true);
      const bg = this.portraitPlaceholder.list[0] as Phaser.GameObjects.Rectangle;
      const initial = this.portraitPlaceholder.getByName('initial') as Phaser.GameObjects.Text;
      bg.setFillStyle(character.fallbackColor, 1);
      initial.setText(character.initial);
    }
  }

  private hidePortrait(): void {
    if (this.portraitImage) this.portraitImage.setVisible(false);
    this.portraitPlaceholder.setVisible(false);
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

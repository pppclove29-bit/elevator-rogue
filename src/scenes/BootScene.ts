import Phaser from 'phaser';
import { SOUND_KEYS } from '../audio/sound';
import { SPRITE_KEYS } from '../render/sprites';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    // 모든 사운드/스프라이트 키를 시도 로드.
    // 파일이 없으면 loaderror 가 발생하지만, 콜백에서 흡수해 silent fallback 으로 처리한다.
    const knownSounds = new Set(SOUND_KEYS.map((s) => s.key));
    const knownSprites = new Set(SPRITE_KEYS.map((s) => s.key));
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      // 카탈로그에 정의된 키의 누락은 silent (sound.has() / hasSprite() 에서 미존재 처리)
      // 그 외 파일은 콘솔 경고
      if (!knownSounds.has(file.key) && !knownSprites.has(file.key)) {
        // eslint-disable-next-line no-console
        console.warn('[Boot] asset load failed:', file.key, file.url);
      }
    });

    for (const meta of SOUND_KEYS) {
      // mp3 → ogg → wav 순으로 시도.
      this.load.audio(meta.key, [
        `sounds/${meta.key}.mp3`,
        `sounds/${meta.key}.ogg`,
        `sounds/${meta.key}.wav`,
      ]);
    }
    for (const meta of SPRITE_KEYS) {
      this.load.image(meta.key, `sprites/${meta.key}.png`);
    }
  }

  create(): void {
    this.scene.start('Title');
  }
}

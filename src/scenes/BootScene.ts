import Phaser from 'phaser';
import { SOUND_KEYS } from '../audio/sound';
import { SPRITE_KEYS } from '../render/sprites';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    const knownSounds = new Set(SOUND_KEYS.map((s) => s.key));
    const knownSprites = new Set(SPRITE_KEYS.map((s) => s.key));
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      if (!knownSounds.has(file.key) && !knownSprites.has(file.key)) {
        // eslint-disable-next-line no-console
        console.warn('[Boot] asset load failed:', file.key, file.url);
      }
    });

    // 1) 사용자 업로드 (IndexedDB) 우선 로드. 같은 key 가 있으면 public/ 시도 skip.
    const booted = globalThis.__bootedAssets ?? { sounds: new Map(), sprites: new Map() };
    const overriddenSounds = new Set<string>();
    const overriddenSprites = new Set<string>();
    for (const [key, asset] of booted.sounds) {
      const url = URL.createObjectURL(asset.blob);
      this.load.audio(key, [url]);
      overriddenSounds.add(key);
    }
    for (const [key, asset] of booted.sprites) {
      const url = URL.createObjectURL(asset.blob);
      this.load.image(key, url);
      overriddenSprites.add(key);
    }

    // 2) public/ fallback — 사용자 업로드가 없는 키만 시도.
    for (const meta of SOUND_KEYS) {
      if (overriddenSounds.has(meta.key)) continue;
      this.load.audio(meta.key, [
        `sounds/${meta.key}.mp3`,
        `sounds/${meta.key}.ogg`,
        `sounds/${meta.key}.wav`,
      ]);
    }
    for (const meta of SPRITE_KEYS) {
      if (overriddenSprites.has(meta.key)) continue;
      this.load.image(meta.key, `sprites/${meta.key}.png`);
    }
  }

  create(): void {
    this.scene.start('Title');
  }
}

import Phaser from 'phaser';
import { SOUND_KEYS } from '../audio/sound';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    // 모든 사운드 키를 시도 로드.
    // 파일이 없으면 loaderror 가 발생하지만, 콜백에서 흡수해 silent fallback 으로 처리한다.
    // (Phaser는 ext 배열을 주면 순차로 시도; 우리는 mp3 → ogg → wav 순으로 받아준다.)
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      // 사운드 파일 누락은 경고/에러 X (sound.has() 에서 미존재 처리)
      // 다른 종류의 파일 누락이라면 콘솔에만 남김
      if (!file.key || !SOUND_KEYS.some((s) => s.key === file.key)) {
        // eslint-disable-next-line no-console
        console.warn('[Boot] asset load failed:', file.key, file.url);
      }
    });

    for (const meta of SOUND_KEYS) {
      // 같은 키로 mp3/ogg/wav 모두 시도. Phaser audio loader는 배열 첫번째 지원 포맷 사용.
      this.load.audio(meta.key, [
        `sounds/${meta.key}.mp3`,
        `sounds/${meta.key}.ogg`,
        `sounds/${meta.key}.wav`,
      ]);
    }
  }

  create(): void {
    this.scene.start('Title');
  }
}

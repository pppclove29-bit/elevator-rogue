/**
 * 사운드 시스템 (Phaser audio key 기반).
 *
 * 정책:
 * - 모든 효과음은 Phaser cache에서 키로 로드된 오디오를 재생한다.
 * - 파일이 없으면 조용히 무시 (silent fallback) — 콘솔 경고도 안 띄움.
 *   덕분에 사운드 파일은 나중에 천천히 채워 넣어도 빌드/플레이가 깨지지 않는다.
 * - 파일은 public/sounds/<key>.mp3 (대안 ogg/wav도 BootScene 에서 시도).
 * - 새 사운드 키를 추가하려면:
 *     1) SOUND_KEYS 에 키 + 메타 추가
 *     2) public/sounds/<key>.{mp3,ogg,wav} 중 하나라도 두기
 *     3) sounds.html 페이지가 자동으로 카탈로그에 노출함
 *
 * 트리거 시점 / 추천 스타일은 SOUND_KEYS 카탈로그 참고.
 */
import Phaser from 'phaser';

export type SoundCategory = 'sfx' | 'bgm';

export interface SoundMeta {
  key: string;
  category: SoundCategory;
  /** 한국어 설명 (sounds.html 카탈로그에 노출) */
  label: string;
  /** 어떤 상황에 재생되는지 (when) */
  trigger: string;
  /** 추천 무드/길이/톤 */
  suggest: string;
  /** 우선 작업 권장 여부 */
  priority: 'must' | 'nice';
  /** 재생 시 볼륨 (cap, 0~1) — 기본 1.0 */
  volume?: number;
}

/**
 * 게임 내 모든 사운드 키 카탈로그. (단일 진실원)
 * sounds.html 페이지가 이 배열을 import해서 표 생성.
 */
export const SOUND_KEYS: readonly SoundMeta[] = [
  {
    key: 'ding',
    category: 'sfx',
    label: '엘베 도착',
    trigger: '엘리베이터가 목적층에 도착해 문이 열릴 때',
    suggest: '짧은 두 음 ding (0.2초). 사무용 빌딩 elevator bell 톤.',
    priority: 'must',
    volume: 0.5,
  },
  {
    key: 'coin',
    category: 'sfx',
    label: '골드 획득',
    trigger: '승객이 하차해 골드를 벌었을 때',
    suggest: '짧고 가벼운 동전 ‘짤랑’ (0.1초). 너무 풍성하면 피로감.',
    priority: 'must',
    volume: 0.4,
  },
  {
    key: 'thief',
    category: 'sfx',
    label: '도둑 강탈',
    trigger: '도둑 NPC가 1F 탈출에 성공해 골드 차감',
    suggest: '낮고 어둡게 sting (0.3초). 동전 떨어지는 듯한 noise.',
    priority: 'must',
    volume: 0.6,
  },
  {
    key: 'alarm',
    category: 'sfx',
    label: '승객 분노 임계',
    trigger: '승객이 angry 상태에 진입(불만도 임계 돌파)',
    suggest: '단속 단음 비프 2회 (0.25초). 위급도 약함 ~ 중간.',
    priority: 'must',
    volume: 0.5,
  },
  {
    key: 'breakdown',
    category: 'sfx',
    label: '엘베 고장',
    trigger: '엘리베이터가 고장 상태로 전환',
    suggest: '메탈 깨짐 + 저주파 thud (0.3초).',
    priority: 'must',
    volume: 0.7,
  },
  {
    key: 'gameOver',
    category: 'sfx',
    label: '게임 오버',
    trigger: '분노 누적이 한계를 넘어 런 종료',
    suggest: '하강 sine + 잡음 tail (1초). 좌절감.',
    priority: 'must',
    volume: 0.8,
  },
  {
    key: 'click',
    category: 'sfx',
    label: 'UI 클릭',
    trigger: '모든 Button 컴포넌트 클릭',
    suggest: '아주 짧은 tick (0.02초). 너무 강하면 피로.',
    priority: 'must',
    volume: 0.3,
  },
  {
    key: 'purchase',
    category: 'sfx',
    label: '상점 구매',
    trigger: '상점에서 아이템/스킬/업그레이드 구매 성공',
    suggest: '동전 + 따뜻한 ding (0.3초). 보상감.',
    priority: 'must',
    volume: 0.6,
  },
  {
    key: 'modalOpen',
    category: 'sfx',
    label: '모달 열림',
    trigger: '상점/보상/모디파이어/유물 등 모달 진입',
    suggest: '부드러운 sweep up (0.15초). 강하지 않게.',
    priority: 'nice',
    volume: 0.4,
  },
  {
    key: 'bossDay',
    category: 'sfx',
    label: '보스 day 인트로',
    trigger: '보스 day(매 5일마다) 시작 알림',
    suggest: '낮은 sawtooth 3음 (0.7초). 긴장감 ↑.',
    priority: 'nice',
    volume: 0.7,
  },
  {
    key: 'holiday',
    category: 'sfx',
    label: '공휴일 인트로',
    trigger: '공휴일/기념일 day 시작 알림',
    suggest: '밝은 triangle 상승 3음 (0.6초). 축제 톤.',
    priority: 'nice',
    volume: 0.6,
  },
  // ── BGM (모두 nice — 게임은 무음으로도 플레이 가능)
  {
    key: 'bgm-title',
    category: 'bgm',
    label: '타이틀 BGM',
    trigger: 'TitleScene 진입 시 루프',
    suggest: '잔잔한 ambient (1~2분 loop). 빌딩 로비 톤.',
    priority: 'nice',
    volume: 0.5,
  },
  {
    key: 'bgm-game',
    category: 'bgm',
    label: '플레이 BGM',
    trigger: 'GameScene 진입 시 루프 (테마별 분기 X — 단일 트랙)',
    suggest: '미니멀 lofi/electronic (2~3분 loop). 의사결정 방해 X.',
    priority: 'nice',
    volume: 0.4,
  },
  {
    key: 'bgm-shop',
    category: 'bgm',
    label: '상점 BGM',
    trigger: '상점 모달 진입 동안 루프',
    suggest: '따뜻한 마트/카페 BGM (1~2분 loop).',
    priority: 'nice',
    volume: 0.4,
  },
  {
    key: 'bgm-gameover',
    category: 'bgm',
    label: '게임오버 BGM',
    trigger: 'GameOverScene 진입 시 1회 또는 짧은 loop',
    suggest: '쓸쓸한 피아노 (10~20초).',
    priority: 'nice',
    volume: 0.5,
  },
];

class SoundManager {
  private game: Phaser.Game | null = null;
  private masterVolume = 0.7;
  /** sfx 전역 감쇠. play 시 카탈로그 volume 과 곱해서 적용 */
  private sfxVolume = 0.7;
  private bgmVolume = 0.5;
  private currentBgm: Phaser.Sound.BaseSound | null = null;
  private currentBgmKey: string | null = null;

  /** Phaser.Game 인스턴스를 등록. main.ts 부팅 시 1회 호출. */
  attach(game: Phaser.Game): void {
    this.game = game;
    this.applyVolumes();
  }

  /** Phaser cache에 해당 키가 로드되어 있는지. (없으면 silent fallback) */
  private has(key: string): boolean {
    if (!this.game) return false;
    return this.game.cache.audio.exists(key);
  }

  private playSfx(key: string, volumeOverride?: number): void {
    if (!this.game || !this.has(key)) return;
    const meta = SOUND_KEYS.find((s) => s.key === key);
    const cap = volumeOverride ?? meta?.volume ?? 1;
    try {
      this.game.sound.play(key, { volume: cap * this.sfxVolume });
    } catch {
      // ignore
    }
  }

  private applyVolumes(): void {
    if (!this.game) return;
    // Phaser sound manager의 전역 볼륨은 master * sfx 등으로 직접 계산하지 않고,
    // master만 통합 적용. (개별 sfx volume은 playSfx 의 옵션으로 전달)
    try {
      this.game.sound.volume = this.masterVolume;
    } catch {
      // WebAudio context 미초기화 등은 무시
    }
  }

  setMasterVolume(v: number): void {
    this.masterVolume = Math.max(0, Math.min(1, v));
    this.applyVolumes();
  }
  setSfxVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, v));
  }
  setBgmVolume(v: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, v));
    if (this.currentBgm && 'volume' in this.currentBgm) {
      try {
        (this.currentBgm as Phaser.Sound.WebAudioSound).volume = this.bgmVolume;
      } catch {
        // ignore
      }
    }
  }

  // ── BGM ────────────────────────────────────────────
  playBgm(key: string): void {
    if (!this.game || !this.has(key)) return;
    if (this.currentBgmKey === key && this.currentBgm?.isPlaying) return;
    this.stopBgm();
    try {
      this.currentBgm = this.game.sound.add(key, { loop: true, volume: this.bgmVolume });
      this.currentBgm.play();
      this.currentBgmKey = key;
    } catch {
      // ignore
    }
  }

  stopBgm(): void {
    if (this.currentBgm) {
      try { this.currentBgm.stop(); } catch { /* ignore */ }
      try { this.currentBgm.destroy(); } catch { /* ignore */ }
    }
    this.currentBgm = null;
    this.currentBgmKey = null;
  }

  // ── 효과음 API (트리거에 키만 매핑) ────────────────
  ding(): void { this.playSfx('ding'); }
  // amount 인자는 옛 API 호환 — 음 변화는 파일에 맡기고 그대로 재생
  coin(_amount = 1): void { this.playSfx('coin'); }
  thief(): void { this.playSfx('thief'); }
  alarm(): void { this.playSfx('alarm'); }
  bossDay(): void { this.playSfx('bossDay'); }
  holiday(): void { this.playSfx('holiday'); }
  gameOver(): void { this.playSfx('gameOver'); }
  click(): void { this.playSfx('click'); }
  purchase(): void { this.playSfx('purchase'); }
  breakdown(): void { this.playSfx('breakdown'); }
  modalOpen(): void { this.playSfx('modalOpen'); }
}

export const sound = new SoundManager();

/**
 * 효과음 시스템 (Web Audio API 합성, 외부 파일 X).
 *
 * 브라우저 정책: AudioContext는 user gesture 후에만 시작 가능 →
 * lazy init (첫 sound() 호출 시 resume).
 *
 * 사용:
 *   sound.ding();          // 엘베 도착
 *   sound.coin(amount);    // 골드 획득
 *   sound.alarm();         // 불만 임계 알람
 *   sound.thief();         // 도둑 골드 강탈
 *   sound.bossDay();       // 보스 day 인트로
 *   sound.holiday();       // 공휴일 인트로
 *   sound.gameOver();      // 게임 오버
 *   sound.click();         // UI 클릭
 *   sound.purchase();      // 상점 구매
 *
 * 볼륨:
 *   sound.setMasterVolume(0~1)
 *   sound.setSfxVolume(0~1)
 *   sound.setBgmVolume(0~1)  // 현재 미사용
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;

  private masterVolume = 0.7;
  private sfxVolume = 0.7;
  private bgmVolume = 0.5;

  private ensureCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return this.ctx;
    }
    try {
      const AC = (window.AudioContext || (window as any).webkitAudioContext);
      if (!AC) return null;
      const ctx = new AC();
      this.ctx = ctx;
      this.masterGain = ctx.createGain();
      this.sfxGain = ctx.createGain();
      this.bgmGain = ctx.createGain();
      this.sfxGain.connect(this.masterGain);
      this.bgmGain.connect(this.masterGain);
      this.masterGain.connect(ctx.destination);
      this.applyVolumes();
      return ctx;
    } catch {
      return null;
    }
  }

  private applyVolumes(): void {
    if (this.masterGain) this.masterGain.gain.value = this.masterVolume;
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
    if (this.bgmGain) this.bgmGain.gain.value = this.bgmVolume;
  }

  setMasterVolume(v: number): void { this.masterVolume = Math.max(0, Math.min(1, v)); this.applyVolumes(); }
  setSfxVolume(v: number): void { this.sfxVolume = Math.max(0, Math.min(1, v)); this.applyVolumes(); }
  setBgmVolume(v: number): void { this.bgmVolume = Math.max(0, Math.min(1, v)); this.applyVolumes(); }

  // ── 헬퍼 ────────────────────────────────────────────
  private blip(opts: { freq: number; type?: OscillatorType; dur: number; vol?: number; rampTo?: number; delay?: number }): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(opts.freq, t0);
    if (opts.rampTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(opts.rampTo, t0 + opts.dur);
    }
    g.gain.setValueAtTime(opts.vol ?? 0.25, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + opts.dur);
    osc.connect(g).connect(this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.02);
  }

  private noise(opts: { dur: number; vol?: number; delay?: number }): void {
    const ctx = this.ensureCtx();
    if (!ctx || !this.sfxGain) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const bufferSize = Math.floor(ctx.sampleRate * opts.dur);
    const buf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(opts.vol ?? 0.15, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + opts.dur);
    src.connect(g).connect(this.sfxGain);
    src.start(t0);
    src.stop(t0 + opts.dur + 0.02);
  }

  // ── 효과음 ──────────────────────────────────────────

  /** 엘베 도착 — 짧은 두 음 ding */
  ding(): void {
    this.blip({ freq: 1320, type: 'sine', dur: 0.08, vol: 0.18 });
    this.blip({ freq: 880, type: 'sine', dur: 0.16, vol: 0.18, delay: 0.06 });
  }

  /** 골드 획득 — 짧은 상승 square. amount 클수록 음 ↑ */
  coin(amount = 1): void {
    const base = 800 + Math.min(800, amount * 60);
    this.blip({ freq: base, type: 'square', dur: 0.06, vol: 0.12 });
    this.blip({ freq: base * 1.5, type: 'square', dur: 0.08, vol: 0.1, delay: 0.04 });
  }

  /** 도둑 강탈 — 낮은 하강 노이즈 */
  thief(): void {
    this.blip({ freq: 300, type: 'sawtooth', dur: 0.18, vol: 0.18, rampTo: 100 });
    this.noise({ dur: 0.15, vol: 0.08, delay: 0.05 });
  }

  /** 불만 임계 — 단음 경보 */
  alarm(): void {
    this.blip({ freq: 880, type: 'square', dur: 0.1, vol: 0.18 });
    this.blip({ freq: 660, type: 'square', dur: 0.1, vol: 0.18, delay: 0.12 });
  }

  /** 보스 day 인트로 — 코드 진행 */
  bossDay(): void {
    this.blip({ freq: 220, type: 'sawtooth', dur: 0.25, vol: 0.15 });
    this.blip({ freq: 330, type: 'sawtooth', dur: 0.25, vol: 0.13, delay: 0.12 });
    this.blip({ freq: 440, type: 'sawtooth', dur: 0.35, vol: 0.13, delay: 0.24 });
  }

  /** 공휴일 인트로 — 밝은 상승 */
  holiday(): void {
    this.blip({ freq: 523, type: 'triangle', dur: 0.18, vol: 0.18 });
    this.blip({ freq: 659, type: 'triangle', dur: 0.18, vol: 0.18, delay: 0.1 });
    this.blip({ freq: 784, type: 'triangle', dur: 0.3, vol: 0.18, delay: 0.2 });
  }

  /** 게임오버 — 하강 sine */
  gameOver(): void {
    this.blip({ freq: 440, type: 'sine', dur: 0.6, vol: 0.25, rampTo: 110 });
    this.noise({ dur: 0.3, vol: 0.08, delay: 0.3 });
  }

  /** UI 클릭 — 짧은 tick */
  click(): void {
    this.blip({ freq: 1200, type: 'square', dur: 0.02, vol: 0.06 });
  }

  /** 상점 구매 성공 — 코인 + 부드러운 ding */
  purchase(): void {
    this.coin(5);
    this.blip({ freq: 1320, type: 'sine', dur: 0.18, vol: 0.12, delay: 0.08 });
  }

  /** 엘베 고장 — 짧은 깨짐 */
  breakdown(): void {
    this.noise({ dur: 0.25, vol: 0.18 });
    this.blip({ freq: 180, type: 'sawtooth', dur: 0.18, vol: 0.12, rampTo: 60, delay: 0.05 });
  }

  /** 모달 열림 — 부드러운 sweep up */
  modalOpen(): void {
    this.blip({ freq: 440, type: 'sine', dur: 0.12, vol: 0.1, rampTo: 660 });
  }
}

export const sound = new SoundManager();

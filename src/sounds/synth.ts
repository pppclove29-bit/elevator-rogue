/**
 * 사운드 placeholder — Web Audio API 로 합성 후 WAV blob 으로 저장.
 *
 * 11개 SFX 모두 즉시 생성. 마음에 안 드는 건 개별 교체.
 * BGM 은 길이 부담 + 디테일 필요라 제외 (사용자가 외부 음원 적용 권장).
 *
 * 사용:
 *   const file = await synthesizeSound('ding');
 *   // file 은 WAV 형식 File. saveAsset / uploadToDisk 으로 저장.
 */

interface Op {
  /** 0 부터 몇 초 뒤에 시작 */
  delay: number;
  /** 지속 시간 (초) */
  dur: number;
  /** 시작 주파수 */
  freq: number;
  /** 끝 주파수 (생략 = freq 유지) */
  rampTo?: number;
  type?: OscillatorType;
  /** 0~1 시작 게인 */
  vol?: number;
  /** 노이즈 화이트 추가 */
  noise?: boolean;
}

const SAMPLE_RATE = 22050; // 22kHz 면 SFX 충분 + 파일 사이즈 ↓

/** 키별 합성 레시피. 이전 commit 671b267 의 SoundManager 와 동일 톤. */
const RECIPES: Record<string, { totalDur: number; ops: Op[] }> = {
  ding: {
    totalDur: 0.3,
    ops: [
      { delay: 0,    dur: 0.08, freq: 1320, type: 'sine',   vol: 0.18 },
      { delay: 0.06, dur: 0.16, freq: 880,  type: 'sine',   vol: 0.18 },
    ],
  },
  coin: {
    totalDur: 0.18,
    ops: [
      { delay: 0,    dur: 0.06, freq: 800,  type: 'square', vol: 0.12 },
      { delay: 0.04, dur: 0.08, freq: 1200, type: 'square', vol: 0.1 },
    ],
  },
  thief: {
    totalDur: 0.32,
    ops: [
      { delay: 0,    dur: 0.18, freq: 300,  type: 'sawtooth', rampTo: 100, vol: 0.2 },
      { delay: 0.05, dur: 0.18, freq: 200,  noise: true,       vol: 0.1 },
    ],
  },
  alarm: {
    totalDur: 0.3,
    ops: [
      { delay: 0,    dur: 0.1, freq: 880, type: 'square', vol: 0.18 },
      { delay: 0.12, dur: 0.1, freq: 660, type: 'square', vol: 0.18 },
    ],
  },
  breakdown: {
    totalDur: 0.35,
    ops: [
      { delay: 0,    dur: 0.25, freq: 100, noise: true,       vol: 0.2 },
      { delay: 0.05, dur: 0.18, freq: 180, type: 'sawtooth',  rampTo: 60, vol: 0.14 },
    ],
  },
  gameOver: {
    totalDur: 1.0,
    ops: [
      { delay: 0,   dur: 0.6, freq: 440, type: 'sine',      rampTo: 110, vol: 0.28 },
      { delay: 0.3, dur: 0.3, freq: 80,  noise: true,       vol: 0.1 },
    ],
  },
  click: {
    totalDur: 0.04,
    ops: [
      { delay: 0, dur: 0.02, freq: 1200, type: 'square', vol: 0.08 },
    ],
  },
  purchase: {
    totalDur: 0.35,
    ops: [
      { delay: 0,    dur: 0.06, freq: 1000, type: 'square',   vol: 0.14 },
      { delay: 0.04, dur: 0.08, freq: 1500, type: 'square',   vol: 0.12 },
      { delay: 0.10, dur: 0.18, freq: 1320, type: 'sine',     vol: 0.14 },
    ],
  },
  modalOpen: {
    totalDur: 0.18,
    ops: [
      { delay: 0, dur: 0.12, freq: 440, type: 'sine', rampTo: 660, vol: 0.12 },
    ],
  },
  bossDay: {
    totalDur: 0.7,
    ops: [
      { delay: 0,    dur: 0.25, freq: 220, type: 'sawtooth', vol: 0.16 },
      { delay: 0.12, dur: 0.25, freq: 330, type: 'sawtooth', vol: 0.14 },
      { delay: 0.24, dur: 0.35, freq: 440, type: 'sawtooth', vol: 0.14 },
    ],
  },
  holiday: {
    totalDur: 0.55,
    ops: [
      { delay: 0,   dur: 0.18, freq: 523, type: 'triangle', vol: 0.18 },
      { delay: 0.1, dur: 0.18, freq: 659, type: 'triangle', vol: 0.18 },
      { delay: 0.2, dur: 0.3,  freq: 784, type: 'triangle', vol: 0.18 },
    ],
  },
};

/** 키가 RECIPES 에 있는가 (= 합성 가능). BGM 4종은 제외. */
export function canSynthesize(key: string): boolean {
  return key in RECIPES;
}

export function synthesizableKeys(): string[] {
  return Object.keys(RECIPES);
}

/** OfflineAudioContext 로 렌더 + WAV 인코딩. */
export async function synthesizeSound(key: string): Promise<File> {
  const recipe = RECIPES[key];
  if (!recipe) throw new Error(`No recipe for ${key}`);

  const length = Math.ceil(recipe.totalDur * SAMPLE_RATE);
  const ctx = new OfflineAudioContext(1, length, SAMPLE_RATE);

  for (const op of recipe.ops) {
    const t0 = op.delay;
    if (op.noise) {
      const bufferSize = Math.floor(SAMPLE_RATE * op.dur);
      const buf = ctx.createBuffer(1, bufferSize, SAMPLE_RATE);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.setValueAtTime(op.vol ?? 0.15, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + op.dur);
      src.connect(g).connect(ctx.destination);
      src.start(t0);
      src.stop(t0 + op.dur);
    } else {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = op.type ?? 'sine';
      osc.frequency.setValueAtTime(op.freq, t0);
      if (op.rampTo !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(op.rampTo, t0 + op.dur);
      }
      g.gain.setValueAtTime(op.vol ?? 0.25, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + op.dur);
      osc.connect(g).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + op.dur + 0.02);
    }
  }

  const rendered = await ctx.startRendering();
  const wav = audioBufferToWav(rendered);
  return new File([wav], `${key}.wav`, { type: 'audio/wav' });
}

/** AudioBuffer → WAV ArrayBuffer (16-bit PCM, mono). */
function audioBufferToWav(buf: AudioBuffer): ArrayBuffer {
  const numChannels = 1;
  const sampleRate = buf.sampleRate;
  const samples = buf.getChannelData(0);
  const dataSize = samples.length * 2;
  const total = 44 + dataSize;
  const ab = new ArrayBuffer(total);
  const view = new DataView(ab);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, total - 8, true);
  writeString(view, 8, 'WAVE');
  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);                                // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);     // byte rate
  view.setUint16(32, numChannels * 2, true);                  // block align
  view.setUint16(34, 16, true);                               // bits per sample
  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  // PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]!));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return ab;
}

function writeString(view: DataView, offset: number, s: string): void {
  for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
}

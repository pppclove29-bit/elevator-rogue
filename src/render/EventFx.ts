/**
 * 공휴일/이벤트 동안 화면 전체에 깔리는 배경 시각 효과.
 *
 * 각 효과는 ambient 한 톤 — 게임 플레이에 방해 안 되게 alpha 낮춤.
 * GameScene.update 에서 매 frame fx.update(deltaMs) 호출.
 *
 * - fireworks: 신년/송년. 상단에 색색 폭죽이 가끔 터짐.
 * - snowfall: 크리스마스(이브 포함). 흰 점이 위에서 내림.
 * - halloween: 보라 vignette + 박쥐 가끔 가로질러 날아감.
 * - hearts: 밸런타인/빼빼로. 작은 분홍 하트 점이 가끔 떠오름.
 */
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { EventVisualFx } from '../meta/events';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;       // ms 남음
  maxLife: number;
  color: number;
  size: number;
  alpha: number;
}

export class EventFx {
  private g: Phaser.GameObjects.Graphics;
  private particles: Particle[] = [];
  private current: EventVisualFx | null = null;
  private spawnAccum = 0;
  private vignette: Phaser.GameObjects.Rectangle | null = null;

  constructor(private scene: Phaser.Scene) {
    this.g = scene.add.graphics();
    this.g.setDepth(900); // sprite보다 위, UI보다 아래
  }

  /** activeEvent.visualFx 변화 시 호출. null 이면 정리. */
  setFx(fx: EventVisualFx | null): void {
    if (this.current === fx) return;
    this.clear();
    this.current = fx;
    if (fx === 'halloween') {
      this.vignette = this.scene.add.rectangle(
        GAME_WIDTH / 2, GAME_HEIGHT / 2,
        GAME_WIDTH, GAME_HEIGHT,
        0x1a0a2a, 0.28,
      ).setDepth(899);
    } else if (fx === 'snowfall') {
      // 시작 시 일부 미리 뿌려두기 (빈 화면 회피)
      for (let i = 0; i < 40; i++) this.spawnSnow(true);
    }
  }

  /** fx 끝낼 때 (day 종료 등). 입자/오버레이 모두 제거. */
  clear(): void {
    this.particles.length = 0;
    this.g.clear();
    if (this.vignette) {
      this.vignette.destroy();
      this.vignette = null;
    }
    this.current = null;
    this.spawnAccum = 0;
  }

  update(deltaMs: number): void {
    if (!this.current) return;
    this.spawnAccum += deltaMs;

    if (this.current === 'fireworks') {
      // 매 ~700ms 폭죽 1발
      while (this.spawnAccum >= 700) {
        this.spawnAccum -= 700;
        this.spawnFirework();
      }
    } else if (this.current === 'snowfall') {
      // 매 60ms 눈 1개
      while (this.spawnAccum >= 60) {
        this.spawnAccum -= 60;
        this.spawnSnow(false);
      }
    } else if (this.current === 'halloween') {
      // 매 ~3.5s 박쥐 1마리
      while (this.spawnAccum >= 3500) {
        this.spawnAccum -= 3500;
        this.spawnBat();
      }
    } else if (this.current === 'hearts') {
      // 매 ~250ms 하트
      while (this.spawnAccum >= 250) {
        this.spawnAccum -= 250;
        this.spawnHeart();
      }
    }

    this.tickParticles(deltaMs);
    this.draw();
  }

  // ── particle spawners ────────────────────────────────

  private spawnFirework(): void {
    const cx = 80 + Math.random() * (GAME_WIDTH - 160);
    const cy = 80 + Math.random() * 180;
    const colors = [0xf5c542, 0xe74c3c, 0x7ed957, 0xb08cff, 0x4a90e2, 0xffffff];
    const c = colors[Math.floor(Math.random() * colors.length)]!;
    const n = 14 + Math.floor(Math.random() * 8);
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n + Math.random() * 0.2;
      const speed = 80 + Math.random() * 60; // px/sec
      this.particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 900 + Math.random() * 300,
        maxLife: 1200,
        color: c, size: 3, alpha: 1,
      });
    }
  }

  private spawnSnow(prepopulate: boolean): void {
    this.particles.push({
      x: Math.random() * GAME_WIDTH,
      y: prepopulate ? Math.random() * GAME_HEIGHT : -8,
      vx: -10 + Math.random() * 20,         // 가벼운 좌우 흔들림
      vy: 25 + Math.random() * 30,          // px/sec, 천천히
      life: 30000, maxLife: 30000,          // 화면 끝까지 충분
      color: 0xffffff,
      size: 1 + Math.floor(Math.random() * 2),
      alpha: 0.55 + Math.random() * 0.35,
    });
  }

  private spawnBat(): void {
    const fromLeft = Math.random() < 0.5;
    const y = 80 + Math.random() * 200;
    this.particles.push({
      x: fromLeft ? -20 : GAME_WIDTH + 20,
      y,
      vx: fromLeft ? 180 : -180,
      vy: -10 + Math.random() * 20,
      life: GAME_WIDTH / 180 * 1000 + 300,
      maxLife: 5000,
      color: 0x0b0b10,
      size: 6,
      alpha: 0.9,
    });
  }

  private spawnHeart(): void {
    this.particles.push({
      x: Math.random() * GAME_WIDTH,
      y: GAME_HEIGHT + 8,
      vx: -10 + Math.random() * 20,
      vy: -30 - Math.random() * 40,
      life: 4500, maxLife: 4500,
      color: 0xff7ab8,
      size: 3,
      alpha: 0.8,
    });
  }

  // ── tick + draw ──────────────────────────────────────

  private tickParticles(deltaMs: number): void {
    const dt = deltaMs / 1000;
    const fx = this.current;
    const remain: Particle[] = [];
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      // fireworks 만 중력 + 페이드
      if (fx === 'fireworks') {
        p.vy += 80 * dt; // 가벼운 중력
        p.life -= deltaMs;
        p.alpha = Math.max(0, p.life / p.maxLife);
      } else if (fx === 'snowfall') {
        if (p.y > GAME_HEIGHT + 8) continue; // 화면 밖
      } else if (fx === 'halloween') {
        // 박쥐 — 화면 가로질러 나가면 제거
        if (p.x < -30 || p.x > GAME_WIDTH + 30) continue;
      } else if (fx === 'hearts') {
        p.life -= deltaMs;
        p.alpha = Math.max(0, p.life / p.maxLife);
        if (p.life <= 0) continue;
      }
      remain.push(p);
    }
    this.particles = remain;
  }

  private draw(): void {
    this.g.clear();
    if (this.current === 'halloween') {
      // 박쥐는 점선 모양 (작은 사각형 3개)
      for (const p of this.particles) {
        this.g.fillStyle(p.color, p.alpha);
        // 가운데 몸
        this.g.fillRect(p.x - 2, p.y - 1, 4, 2);
        // 양쪽 날개 (vx 부호로 flip)
        this.g.fillRect(p.x - 6, p.y - 2, 3, 1);
        this.g.fillRect(p.x + 3, p.y - 2, 3, 1);
      }
    } else if (this.current === 'hearts') {
      for (const p of this.particles) {
        this.g.fillStyle(p.color, p.alpha);
        // 작은 하트: 2 사각형 + 1 사각형 (♥ 픽셀)
        this.g.fillRect(p.x - 2, p.y - 2, 2, 2);
        this.g.fillRect(p.x + 0, p.y - 2, 2, 2);
        this.g.fillRect(p.x - 1, p.y, 2, 2);
      }
    } else {
      // fireworks / snowfall — 단순 사각형
      for (const p of this.particles) {
        this.g.fillStyle(p.color, p.alpha);
        this.g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
  }

  destroy(): void {
    this.clear();
    this.g.destroy();
  }
}

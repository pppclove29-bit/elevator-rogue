import Phaser from 'phaser';
import { COLORS } from '../config';
import { ARCHETYPES, PassengerArchetype } from '../domain/archetypes';
import { ANGER_THRESHOLD } from '../domain/simulation';
import { SimState } from '../domain/types';
import { BuildingViewLayout } from './BuildingView';

type Phase = 'entering' | 'queued' | 'boarding' | 'riding' | 'alighting' | 'leaving';

interface Sprite {
  id: number;
  archetype: PassengerArchetype;
  anger: number;
  x: number; y: number;
  targetX: number; targetY: number;
  phase: Phase;
  alpha: number;
  targetAlpha: number;
  done: boolean;
  /** 남은 ms. 0이 되어야 움직임/fade 시작 (stagger 처리) */
  delay: number;
}

const LERP_SPEED = 16;
const FADE_SPEED = 12;
const STAGGER_MS = 90;     // 한 명씩 타고 내리는 간격

function approach(current: number, target: number, maxStep: number): number {
  if (current === target) return current;
  const d = target - current;
  if (Math.abs(d) <= maxStep) return target;
  return current + Math.sign(d) * maxStep;
}

export class PassengerSprites {
  private g: Phaser.GameObjects.Graphics;
  private map: Map<number, Sprite> = new Map();

  constructor(scene: Phaser.Scene, private layout: BuildingViewLayout) {
    this.g = scene.add.graphics();
    this.g.setDepth(3);
  }

  update(state: SimState, deltaMs: number): void {
    this.sync(state);

    const dt = deltaMs / 1000;
    const moveStep = LERP_SPEED * dt;
    const fadeStep = FADE_SPEED * dt;

    for (const s of this.map.values()) {
      if (s.delay > 0) {
        s.delay = Math.max(0, s.delay - deltaMs);
        continue; // 대기 중에는 위치/알파 변화 X
      }
      s.x = approach(s.x, s.targetX, moveStep * 60);
      s.y = approach(s.y, s.targetY, moveStep * 60);
      s.alpha = approach(s.alpha, s.targetAlpha, fadeStep);

      if (s.phase === 'entering' && Math.abs(s.x - s.targetX) < 1 && s.alpha >= 0.95) {
        s.phase = 'queued';
      }
      if (s.phase === 'leaving' && s.alpha <= 0.01) {
        s.done = true;
      }
    }

    // 제거
    for (const [id, s] of this.map) {
      if (s.done) this.map.delete(id);
    }

    this.draw();
  }

  private sync(state: SimState): void {
    const { x, y, totalHeight, shaftSpacing } = this.layout;
    const floors = state.building.floors;
    const elevators = state.building.elevators;
    const floorHeight = totalHeight / floors.length;
    const shaftXStart = x + 80;

    const stillAlive = new Set<number>();

    // 큐 승객 위치
    for (const f of floors) {
      const fy = y + totalHeight - f.id * floorHeight - floorHeight / 2;
      for (let i = 0; i < f.queue.length; i++) {
        const p = f.queue[i]!;
        const targetX = x + 40 + i * 10;
        const targetY = fy;
        stillAlive.add(p.id);
        let s = this.map.get(p.id);
        if (!s) {
          s = {
            id: p.id, archetype: p.archetype, anger: p.anger,
            x: x - 16, y: fy,
            targetX, targetY,
            phase: 'entering',
            alpha: 0, targetAlpha: 1,
            done: false, delay: 0,
          };
          this.map.set(p.id, s);
        } else {
          s.targetX = targetX;
          s.targetY = targetY;
          s.targetAlpha = 1;
          s.anger = p.anger;
          if (s.phase === 'riding' || s.phase === 'alighting') s.phase = 'queued';
        }
      }
    }

    // 엘베 안 승객 위치 — 이번 frame에 boarding으로 전환되는 sprite를 stagger
    for (const e of elevators) {
      const sx = shaftXStart + e.id * shaftSpacing;
      const ey = y + totalHeight - e.y * floorHeight - floorHeight / 2;
      let boardingStaggerIdx = 0;
      for (let i = 0; i < e.passengers.length; i++) {
        const p = e.passengers[i]!;
        const spaceMul = ARCHETYPES[p.archetype].spaceCost > 1 ? 8 : 6;
        const targetX = sx + 6 + i * spaceMul;
        const targetY = ey;
        stillAlive.add(p.id);
        let s = this.map.get(p.id);
        if (!s) {
          s = {
            id: p.id, archetype: p.archetype, anger: p.anger,
            x: targetX, y: targetY, targetX, targetY,
            phase: 'riding', alpha: 1, targetAlpha: 1, done: false, delay: 0,
          };
          this.map.set(p.id, s);
        } else {
          const justBoarding = s.phase === 'queued' || s.phase === 'entering';
          if (justBoarding) {
            s.phase = 'boarding';
            s.delay = boardingStaggerIdx * STAGGER_MS;
            boardingStaggerIdx += 1;
          } else if (s.phase !== 'boarding') {
            s.phase = 'riding';
          }
          s.targetX = targetX;
          s.targetY = targetY;
          s.targetAlpha = 1;
          s.anger = p.anger;
          // boarding이 끝나면 riding으로
          if (s.phase === 'boarding' && Math.abs(s.x - targetX) < 1 && Math.abs(s.y - targetY) < 1 && s.delay === 0) {
            s.phase = 'riding';
          }
        }
      }
    }

    // sim에 없는 sprite → leaving (stagger 적용)
    let leavingStaggerIdx = 0;
    for (const [id, s] of this.map) {
      if (stillAlive.has(id)) continue;
      if (s.phase === 'leaving') continue;
      s.phase = 'leaving';
      s.targetX = s.x - 40;
      s.targetAlpha = 0;
      s.delay = leavingStaggerIdx * STAGGER_MS;
      leavingStaggerIdx += 1;
    }
  }

  private draw(): void {
    this.g.clear();
    for (const s of this.map.values()) {
      const spec = ARCHETYPES[s.archetype];
      const color = s.anger >= ANGER_THRESHOLD * 0.6 ? COLORS.passengerAngry : spec.color;
      this.g.fillStyle(color, s.alpha);
      const r = spec.spaceCost > 1 ? 5 : 4;
      this.g.fillCircle(s.x, s.y, r);
    }
  }
}

import Phaser from 'phaser';
import { COLORS, FONT } from '../config';
import { ARCHETYPES, PassengerArchetype } from '../domain/archetypes';
import { ANGER_THRESHOLD } from '../domain/simulation';
import { ROLE_COLOR } from '../domain/spawner';
import { SimState } from '../domain/types';
import { BuildingViewLayout, DOOR_AREA_W } from './BuildingView';
import { hasSprite } from './sprites';

type Phase = 'entering' | 'queued' | 'boarding' | 'riding' | 'alighting' | 'leaving' | 'escalator' | 'subway';

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
  /** 목적지 층 role 컬러 (머리 위 dot 으로 표시) */
  destColor: number;
}

let HINT_ID_COUNTER = -1000;

// px/sec 단위. entering 100px → 1초, riding 짧은 이동도 충분히 인지 가능.
const LERP_SPEED_PX_PER_SEC = 140;
const FADE_SPEED_PER_SEC = 4;        // 0 → 1 가는 데 0.25초
const STAGGER_MS = 140;              // 한 명씩 타고 내리는 간격 (좀 더 여유)

function approach(current: number, target: number, maxStep: number): number {
  if (current === target) return current;
  const d = target - current;
  if (Math.abs(d) <= maxStep) return target;
  return current + Math.sign(d) * maxStep;
}

export class PassengerSprites {
  private g: Phaser.GameObjects.Graphics;
  private map: Map<number, Sprite> = new Map();
  private scene: Phaser.Scene;
  /** archetype sprite 가 있을 때 사용. id → Image. 미사용 시 setVisible(false). */
  private images: Map<number, Phaser.GameObjects.Image> = new Map();

  constructor(scene: Phaser.Scene, private layout: BuildingViewLayout) {
    this.scene = scene;
    this.g = scene.add.graphics();
    this.g.setDepth(3);
  }

  update(state: SimState, deltaMs: number): void {
    this.consumeHints(state);
    this.sync(state);

    const dt = deltaMs / 1000;
    const moveStep = LERP_SPEED_PX_PER_SEC * dt;
    const fadeStep = FADE_SPEED_PER_SEC * dt;

    for (const s of this.map.values()) {
      if (s.delay > 0) {
        s.delay = Math.max(0, s.delay - deltaMs);
        continue;
      }
      s.x = approach(s.x, s.targetX, moveStep);
      s.y = approach(s.y, s.targetY, moveStep);
      s.alpha = approach(s.alpha, s.targetAlpha, fadeStep);

      if (s.phase === 'entering' && Math.abs(s.x - s.targetX) < 1 && s.alpha >= 0.95) {
        s.phase = 'queued';
      }
      if (s.phase === 'leaving' && s.alpha <= 0.01) s.done = true;
      // escalator/subway 임시 sprite: target 도달 + fade 끝나면 제거
      if ((s.phase === 'escalator' || s.phase === 'subway')
          && Math.abs(s.x - s.targetX) < 1 && Math.abs(s.y - s.targetY) < 1
          && s.alpha <= 0.01) s.done = true;
    }

    // 제거 + image 객체 같이 정리
    for (const [id, s] of this.map) {
      if (s.done) {
        this.map.delete(id);
        const img = this.images.get(id);
        if (img) { img.destroy(); this.images.delete(id); }
      }
    }

    this.draw();
  }

  private sync(state: SimState): void {
    const { x, y, totalHeight, shaftSpacing } = this.layout;
    const floors = state.building.floors;
    const elevators = state.building.elevators;
    const floorHeight = totalHeight / floors.length;
    const shaftXStart = x + 80;

    const destColorFor = (destFloorId: number): number => {
      const f = floors[destFloorId];
      return f ? (ROLE_COLOR[f.role] ?? 0xffffff) : 0xffffff;
    };

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
            x: x - DOOR_AREA_W / 2, y: fy,
            targetX, targetY,
            phase: 'entering',
            alpha: 0, targetAlpha: 1,
            done: false, delay: 0,
            destColor: destColorFor(p.dest),
          };
          this.map.set(p.id, s);
        } else {
          s.targetX = targetX;
          s.targetY = targetY;
          s.targetAlpha = 1;
          s.anger = p.anger;
          s.destColor = destColorFor(p.dest);
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
            destColor: destColorFor(p.dest),
          };
          this.map.set(p.id, s);
        } else {
          s.destColor = destColorFor(p.dest);
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
      if (s.phase === 'leaving' || s.phase === 'escalator' || s.phase === 'subway') continue;
      s.phase = 'leaving';
      // 우측 방 문(층 안쪽 출구)으로 빠짐
      s.targetX = this.layout.x + this.layout.width - 8;
      s.targetAlpha = 0;
      s.delay = leavingStaggerIdx * STAGGER_MS;
      leavingStaggerIdx += 1;
    }
  }

  private consumeHints(state: SimState): void {
    if (state.visualHints.length === 0) return;
    const { x, y, width, totalHeight } = this.layout;
    const floors = state.building.floors;
    const floorHeight = totalHeight / floors.length;
    const stairX = x + width;

    const destColorFor = (destFloorId: number): number => {
      const f = floors[destFloorId];
      return f ? (ROLE_COLOR[f.role] ?? 0xffffff) : 0xffffff;
    };

    for (const h of state.visualHints) {
      if (h.kind === 'pathEvent') {
        const sp = this.map.get(h.passengerId);
        const fy = y + totalHeight - h.floorId * floorHeight - floorHeight / 2;
        const px = sp?.x ?? x + 40;
        const py = (sp?.y ?? fy) - 14;
        this.spawnFloatingText(px, py, h.text, h.color);
        continue;
      }
      if (h.kind === 'escalator') {
        const fyOrigin = y + totalHeight - h.originFloorId * floorHeight - floorHeight / 2;
        const fyDest = y + totalHeight - h.destFloorId * floorHeight - floorHeight / 2;
        const id = HINT_ID_COUNTER--;
        this.map.set(id, {
          id, archetype: h.archetype, anger: 0,
          x: stairX + 18, y: fyOrigin,
          targetX: stairX + 38, targetY: fyDest,
          phase: 'escalator',
          alpha: 1, targetAlpha: 0,
          done: false, delay: 0,
          destColor: destColorFor(h.destFloorId),
        });
      } else if (h.kind === 'subway') {
        const fy = y + totalHeight - h.floorId * floorHeight - floorHeight / 2;
        const id = HINT_ID_COUNTER--;
        this.map.set(id, {
          id, archetype: h.archetype, anger: 0,
          x: x - DOOR_AREA_W / 2, y: fy,
          targetX: x - DOOR_AREA_W - 20, targetY: fy + 10,
          phase: 'subway',
          alpha: 1, targetAlpha: 0,
          done: false, delay: 0,
          destColor: destColorFor(h.floorId),
        });
      }
    }
    state.visualHints.length = 0;
  }

  /** 승객 위에 짧은 텍스트가 떠올랐다 사라지는 효과 (pathEvent용). */
  private spawnFloatingText(x: number, y: number, text: string, color: number): void {
    const hex = '#' + color.toString(16).padStart(6, '0');
    const txt = this.scene.add.text(x, y, text, {
      fontFamily: FONT,
      fontSize: '11px',
      color: hex,
      stroke: '#000000',
      strokeThickness: 2,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(5);
    this.scene.tweens.add({
      targets: txt,
      y: y - 18,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => txt.destroy(),
    });
  }

  private draw(): void {
    this.g.clear();
    for (const s of this.map.values()) {
      const spec = ARCHETYPES[s.archetype];
      const color = s.anger >= ANGER_THRESHOLD * 0.6 ? COLORS.passengerAngry : spec.color;
      const big = spec.spaceCost > 1;
      const w = big ? 6 : 4;
      const h = big ? 8 : 6;

      // archetype 별 sprite 가 있으면 image 로, 없으면 도형 fallback.
      const spriteKey = `passenger-${s.archetype}`;
      const useSprite = hasSprite(this.scene, spriteKey);
      let bodyTopY: number;

      if (useSprite) {
        let img = this.images.get(s.id) ?? null;
        if (!img) {
          img = this.scene.add.image(0, 0, spriteKey).setDepth(3);
          this.images.set(s.id, img);
        }
        img.setTexture(spriteKey);
        img.setPosition(s.x, s.y);
        img.setAlpha(s.alpha);
        // 16×24(또는 baggage 20×28) 권장 — 도형 사이즈와 비슷한 작은 크기로 표시
        const dispW = big ? 12 : 10;
        const dispH = big ? 18 : 14;
        img.setDisplaySize(dispW, dispH);
        img.setTint(s.anger >= ANGER_THRESHOLD * 0.6 ? 0xff5555 : 0xffffff);
        img.setVisible(true);
        bodyTopY = s.y - dispH / 2;
      } else {
        const img = this.images.get(s.id);
        if (img) img.setVisible(false);
        // 도형 fallback (몸 + 머리)
        this.g.fillStyle(color, s.alpha);
        this.g.fillRect(s.x - w / 2, s.y - h / 2, w, h);
        this.g.fillRect(s.x - (w - 2) / 2, s.y - h / 2 - 3, w - 2, 3);
        bodyTopY = s.y - h / 2 - 3;
      }

      // 목적지 dest 색 dot — 몸 위. sprite 사용 여부와 무관하게 항상 표시.
      const dotY = bodyTopY - 3;
      this.g.fillStyle(0x000000, s.alpha * 0.8);
      this.g.fillRect(s.x - 2, dotY - 1, 4, 4);
      this.g.fillStyle(s.destColor, s.alpha);
      this.g.fillRect(s.x - 1, dotY, 2, 2);
    }
  }
}

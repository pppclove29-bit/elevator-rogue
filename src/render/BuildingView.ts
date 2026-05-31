import Phaser from 'phaser';
import { COLORS, FONT } from '../config';
import { spaceUsed } from '../domain/archetypes';
import { ROLE_COLOR, ROLE_KO } from '../domain/spawner';
import { FloorRole, SimState } from '../domain/types';
import { getElevatorScreenY, getFloorCenterY, getFloorHeight, isFocus } from './floorLayout';
import { hasSprite } from './sprites';

export interface BuildingViewLayout {
  x: number;
  y: number;
  width: number;
  /** 빌딩 박스 전체 세로 길이. floorHeight = totalHeight / floorCount (동적) */
  totalHeight: number;
  shaftSpacing: number;
}

/** 좌측 외부 문 영역 (입출구) */
const DOOR_AREA_W = 28;
/** 우측 외부 계단/에스컬레이터 영역 */
const STAIR_AREA_W = 56;

/** 역할 색 — 색상 빠르게 조회 (BuildingView 안에서 호출하기 쉽도록 모듈 함수). */
function roleC_for(role: FloorRole): number {
  return ROLE_COLOR[role] ?? 0x4a90e2;
}

/** 평판 단계 — 외관 변화 트리거. */
export type ReputationTier = 'topNeon' | 'great' | 'normal' | 'shabby' | 'derelict';
function reputationTier(rep: number): ReputationTier {
  if (rep >= 90) return 'topNeon';
  if (rep >= 70) return 'great';
  if (rep >= 30) return 'normal';
  if (rep >= 10) return 'shabby';
  return 'derelict';
}

export class BuildingView {
  private g: Phaser.GameObjects.Graphics;
  private statText: Phaser.GameObjects.Text;
  private stairLabel: Phaser.GameObjects.Text;
  /** draw 호출 시 임시 보관 — ensureLabels 등 다른 메서드에서 floorY 계산용. */
  private currentFocus: number = 0;
  /** 평판 단계 — drawFocusFloor 가 외관 변화에 사용. */
  private reputationTier: ReputationTier = 'normal';
  private floorLabels: Phaser.GameObjects.Text[] = [];
  private queueLabels: Phaser.GameObjects.Text[] = [];
  private elevatorLabels: Phaser.GameObjects.Text[] = [];
  /** elevator-cab sprite 가 있을 때만 사용. 인덱스 = elevator.id */
  private elevatorImages: (Phaser.GameObjects.Image | null)[] = [];
  /** floor-<role> sprite 가 있을 때 라벨 왼쪽에 표시. 인덱스 = floor.id */
  private floorIcons: Phaser.GameObjects.Image[] = [];

  constructor(
    private scene: Phaser.Scene,
    private layout: BuildingViewLayout,
  ) {
    this.g = scene.add.graphics();
    this.statText = scene.add.text(layout.x, layout.y - 28, '', {
      fontFamily: FONT, fontSize: '14px', color: COLORS.textDim,
    });
    this.stairLabel = scene.add.text(layout.x + layout.width + STAIR_AREA_W / 2, layout.y - 28, '계단', {
      fontFamily: FONT, fontSize: '11px', color: COLORS.textDim,
    }).setOrigin(0.5, 0);
  }

  draw(state: SimState, focusY: number = 0): void {
    this.currentFocus = focusY;
    const { x, y, width, totalHeight, shaftSpacing } = this.layout;
    const floors = state.building.floors;
    const elevators = state.building.elevators;
    // 평판 단계 — drawFocusFloor 에서 외관에 사용 (네온/어둠/균열 등)
    this.reputationTier = reputationTier(state.reputation ?? 50);
    // 헬퍼로 각 층 시각적 위치/높이 계산
    const floorY = (id: number) => getFloorCenterY(y, totalHeight, focusY, id, floors.length);
    const floorH = (id: number) => getFloorHeight(focusY, id, totalHeight, floors.length);
    const shaftXStart = x + 80;
    const floorCap = state.params.floorCapacity;
    const stairX = x + width;
    const stairCenterX = stairX + STAIR_AREA_W / 2;
    const hasEscalator = state.params.escalatorReach > 0;
    const reach = state.params.escalatorReach;

    this.ensureLabels(state);
    this.g.clear();

    // ── 빌딩 본체 ──
    this.g.fillStyle(0x14141c, 1);
    this.g.fillRect(x, y, width, totalHeight);

    // 외벽 픽셀 패턴 (창문 도트)
    this.g.fillStyle(COLORS.wallPattern, 1);
    for (let r = 0; r < Math.floor(totalHeight / 6); r++) {
      for (let c = 0; c < Math.floor(width / 6); c++) {
        if (((r * 7 + c * 3) % 11) === 0) this.g.fillRect(x + c * 6, y + r * 6, 2, 2);
      }
    }

    this.g.lineStyle(2, COLORS.floorLine, 1);
    this.g.strokeRect(x, y, width, totalHeight);
    // 층 구분선 — 각 floor 의 top 위치에 그림
    for (let i = 0; i < floors.length; i++) {
      const fy = floorY(i);
      const fH = floorH(i);
      const ly = fy + fH / 2;
      this.g.lineStyle(1, COLORS.floorLine, 1);
      this.g.lineBetween(x, ly, x + width, ly);
    }

    // 엘베 샤프트 (cab 폭 70 기준 중심에 라인)
    for (let i = 0; i < elevators.length; i++) {
      const sx = shaftXStart + i * shaftSpacing;
      this.g.lineStyle(1, 0x222230, 1);
      this.g.lineBetween(sx + 35, y, sx + 35, y + totalHeight);
    }

    // ── 좌측 문 영역 ──
    this.g.fillStyle(0x0e0e14, 1);
    this.g.fillRect(x - DOOR_AREA_W, y, DOOR_AREA_W, totalHeight);

    // ── 우측 계단 영역 ──
    this.g.fillStyle(0x0e0e14, 1);
    this.g.fillRect(stairX, y, STAIR_AREA_W, totalHeight);
    this.g.lineStyle(1, 0x222230, 1);
    this.g.strokeRect(stairX, y, STAIR_AREA_W, totalHeight);

    // 각 층 처리 — 포커스 층은 풀 디테일(천장+벽+복도+장식), 미리보기는 단순 띠
    for (const floor of floors) {
      const fy = floorY(floor.id);
      const fH = floorH(floor.id);
      const isFull = floor.queue.length >= floorCap;
      const floorTop = fy - fH / 2;
      const floorBottom = fy + fH / 2;
      const focusThis = isFocus(focusY, floor.id);

      if (focusThis) {
        this.drawFocusFloor(floor, x, width, floorTop, floorBottom, fH, isFull, floorCap);
      } else {
        this.drawPreviewFloor(floor, x, width, floorTop, floorBottom, fH, isFull, floorCap);
      }

      // 우측 계단 — 지그재그 픽셀
      const reachableFromHere = hasEscalator && floor.id < floors.length - 1 && (floors.length - 1 - floor.id <= reach);
      const stairColor = hasEscalator ? COLORS.escalator : COLORS.stairLine;
      this.g.lineStyle(2, stairColor, hasEscalator ? 0.9 : 0.5);
      // 한 층 내에 지그재그
      const steps = 4;
      const stepW = (STAIR_AREA_W - 12) / steps;
      const stepH = fH / steps;
      for (let s = 0; s < steps; s++) {
        const sx0 = stairX + 6 + s * stepW;
        const sy0 = floorBottom - s * stepH;
        const sx1 = stairX + 6 + (s + 1) * stepW;
        const sy1 = sy0 - stepH;
        this.g.lineBetween(sx0, sy0, sx1, sy0);
        this.g.lineBetween(sx1, sy0, sx1, sy1);
      }
      // 에스컬레이터일 때 위로 화살표
      if (reachableFromHere) {
        this.g.fillStyle(COLORS.escalator, 1);
        const ax = stairCenterX, ay = floorTop + 6;
        this.g.fillTriangle(ax - 4, ay + 4, ax + 4, ay + 4, ax, ay);
      }

      // 큐 길이 라벨 (방 문 왼쪽에)
      const qLabel = this.queueLabels[floor.id]!;
      qLabel.setPosition(x + width - 24, fy);
      qLabel.setText(`${floor.queue.length}/${floorCap}`);
      qLabel.setColor(isFull ? '#e74c3c' : COLORS.textDim);
    }

    // 계단/에스컬레이터 영역 라벨 (상단)
    this.stairLabel.setText(hasEscalator ? `에스컬레이터 ±${reach}` : '계단');
    this.stairLabel.setColor(hasEscalator ? '#7ed957' : COLORS.textDim);
    this.stairLabel.setPosition(stairCenterX, y - 16);

    // ── 엘리베이터 ──
    while (this.elevatorLabels.length < elevators.length) {
      this.elevatorLabels.push(this.scene.add.text(0, 0, '', {
        fontFamily: FONT, fontSize: '10px', color: COLORS.text,
      }).setOrigin(0.5, 0).setDepth(2));
    }
    for (let i = elevators.length; i < this.elevatorLabels.length; i++) {
      this.elevatorLabels[i]!.setVisible(false);
    }

    // elevator-cab sprite 가 로드되어 있으면 image 로, 없으면 도형 fallback.
    const cabSprite = hasSprite(this.scene, 'elevator-cab');
    const brokenSprite = hasSprite(this.scene, 'elevator-cab-broken');

    for (let i = 0; i < elevators.length; i++) {
      const e = elevators[i]!;
      const sx = shaftXStart + e.id * shaftSpacing;
      const ey = getElevatorScreenY(y, totalHeight, focusY, e.y, floors.length);
      const isBroken = e.state.kind === 'broken';

      // 엘베 cab — 가까운 층 높이 기준으로 cap.
      const cabW = 70;
      const nearestFloorId = Math.max(0, Math.min(floors.length - 1, Math.round(e.y)));
      const cabH = Math.min(floorH(nearestFloorId) - 12, 120);
      if (cabSprite) {
        let img = this.elevatorImages[e.id] ?? null;
        if (!img) {
          img = this.scene.add.image(0, 0, 'elevator-cab').setDepth(2);
          this.elevatorImages[e.id] = img;
        }
        const key = isBroken && brokenSprite ? 'elevator-cab-broken' : 'elevator-cab';
        img.setTexture(key);
        img.setPosition(sx + cabW / 2, ey);
        img.setDisplaySize(cabW, cabH);
        img.setVisible(true);
        img.setTint(isBroken && !brokenSprite ? 0xff7777 : 0xffffff);
      } else {
        if (this.elevatorImages[e.id]) this.elevatorImages[e.id]!.setVisible(false);
        // 픽셀 엘베 박스 + 디테일 (도형 fallback)
        this.g.fillStyle(isBroken ? 0x4a4a55 : COLORS.elevator, 1);
        this.g.fillRect(sx, ey - cabH / 2, cabW, cabH);
        this.g.fillStyle(0x000000, 0.25);
        this.g.fillRect(sx + 3, ey - cabH / 2 + 3, cabW - 6, 5);
        this.g.lineStyle(1, 0x000000, 0.4);
        this.g.lineBetween(sx + cabW / 2, ey - cabH / 2, sx + cabW / 2, ey + cabH / 2);
        if (isBroken) {
          this.g.lineStyle(2, 0xe74c3c, 1);
          this.g.strokeRect(sx - 1, ey - cabH / 2 - 1, cabW + 2, cabH + 2);
        }
      }

      const used = spaceUsed(e.passengers);
      const label = this.elevatorLabels[i]!;
      label.setPosition(sx + 35, y - 16);
      label.setText(isBroken ? `E${e.id + 1} BROKEN` : `E${e.id + 1}  ${used}/${e.capacity}`);
      label.setColor(isBroken ? '#e74c3c' : (used >= e.capacity ? '#f5c542' : COLORS.text));
      label.setVisible(true);
    }

    // statText 는 HUD 버튼(좌상단)과 겹쳐서 숨김. 처리/불만처리 카운트는 게임오버 결산에서 확인.
    this.statText.setVisible(false);
  }

  /**
   * 포커스 층 — 1점 투시 원근감 복도.
   *
   * 구조 (앞 → 뒤):
   *   - 화면 앞 (관찰자 쪽): 풀 너비
   *   - 뒤쪽 (백벽): 좁아짐 (vanishing point 중앙)
   *   - 천장/바닥/좌우 벽이 vanishing point 로 수렴
   */
  private drawFocusFloor(floor: { role: FloorRole; queue: any[] }, x: number, width: number, floorTop: number, floorBottom: number, fH: number, isFull: boolean, _floorCap: number): void {
    const roleC = roleC_for(floor.role);

    // 투시 파라미터
    const VP_X = x + width / 2;                     // vanishing point X (중앙)
    const VP_Y = floorTop + fH * 0.45;              // VP Y (살짝 위쪽 — 카메라 약간 내려다 봄)
    const backW = width * 0.45;                     // 백벽 폭 (앞 width 대비)
    const backH = fH * 0.55;                        // 백벽 높이
    const backX = VP_X - backW / 2;
    const backY = VP_Y - backH / 2;

    const corridorBandH = Math.min(48, fH * 0.18);  // 앞쪽 바닥 두께 (시각적)
    const ceilingBandH = Math.min(36, fH * 0.14);

    // ── 1) 백벽 (배경) ──
    // 그라데이션 (위 어두움 → 아래 약간 밝음)
    const bands = 10;
    for (let b = 0; b < bands; b++) {
      const t = b / (bands - 1);
      const a = 0.5 - t * 0.15;
      this.g.fillStyle(0x14141c, a);
      this.g.fillRect(backX, backY + b * (backH / bands), backW, backH / bands + 1);
    }
    // 백벽 메인 톤
    this.g.fillStyle(0x1a1a24, 1);
    this.g.fillRect(backX, backY, backW, backH);
    // 백벽 액자 — role 색
    const frameW = backW * 0.4, frameH = backH * 0.3;
    this.g.fillStyle(0x2a2a35, 1);
    this.g.fillRect(VP_X - frameW / 2 - 2, backY + 6 - 2, frameW + 4, frameH + 4);
    this.g.fillStyle(roleC, 0.6);
    this.g.fillRect(VP_X - frameW / 2, backY + 6, frameW, frameH);
    // 백벽 도트
    this.g.fillStyle(0xffffff, 0.04);
    for (let py = backY + 4; py < backY + backH - 4; py += 8) {
      for (let px = backX + 4; px < backX + backW - 4; px += 10) {
        if (((py + px) >> 1) % 3 === 0) this.g.fillRect(px, py, 1, 1);
      }
    }
    // 백벽 외곽선 (입체감)
    this.g.lineStyle(1, 0x3a3a48, 1);
    this.g.strokeRect(backX, backY, backW, backH);

    // ── 2) 천장 (사다리꼴) — 앞에서 뒤로 수렴 ──
    // 화면 앞 모서리: (x+1, floorTop+1) ~ (x+w-1, floorTop+1) — 가로 width
    // 백벽 위 모서리: (backX, backY) ~ (backX+backW, backY)
    this.g.fillStyle(0x05050a, 1);
    this.g.beginPath();
    this.g.moveTo(x + 1, floorTop + 1);
    this.g.lineTo(x + width - 1, floorTop + 1);
    this.g.lineTo(backX + backW, backY);
    this.g.lineTo(backX, backY);
    this.g.closePath();
    this.g.fillPath();
    // 천장 그라데이션 — 앞 밝음, 뒤 어두움 (등 빛 받음)
    for (let i = 0; i < 5; i++) {
      const t = i / 5;
      const topY = floorTop + 1 + t * (backY - floorTop);
      const leftX = x + 1 + t * (backX - x - 1);
      const rightX = x + width - 1 - t * (x + width - 1 - (backX + backW));
      this.g.fillStyle(0xfff0a0, 0.03 * (1 - t));
      this.g.beginPath();
      this.g.moveTo(leftX, topY);
      this.g.lineTo(rightX, topY);
      this.g.lineTo(rightX - (rightX - VP_X) / 5, topY + ceilingBandH / 5);
      this.g.lineTo(leftX + (VP_X - leftX) / 5, topY + ceilingBandH / 5);
      this.g.closePath();
      this.g.fillPath();
    }
    // 천장 등 3개 (vanishing point 방향)
    for (const lp of [0.25, 0.5, 0.75]) {
      const fx = x + width * lp;
      const bx = backX + backW * lp;
      // 등 위치 — 천장 중간쯤
      const ly = (floorTop + 1 + backY) / 2;
      const lx = fx + (bx - fx) * 0.5;
      this.g.fillStyle(0xfff0a0, 0.9);
      this.g.fillCircle(lx, ly, 3);
      this.g.fillStyle(0xfff0a0, 0.3);
      this.g.fillCircle(lx, ly, 6);
    }

    // ── 3) 좌측 벽 (사다리꼴) ──
    this.g.fillStyle(0x10101a, 1);
    this.g.beginPath();
    this.g.moveTo(x + 1, floorTop + 1);
    this.g.lineTo(backX, backY);
    this.g.lineTo(backX, backY + backH);
    this.g.lineTo(x + 1, floorBottom - 1);
    this.g.closePath();
    this.g.fillPath();
    // 좌측 벽 디테일 — 수평 라인 (걸레받이/스트라이프)
    this.g.lineStyle(1, 0x2a2a35, 0.6);
    for (let t = 0.2; t <= 0.8; t += 0.3) {
      const fy1 = floorTop + 1 + (floorBottom - 1 - (floorTop + 1)) * t;
      const by1 = backY + backH * t;
      this.g.lineBetween(x + 1, fy1, backX, by1);
    }

    // ── 4) 우측 벽 ──
    this.g.fillStyle(0x10101a, 1);
    this.g.beginPath();
    this.g.moveTo(x + width - 1, floorTop + 1);
    this.g.lineTo(backX + backW, backY);
    this.g.lineTo(backX + backW, backY + backH);
    this.g.lineTo(x + width - 1, floorBottom - 1);
    this.g.closePath();
    this.g.fillPath();
    this.g.lineStyle(1, 0x2a2a35, 0.6);
    for (let t = 0.2; t <= 0.8; t += 0.3) {
      const fy1 = floorTop + 1 + (floorBottom - 1 - (floorTop + 1)) * t;
      const by1 = backY + backH * t;
      this.g.lineBetween(x + width - 1, fy1, backX + backW, by1);
    }

    // ── 5) 복도 바닥 (사다리꼴) ──
    this.g.fillStyle(0x252530, 1);
    this.g.beginPath();
    this.g.moveTo(x + 1, floorBottom - 1);
    this.g.lineTo(x + width - 1, floorBottom - 1);
    this.g.lineTo(backX + backW, backY + backH);
    this.g.lineTo(backX, backY + backH);
    this.g.closePath();
    this.g.fillPath();
    // 바닥 타일 라인 — vanishing point 로 수렴 (강력한 원근감)
    this.g.lineStyle(1, 0x3a3a48, 0.7);
    for (let tx = -3; tx <= 3; tx++) {
      const frontX = x + width / 2 + tx * (width / 12);
      this.g.lineBetween(frontX, floorBottom - 1, VP_X, VP_Y);
    }
    // 가로 바닥 라인 — 일정 간격 (앞은 멀고 뒤는 가까움)
    for (let t = 0.15; t <= 0.95; t += 0.15) {
      const tEase = Math.pow(t, 1.6);  // 뒤로 갈수록 가까워짐 (perspective)
      const leftX = x + 1 + (backX - (x + 1)) * tEase;
      const rightX = x + width - 1 - (x + width - 1 - (backX + backW)) * tEase;
      const yLine = floorBottom - 1 + (backY + backH - (floorBottom - 1)) * tEase;
      this.g.lineStyle(1, 0x3a3a48, 0.4 - tEase * 0.2);
      this.g.lineBetween(leftX, yLine, rightX, yLine);
    }

    // ── 6) 앞 모서리 (바닥 ↔ 카메라 경계) — 밝은 라인 ──
    this.g.fillStyle(0xd0d0e0, 0.8);
    this.g.fillRect(x + 1, floorBottom - 2, width - 2, 1);
    this.g.fillStyle(0x000000, 0.7);
    this.g.fillRect(x + 1, floorBottom - 1, width - 2, 2);

    // ── 7) 엘베 대기 영역 힌트 (앞쪽 바닥) ──
    this.g.fillStyle(roleC, 0.10);
    this.g.fillRect(x + 4, floorBottom - corridorBandH, 220, corridorBandH - 4);

    // ── 8) 쓰레기통 (앞쪽 우측 코너 — 카메라 가까이) ──
    const trashX = x + width - 60, trashY = floorBottom - 28;
    this.g.fillStyle(0x4a4a55, 1);
    this.g.fillRect(trashX, trashY, 14, 22);
    this.g.fillStyle(0x6a6a78, 1);
    this.g.fillRect(trashX, trashY, 14, 4);
    this.g.fillStyle(0x2a2a35, 0.6);
    this.g.fillRect(trashX + 3, trashY + 7, 8, 12);

    // ── 9) 가득 찬 floor 경고 오버레이 ──
    if (isFull) {
      this.g.fillStyle(0xe74c3c, 0.15);
      this.g.fillRect(x + 1, floorTop + 1, width - 2, fH - 2);
    }

    // ── 10) 평판별 외관 변화 ──
    const tier = this.reputationTier;
    if (tier === 'topNeon') {
      // 평판 90+: 백벽에 네온 사인 (펄스는 정적 — frame 별 동일)
      this.g.fillStyle(0xff9ed8, 0.4);
      this.g.fillRect(VP_X - frameW / 2 - 4, backY + 4, frameW + 8, 2);   // 위
      this.g.fillRect(VP_X - frameW / 2 - 4, backY + frameH + 4, frameW + 8, 2); // 아래
      this.g.fillStyle(0xffd700, 0.6);
      this.g.fillCircle(VP_X, backY + 2, 3);
    } else if (tier === 'great') {
      // 평판 70+: 백벽 액자에 환한 색 추가
      this.g.fillStyle(0xfff0a0, 0.2);
      this.g.fillRect(VP_X - frameW / 2, backY + 6, frameW, frameH);
    } else if (tier === 'shabby') {
      // 평판 < 30: 천장 등 일부 꺼짐 + 백벽 어두움
      this.g.fillStyle(0x000000, 0.3);
      this.g.fillRect(x + 1, floorTop + 1, width - 2, fH - 2);
      // 깜빡이는 듯한 어두운 패치
      this.g.fillStyle(0x000000, 0.4);
      this.g.fillRect(x + width * 0.3, floorTop + 2, 30, 3);  // 등 하나 꺼짐
    } else if (tier === 'derelict') {
      // 평판 < 10: 외관 균열/낙서
      this.g.fillStyle(0x000000, 0.55);
      this.g.fillRect(x + 1, floorTop + 1, width - 2, fH - 2);
      // 균열 (지그재그 라인)
      this.g.lineStyle(1, 0x000000, 0.8);
      this.g.beginPath();
      this.g.moveTo(backX + 4, backY + 6);
      this.g.lineTo(backX + 24, backY + 18);
      this.g.lineTo(backX + 12, backY + 32);
      this.g.lineTo(backX + 32, backY + 44);
      this.g.strokePath();
      // 낙서 — 빨간 X 자국
      this.g.lineStyle(2, 0xe74c3c, 0.5);
      this.g.lineBetween(backX + backW - 30, backY + 10, backX + backW - 10, backY + 30);
      this.g.lineBetween(backX + backW - 10, backY + 10, backX + backW - 30, backY + 30);
    }
  }

  /** 미리보기 층 — 단순 띠: role 색 배경 + 라벨은 외부 (floorLabels) + 가운데 줄. */
  private drawPreviewFloor(floor: { role: FloorRole; queue: any[] }, x: number, width: number, floorTop: number, floorBottom: number, fH: number, isFull: boolean, floorCap: number): void {
    const roleC = roleC_for(floor.role);
    // 배경 — role 색 어둡게
    this.g.fillStyle(roleC, 0.10);
    this.g.fillRect(x + 1, floorTop + 1, width - 2, fH - 2);
    // 상/하 라인
    this.g.fillStyle(0x2a2a35, 1);
    this.g.fillRect(x + 1, floorTop, width - 2, 1);
    this.g.fillRect(x + 1, floorBottom - 1, width - 2, 1);
    // 큐 길이 표시 — 작은 dots 우측
    const dotCount = Math.min(floor.queue.length, 10);
    const dotsX = x + width - 80;
    for (let i = 0; i < dotCount; i++) {
      this.g.fillStyle(0xffffff, 0.7);
      this.g.fillRect(dotsX - i * 5, floorBottom - 8, 3, 3);
    }
    if (isFull) {
      this.g.fillStyle(0xe74c3c, 0.25);
      this.g.fillRect(x + 1, floorTop + 1, width - 2, fH - 2);
    }
    // 가득 임박 (>=80%) — 노란 띠
    else if (floor.queue.length >= floorCap * 0.8) {
      this.g.fillStyle(0xf5c542, 0.15);
      this.g.fillRect(x + 1, floorTop + 1, width - 2, fH - 2);
    }
  }

  /** 픽셀 출입문 — 프레임 + 패널 + 손잡이 + 위쪽 작은 표시등. (현재 미사용 — 원근감 뷰로 전환) */
  // @ts-expect-error 보관용 — 추후 원근감 호환 문 디자인에 재사용
  private drawDoor(dx: number, dy: number, dw: number, dh: number, frame: number, panel: number): void {
    this.g.fillStyle(frame, 1);
    this.g.fillRect(dx - 2, dy - 2, dw + 4, dh + 4);
    this.g.fillStyle(panel, 1);
    this.g.fillRect(dx, dy, dw, dh);
    // 손잡이
    this.g.fillStyle(0xc0a040, 1);
    this.g.fillRect(dx + dw - 4, dy + dh / 2 - 1, 2, 2);
    // 윗쪽 작은 LED
    this.g.fillStyle(0x7ed957, 0.6);
    this.g.fillRect(dx + dw / 2 - 1, dy - 4, 2, 2);
  }

  private ensureLabels(state: SimState): void {
    const { x, y, totalHeight } = this.layout;
    const floors = state.building.floors;
    const floorHeight = totalHeight / floors.length;

    while (this.floorLabels.length < floors.length) {
      const fl = this.scene.add
        .text(x + 8, 0, '', { fontFamily: FONT, fontSize: '12px', color: COLORS.textDim })
        .setOrigin(0, 0.5).setDepth(6);
      this.floorLabels.push(fl);
      const ql = this.scene.add
        .text(0, 0, '', { fontFamily: FONT, fontSize: '11px', color: COLORS.textDim })
        .setOrigin(1, 0.5).setDepth(6);
      this.queueLabels.push(ql);
      // floor role 아이콘 (선택). 없으면 setVisible(false).
      const fi = this.scene.add.image(0, 0, '__missing__')
        .setOrigin(0.5).setDepth(6).setVisible(false);
      this.floorIcons.push(fi);
    }

    for (let i = 0; i < floors.length; i++) {
      const fy = getFloorCenterY(y, totalHeight, this.currentFocus, i, floors.length);
      const floor = floors[i]!;
      const fl = this.floorLabels[i]!;
      const fi = this.floorIcons[i]!;
      // floor-<role> sprite 가 있으면 라벨 왼쪽에 16x16 아이콘, 텍스트 우측으로.
      const iconKey = `floor-${floor.role}`;
      if (hasSprite(this.scene, iconKey)) {
        fi.setTexture(iconKey);
        fi.setDisplaySize(14, 14);
        fi.setPosition(x + 14, fy);
        fi.setVisible(true);
        fl.setPosition(x + 26, fy);
      } else {
        fi.setVisible(false);
        fl.setPosition(x + 8, fy);
      }
      const roleColorHex = '#' + ROLE_COLOR[floor.role].toString(16).padStart(6, '0');
      const label = `${i + 1}층 ${ROLE_KO[floor.role]}`;
      fl.setText(label);
      fl.setColor(roleColorHex);
      fl.setVisible(true);

      // ── 청결도 표시 = 빌딩 좌측 외부 쓰레기통 + 세로 채움 게이지 (화장실 있는 층만) ──
      if (floor.hasToilet) {
        const tw = 10;            // 통 가로
        const th = Math.min(20, floorHeight - 6); // 통 세로 (층 안 들어가게)
        const tx = x - DOOR_AREA_W - tw - 4;       // 좌측 문 영역 바깥
        const ty = fy - th / 2;
        // 뚜껑 (위 가로 바)
        this.g.fillStyle(0x5a5a68, 1);
        this.g.fillRect(tx - 1, ty - 2, tw + 2, 2);
        // 통 외곽
        this.g.fillStyle(0x14141c, 1);
        this.g.fillRect(tx, ty, tw, th);
        this.g.lineStyle(1, 0x5a5a68, 1);
        this.g.strokeRect(tx + 0.5, ty + 0.5, tw - 1, th - 1);
        // 게이지 — 청결도 ↓ = 통 채워짐 ↑
        const dirtyRatio = 1 - Math.max(0, Math.min(1, floor.cleanliness / 100));
        const fillH = Math.max(0, Math.floor((th - 2) * dirtyRatio));
        const fillColor = dirtyRatio > 0.7 ? 0xe74c3c    // 가득 = 빨강 (위험)
          : dirtyRatio > 0.4 ? 0xf5c542
          : dirtyRatio > 0 ? 0x7ed957
          : 0x2a3d2a;                                      // 빈통 = 어두운 녹
        this.g.fillStyle(fillColor, 1);
        this.g.fillRect(tx + 1, ty + th - 1 - fillH, tw - 2, fillH);
        // 매우 더러우면 통 옆에 ! 표시 (텍스트는 생성 비용 ↑ — 도형으로 ! 모양)
        if (dirtyRatio > 0.7) {
          this.g.fillStyle(0xe74c3c, 1);
          // ! 점 + 막대
          this.g.fillRect(tx - 4, ty + 2, 1, th - 8);
          this.g.fillRect(tx - 4, ty + th - 4, 1, 1);
        }
      }
    }
    for (let i = floors.length; i < this.floorLabels.length; i++) {
      this.floorLabels[i]!.setVisible(false);
      this.queueLabels[i]!.setVisible(false);
      this.floorIcons[i]?.setVisible(false);
    }
  }
}

export { DOOR_AREA_W, STAIR_AREA_W };

import Phaser from 'phaser';
import { COLORS, FONT } from '../config';
import { spaceUsed } from '../domain/archetypes';
import { ROLE_COLOR, ROLE_KO } from '../domain/spawner';
import { SimState } from '../domain/types';
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

export class BuildingView {
  private g: Phaser.GameObjects.Graphics;
  private statText: Phaser.GameObjects.Text;
  private stairLabel: Phaser.GameObjects.Text;
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

  draw(state: SimState): void {
    const { x, y, width, totalHeight, shaftSpacing } = this.layout;
    const floors = state.building.floors;
    const elevators = state.building.elevators;
    const floorHeight = totalHeight / floors.length;
    const shaftXStart = x + 80;
    const floorCap = state.params.floorCapacity;
    const stairX = x + width;             // 계단 영역 시작
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
    for (let i = 0; i <= floors.length; i++) {
      const ly = y + totalHeight - i * floorHeight;
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

    // 각 층 처리
    for (const floor of floors) {
      const fy = y + totalHeight - floor.id * floorHeight - floorHeight / 2;
      const isFull = floor.queue.length >= floorCap;
      const floorTop = fy - floorHeight / 2;
      const floorBottom = fy + floorHeight / 2;

      if (isFull) {
        this.g.fillStyle(0xe74c3c, 0.15);
        this.g.fillRect(x + 1, fy - floorHeight / 2 + 1, width - 2, floorHeight - 2);
      }

      // 좌측 문 — 픽셀 사각형
      const doorW = 16, doorH = Math.min(28, floorHeight - 8);
      const doorX = x - DOOR_AREA_W + (DOOR_AREA_W - doorW) / 2;
      const doorY = fy - doorH / 2;
      this.g.fillStyle(COLORS.doorFrame, 1);
      this.g.fillRect(doorX - 2, doorY - 2, doorW + 4, doorH + 4);
      this.g.fillStyle(COLORS.doorPanel, 1);
      this.g.fillRect(doorX, doorY, doorW, doorH);
      // 손잡이 (작은 도트)
      this.g.fillStyle(0xc0a040, 1);
      this.g.fillRect(doorX + doorW - 4, doorY + doorH / 2 - 1, 2, 2);

      // 우측 방 문 (그 층의 사무실/식당 등 내부 입구) — 큐 라벨 옆
      const roomDoorW = 12, roomDoorH = Math.min(22, floorHeight - 10);
      const roomDoorX = x + width - roomDoorW - 4;
      const roomDoorY = fy - roomDoorH / 2;
      const roleC = ROLE_COLOR[floor.role];
      this.g.fillStyle(0x2a2a35, 1);
      this.g.fillRect(roomDoorX - 1, roomDoorY - 1, roomDoorW + 2, roomDoorH + 2);
      this.g.fillStyle(roleC, 0.7);
      this.g.fillRect(roomDoorX, roomDoorY, roomDoorW, roomDoorH);
      this.g.fillStyle(0x000000, 0.4);
      this.g.fillRect(roomDoorX + roomDoorW - 3, roomDoorY + roomDoorH / 2 - 1, 1, 2);

      // 우측 계단 — 지그재그 픽셀
      const reachableFromHere = hasEscalator && floor.id < floors.length - 1 && (floors.length - 1 - floor.id <= reach);
      const stairColor = hasEscalator ? COLORS.escalator : COLORS.stairLine;
      this.g.lineStyle(2, stairColor, hasEscalator ? 0.9 : 0.5);
      // 한 층 내에 지그재그
      const steps = 4;
      const stepW = (STAIR_AREA_W - 12) / steps;
      const stepH = floorHeight / steps;
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
      const ey = y + totalHeight - e.y * floorHeight - floorHeight / 2;
      const isBroken = e.state.kind === 'broken';

      // 엘베 cab — 폭 70, 높이는 floorHeight 의 ~80% (최대 84) 로 캡. 너무 길쭉한 직사각형 방지.
      const cabW = 70;
      const cabH = Math.min(floorHeight - 12, 84);
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
      const fy = y + totalHeight - i * floorHeight - floorHeight / 2;
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

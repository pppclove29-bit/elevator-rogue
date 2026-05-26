import Phaser from 'phaser';
import { COLORS } from '../config';
import { spaceUsed } from '../domain/archetypes';
import { ROLE_COLOR, ROLE_SHORT } from '../domain/spawner';
import { SimState } from '../domain/types';

export interface BuildingViewLayout {
  x: number;
  y: number;
  width: number;
  /** 빌딩 박스 전체 세로 길이. floorHeight = totalHeight / floorCount (동적) */
  totalHeight: number;
  shaftSpacing: number;
}

export class BuildingView {
  private g: Phaser.GameObjects.Graphics;
  private statText: Phaser.GameObjects.Text;
  private floorLabels: Phaser.GameObjects.Text[] = [];
  private queueLabels: Phaser.GameObjects.Text[] = [];
  private elevatorLabels: Phaser.GameObjects.Text[] = [];

  constructor(
    private scene: Phaser.Scene,
    private layout: BuildingViewLayout,
  ) {
    this.g = scene.add.graphics();
    this.statText = scene.add.text(layout.x, layout.y - 28, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: COLORS.textDim,
    });
  }

  draw(state: SimState): void {
    const { x, y, width, totalHeight, shaftSpacing } = this.layout;
    const floors = state.building.floors;
    const elevators = state.building.elevators;
    const floorHeight = totalHeight / floors.length;
    const shaftXStart = x + 80;
    const floorCap = state.params.floorCapacity;

    this.ensureLabels(state);
    this.g.clear();

    this.g.fillStyle(0x14141c, 1);
    this.g.fillRect(x, y, width, totalHeight);
    this.g.lineStyle(1, COLORS.floorLine, 1);
    this.g.strokeRect(x, y, width, totalHeight);
    for (let i = 0; i <= floors.length; i++) {
      const ly = y + totalHeight - i * floorHeight;
      this.g.lineBetween(x, ly, x + width, ly);
    }

    for (let i = 0; i < elevators.length; i++) {
      const sx = shaftXStart + i * shaftSpacing;
      this.g.lineStyle(1, 0x222230, 1);
      this.g.lineBetween(sx + 18, y, sx + 18, y + totalHeight);
    }

    for (const floor of floors) {
      const fy = y + totalHeight - floor.id * floorHeight - floorHeight / 2;
      const isFull = floor.queue.length >= floorCap;

      if (isFull) {
        this.g.fillStyle(0xe74c3c, 0.15);
        this.g.fillRect(x + 1, fy - floorHeight / 2 + 1, width - 2, floorHeight - 2);
      }

      // 입구 표시 (좌측 끝에 작은 화살표)
      this.g.fillStyle(0x4a4a55, 0.6);
      this.g.fillTriangle(x - 6, fy - 4, x - 6, fy + 4, x, fy);

      const qLabel = this.queueLabels[floor.id]!;
      qLabel.setPosition(x + width - 8, fy);
      qLabel.setText(`${floor.queue.length}/${floorCap}`);
      qLabel.setColor(isFull ? '#e74c3c' : COLORS.textDim);
    }

    while (this.elevatorLabels.length < elevators.length) {
      this.elevatorLabels.push(this.scene.add.text(0, 0, '', {
        fontFamily: 'system-ui, sans-serif', fontSize: '10px', color: COLORS.text,
      }).setOrigin(0.5, 0).setDepth(2));
    }
    for (let i = elevators.length; i < this.elevatorLabels.length; i++) {
      this.elevatorLabels[i]!.setVisible(false);
    }

    for (let i = 0; i < elevators.length; i++) {
      const e = elevators[i]!;
      const sx = shaftXStart + e.id * shaftSpacing;
      const ey = y + totalHeight - e.y * floorHeight - floorHeight / 2;
      const isBroken = e.state.kind === 'broken';
      this.g.fillStyle(isBroken ? 0x4a4a55 : COLORS.elevator, 1);
      this.g.fillRect(sx, ey - floorHeight / 2 + 4, 36, floorHeight - 8);
      if (isBroken) {
        this.g.lineStyle(2, 0xe74c3c, 1);
        this.g.strokeRect(sx - 1, ey - floorHeight / 2 + 3, 38, floorHeight - 6);
      }

      // 엘베 정원 라벨 (샤프트 상단에 고정) — space 기준
      const used = spaceUsed(e.passengers);
      const label = this.elevatorLabels[i]!;
      label.setPosition(sx + 18, y - 16);
      label.setText(isBroken ? `E${e.id + 1} BROKEN` : `E${e.id + 1}  ${used}/${e.capacity}`);
      label.setColor(isBroken ? '#e74c3c' : (used >= e.capacity ? '#f5c542' : COLORS.text));
      label.setVisible(true);
    }

    this.statText.setText(`처리 ${state.servedCount}  불만 처리 ${state.angryServedCount}`);
  }

  private ensureLabels(state: SimState): void {
    const { x, y, totalHeight } = this.layout;
    const floors = state.building.floors;
    const floorHeight = totalHeight / floors.length;

    while (this.floorLabels.length < floors.length) {
      const fl = this.scene.add
        .text(x + 8, 0, '', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '12px',
          color: COLORS.textDim,
        })
        .setOrigin(0, 0.5)
        .setDepth(1);
      this.floorLabels.push(fl);

      const ql = this.scene.add
        .text(0, 0, '', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '11px',
          color: COLORS.textDim,
        })
        .setOrigin(1, 0.5)
        .setDepth(1);
      this.queueLabels.push(ql);
    }

    for (let i = 0; i < floors.length; i++) {
      const fy = y + totalHeight - i * floorHeight - floorHeight / 2;
      const floor = floors[i]!;
      const fl = this.floorLabels[i]!;
      fl.setPosition(x + 8, fy);
      const roleColorHex = '#' + ROLE_COLOR[floor.role].toString(16).padStart(6, '0');
      // 화장실 보유면 🚻 표시 + 청결도 표기
      let label = `${i + 1}F ${ROLE_SHORT[floor.role]}`;
      if (floor.hasToilet) {
        const c = Math.round(floor.cleanliness);
        const dirty = c < 30;
        label += dirty ? ` 🚻!${c}` : ` 🚻${c}`;
      }
      fl.setText(label);
      fl.setColor(floor.hasToilet && floor.cleanliness < 30 ? '#e74c3c' : roleColorHex);
      fl.setVisible(true);
    }
    for (let i = floors.length; i < this.floorLabels.length; i++) {
      this.floorLabels[i]!.setVisible(false);
      this.queueLabels[i]!.setVisible(false);
    }
  }
}

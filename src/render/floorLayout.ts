/**
 * 단일 층 포커스 레이아웃 헬퍼 — 연속(float) focus 지원.
 *
 * focusY 는 float (0..N-1).
 * - focusY = 0  → 1F (floor 0) 가 정중앙
 * - focusY = 0.5 → 1F 와 2F 사이, 둘 다 부분 확대
 * - focusY = 2  → 3F 가 정중앙
 *
 * 부드러운 확대/축소: focusY 가 i 에 가까울수록 floor i 가 커짐.
 *
 * 좌표: floorId 0 = 최저층 (스크린 아래쪽).
 */

/** 각 floor 의 weight — focusY 와의 거리 기반. 가까울수록 큰 weight. */
function weight(dist: number): number {
  // dist 0 → 5, dist 0.5 → ~3, dist 1 → 1, dist 1.5 → 0.7, dist 2+ → 0.5
  if (dist < 0.5) return 5 - dist * 4;            // 5 ~ 3
  if (dist < 1)   return 3 - (dist - 0.5) * 4;    // 3 ~ 1
  if (dist < 2)   return 1 - (dist - 1) * 0.3;    // 1 ~ 0.7
  return 0.5;
}

/** 각 floor 의 시각적 높이 (px) — focusY 기반 정규화. 모든 층 합 = totalH. */
export function computeFloorHeights(focusY: number, totalH: number, floorCount: number): number[] {
  const ws: number[] = [];
  let sumW = 0;
  for (let i = 0; i < floorCount; i++) {
    const w = weight(Math.abs(i - focusY));
    ws.push(w);
    sumW += w;
  }
  return ws.map((w) => totalH * w / sumW);
}

/** 각 floor 중심 Y. floor N-1 이 최상단 (작은 Y), floor 0 이 최하단 (큰 Y). */
export function computeFloorCenters(focusY: number, layoutY: number, totalH: number, floorCount: number): number[] {
  const heights = computeFloorHeights(focusY, totalH, floorCount);
  const centers: number[] = new Array(floorCount);
  let yCursor = layoutY;
  // 최상층 (N-1) 부터 stack
  for (let i = floorCount - 1; i >= 0; i--) {
    centers[i] = yCursor + heights[i]! / 2;
    yCursor += heights[i]!;
  }
  return centers;
}

/** 단일 floor 중심 Y. computeFloorCenters 의 wrapper. */
export function getFloorCenterY(layoutY: number, totalH: number, focusY: number, floorId: number, floorCount: number): number {
  const centers = computeFloorCenters(focusY, layoutY, totalH, floorCount);
  return centers[floorId] ?? layoutY + totalH / 2;
}

/** 단일 floor 의 시각적 높이. */
export function getFloorHeight(focusY: number, floorId: number, totalH = 560, floorCount = 5): number {
  const heights = computeFloorHeights(focusY, totalH, floorCount);
  return heights[floorId] ?? totalH / floorCount;
}

/** 연속적인 엘베 y (도메인) → 화면 Y. */
export function getElevatorScreenY(layoutY: number, totalH: number, focusY: number, ey: number, floorCount: number): number {
  const lower = Math.max(0, Math.floor(ey));
  const upper = Math.min(floorCount - 1, lower + 1);
  const t = ey - lower;
  const centers = computeFloorCenters(focusY, layoutY, totalH, floorCount);
  return (centers[lower] ?? layoutY) + ((centers[upper] ?? layoutY) - (centers[lower] ?? layoutY)) * t;
}

/** focusY 가장 가까운 정수 floor 가 floorId 인지. */
export function isFocus(focusY: number, floorId: number): boolean {
  return Math.round(focusY) === floorId;
}

/** 호환성 type alias — 이전엔 객체였으나 이제 그냥 float. consumer 가 import 만 유지하도록. */
export type FocusLayout = number;

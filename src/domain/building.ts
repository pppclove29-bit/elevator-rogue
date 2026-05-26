import { Building, Elevator, Floor, FloorRole } from './types';

export function createBuilding(floorCount: number, elevatorCount: number): Building {
  const floors: Floor[] = [];
  for (let i = 0; i < floorCount; i++) {
    const role = defaultRoleFor(i, floorCount);
    // 화장실: 로비/오피스/식당에 자동 부여 (옥상/지하는 X)
    const hasToilet = role === 'lobby' || role === 'office' || role === 'restaurant';
    floors.push({ id: i, role, queue: [], hasToilet, cleanliness: 100 });
  }

  const elevators: Elevator[] = [];
  for (let i = 0; i < elevatorCount; i++) {
    elevators.push({
      id: i,
      y: 0,
      speedPerTick: 0.09,
      capacity: 8,
      loadTicks: 14,
      state: { kind: 'idle' },
      passengers: [],
      tripCount: 0,
    });
  }

  return { floors, elevators };
}

export function defaultRoleFor(floorId: number, floorCount: number): FloorRole {
  if (floorId === 0) return 'lobby';
  if (floorId === floorCount - 1) return 'rooftop';
  if (floorCount >= 4 && floorId === Math.floor(floorCount / 2)) return 'restaurant';
  return 'office';
}

/** rooftop이 항상 최상층이도록 새 층은 rooftop 바로 아래에 끼움. */
export function addFloor(building: Building, role: FloorRole = 'office'): void {
  const lastIdx = building.floors.length - 1;
  const last = building.floors[lastIdx];
  const hasToilet = role === 'office' || role === 'restaurant';
  if (last && last.role === 'rooftop') {
    building.floors.splice(lastIdx, 0, { id: lastIdx, role, queue: [], hasToilet, cleanliness: 100 });
  } else {
    building.floors.push({ id: building.floors.length, role, queue: [], hasToilet, cleanliness: 100 });
  }
  for (let i = 0; i < building.floors.length; i++) building.floors[i]!.id = i;
}

export function nearestFloor(y: number): number {
  return Math.round(y);
}

export function clampY(y: number, floorCount: number): number {
  if (y < 0) return 0;
  const max = floorCount - 1;
  if (y > max) return max;
  return y;
}

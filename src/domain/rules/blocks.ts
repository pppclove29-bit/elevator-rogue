import { nearestFloor } from '../building';
import { phaseAtTick } from '../phase';
import { Elevator, FloorRole, SimState } from '../types';

export type ConditionBlockId = string;
export type ActionBlockId = string;

export interface ConditionBlock {
  id: ConditionBlockId;
  label: string;
  desc: string;
  match: (state: SimState, elevator: Elevator, here: number) => boolean;
}

export interface ActionBlock {
  id: ActionBlockId;
  label: string;
  desc: string;
  resolve: (state: SimState, elevator: Elevator, here: number) => number | 'stay' | null;
}

const callOn = (role: FloorRole) => (s: SimState) =>
  s.building.floors.some((f) => f.role === role && f.queue.length > 0);

const goToNearestRole = (role: FloorRole) => (s: SimState, _e: Elevator, here: number) => {
  let best: number | null = null;
  let bestD = Infinity;
  for (const f of s.building.floors) {
    if (f.role !== role || f.queue.length === 0) continue;
    const d = Math.abs(f.id - here);
    if (d < bestD) { bestD = d; best = f.id; }
  }
  return best;
};

export const CONDITION_BLOCKS: Record<ConditionBlockId, ConditionBlock> = {
  'c-always':           { id: 'c-always',           label: '항상',          desc: '언제나 매칭',                        match: () => true },
  'c-has-passengers':   { id: 'c-has-passengers',   label: '탑승객 있음',    desc: '엘베에 한 명 이상',                  match: (_s, e) => e.passengers.length > 0 },
  'c-any-call':         { id: 'c-any-call',         label: '대기열 있음',    desc: '어느 층에 대기 승객',                match: (s) => s.building.floors.some((f) => f.queue.length > 0) },
  'c-at-capacity':      { id: 'c-at-capacity',      label: '정원 풀',        desc: '엘베 정원 도달',                     match: (_s, e) => e.passengers.length >= e.capacity },
  'c-phase-morning':    { id: 'c-phase-morning',    label: 'MORNING이면',   desc: '출근 페이즈',                        match: (s) => phaseAtTick(s.tick).phase === 'morning' },
  'c-phase-work':       { id: 'c-phase-work',       label: 'WORK이면',      desc: '근무 페이즈',                        match: (s) => phaseAtTick(s.tick).phase === 'work' },
  'c-phase-lunch':      { id: 'c-phase-lunch',      label: 'LUNCH면',       desc: '점심 페이즈',                        match: (s) => phaseAtTick(s.tick).phase === 'lunch' },
  'c-phase-evening':    { id: 'c-phase-evening',    label: 'EVENING이면',   desc: '퇴근 페이즈',                        match: (s) => phaseAtTick(s.tick).phase === 'evening' },
  'c-phase-night':      { id: 'c-phase-night',      label: 'NIGHT이면',     desc: '야간 페이즈',                        match: (s) => phaseAtTick(s.tick).phase === 'night' },
  'c-call-lobby':       { id: 'c-call-lobby',       label: '로비 콜 있음',   desc: 'LB층에 대기',                        match: callOn('lobby') },
  'c-call-office':      { id: 'c-call-office',      label: '오피스 콜 있음', desc: 'OF층에 대기',                        match: callOn('office') },
  'c-call-restaurant':  { id: 'c-call-restaurant',  label: '식당 콜 있음',   desc: 'RT층에 대기',                        match: callOn('restaurant') },
  'c-call-rooftop':     { id: 'c-call-rooftop',     label: '옥상 콜 있음',   desc: 'RF층에 대기',                        match: callOn('rooftop') },
  'c-call-basement':    { id: 'c-call-basement',    label: '지하 콜 있음',   desc: 'BS층에 대기',                        match: callOn('basement') },
  'c-queue-2':          { id: 'c-queue-2',          label: '대기열 ≥ 2',     desc: '어느 층 대기 2명 이상',              match: (s) => s.building.floors.some((f) => f.queue.length >= 2) },
  'c-queue-4':          { id: 'c-queue-4',          label: '대기열 ≥ 4',     desc: '어느 층 대기 4명 이상',              match: (s) => s.building.floors.some((f) => f.queue.length >= 4) },
  'c-queue-6':          { id: 'c-queue-6',          label: '대기열 ≥ 6',     desc: '어느 층 대기 6명 이상',              match: (s) => s.building.floors.some((f) => f.queue.length >= 6) },
  'c-at-lobby':         { id: 'c-at-lobby',         label: '1F에 있음',      desc: '엘베 현재 위치 1F',                  match: (_s, e) => nearestFloor(e.y) === 0 },
  'c-at-rooftop':       { id: 'c-at-rooftop',       label: '최상층에 있음',  desc: '엘베 현재 위치 최상층',              match: (s, e) => nearestFloor(e.y) === s.building.floors.length - 1 },
};

export const ACTION_BLOCKS: Record<ActionBlockId, ActionBlock> = {
  'a-nearest-pdest':    { id: 'a-nearest-pdest',    label: '가까운 목적지',   desc: '탑승객의 가장 가까운 목적지',     resolve: (_s, e, here) => {
    let best: number | null = null; let bestD = Infinity;
    for (const p of e.passengers) { const d = Math.abs(p.dest - here); if (d < bestD) { bestD = d; best = p.dest; } }
    return best;
  } },
  'a-nearest-call':     { id: 'a-nearest-call',     label: '가까운 호출',     desc: '대기열 있는 가장 가까운 층',      resolve: (s, _e, here) => {
    let best: number | null = null; let bestD = Infinity;
    for (const f of s.building.floors) { if (f.queue.length === 0) continue; const d = Math.abs(f.id - here); if (d < bestD) { bestD = d; best = f.id; } }
    return best;
  } },
  'a-call-lobby':       { id: 'a-call-lobby',       label: '로비 콜 가까운',  desc: 'LB층 중 가장 가까운 콜',          resolve: goToNearestRole('lobby') },
  'a-call-office':      { id: 'a-call-office',      label: '오피스 콜 가까운',desc: 'OF층 중 가장 가까운 콜',          resolve: goToNearestRole('office') },
  'a-call-restaurant':  { id: 'a-call-restaurant',  label: '식당 콜 가까운',  desc: 'RT층 중 가장 가까운 콜',          resolve: goToNearestRole('restaurant') },
  'a-call-rooftop':     { id: 'a-call-rooftop',     label: '옥상 콜 가까운',  desc: 'RF층 중 가장 가까운 콜',          resolve: goToNearestRole('rooftop') },
  'a-call-basement':    { id: 'a-call-basement',    label: '지하 콜 가까운',  desc: 'BS층 중 가장 가까운 콜',          resolve: goToNearestRole('basement') },
  'a-highest-call':     { id: 'a-highest-call',     label: '가장 높은 콜',    desc: '큐 있는 최상층',                  resolve: (s) => {
    let h = -1; for (const f of s.building.floors) if (f.queue.length > 0 && f.id > h) h = f.id; return h >= 0 ? h : null;
  } },
  'a-lowest-call':      { id: 'a-lowest-call',      label: '가장 낮은 콜',    desc: '큐 있는 최하층',                  resolve: (s) => {
    let l = Infinity; for (const f of s.building.floors) if (f.queue.length > 0 && f.id < l) l = f.id; return l !== Infinity ? l : null;
  } },
  'a-largest-queue':    { id: 'a-largest-queue',    label: '가장 큰 큐',      desc: '대기열이 가장 긴 층',             resolve: (s) => {
    let id = -1; let max = 0;
    for (const f of s.building.floors) if (f.queue.length > max) { max = f.queue.length; id = f.id; }
    return id >= 0 ? id : null;
  } },
  'a-park-lobby':       { id: 'a-park-lobby',       label: '1F 대기',         desc: '로비로 이동 대기',                resolve: () => 0 },
  'a-park-here':        { id: 'a-park-here',        label: '제자리 대기',     desc: '움직이지 않음',                    resolve: () => 'stay' },
};

export function conditionById(id: ConditionBlockId): ConditionBlock {
  const b = CONDITION_BLOCKS[id]; if (!b) throw new Error(`unknown condition: ${id}`); return b;
}
export function actionById(id: ActionBlockId): ActionBlock {
  const b = ACTION_BLOCKS[id]; if (!b) throw new Error(`unknown action: ${id}`); return b;
}

export function allConditionIds(): ConditionBlockId[] { return Object.keys(CONDITION_BLOCKS); }
export function allActionIds(): ActionBlockId[] { return Object.keys(ACTION_BLOCKS); }

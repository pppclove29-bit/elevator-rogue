import { SimState } from '../domain/types';

export type ModifierType = 'debuff' | 'buff' | 'mixed';

export interface ModifierEntry {
  id: string;
  name: string;
  desc: string;
  type: ModifierType;
  /** state mutate. return: 만료 시 호출할 cleanup */
  apply(state: SimState): () => void;
}

function mulRecord<K extends string>(obj: Record<K, number>, key: K, factor: number): () => void {
  obj[key] *= factor;
  return () => { obj[key] /= factor; };
}

function mulField<T extends object, K extends keyof T>(obj: T, key: K, factor: number): () => void {
  (obj[key] as unknown as number) *= factor;
  return () => { (obj[key] as unknown as number) /= factor; };
}

function addField<T extends object, K extends keyof T>(obj: T, key: K, delta: number): () => void {
  (obj[key] as unknown as number) += delta;
  return () => { (obj[key] as unknown as number) -= delta; };
}

export const MODIFIERS: Record<string, ModifierEntry> = {
  // ─ Debuff ─────────────────────────────────────────
  'dm-traffic-jam-morning': { id:'dm-traffic-jam-morning', name:'출근길 정체', desc:'출근 스폰 ×1.7 (간격 ×0.6)', type:'debuff',
    apply: (s) => mulRecord(s.params.phaseSpawnMultiplier, 'morning', 0.6) },
  'dm-lunch-rush': { id:'dm-lunch-rush', name:'점심 광풍', desc:'점심 스폰 ×1.7', type:'debuff',
    apply: (s) => mulRecord(s.params.phaseSpawnMultiplier, 'lunch', 0.6) },
  'dm-evening-rush': { id:'dm-evening-rush', name:'퇴근 러시', desc:'퇴근 스폰 ×1.7', type:'debuff',
    apply: (s) => mulRecord(s.params.phaseSpawnMultiplier, 'evening', 0.6) },
  'dm-bad-mood': { id:'dm-bad-mood', name:'짜증의 날', desc:'오늘 불만 누적 ×1.4', type:'debuff',
    apply: (s) => {
      const u1 = mulField(s.params, 'angerWaitingPerTick', 1.4);
      const u2 = mulField(s.params, 'angerRidingPerTick', 1.4);
      return () => { u1(); u2(); };
    } },
  'dm-power-dip': { id:'dm-power-dip', name:'정전 경고', desc:'오늘 엘베 속도 ×0.7', type:'debuff',
    apply: (s) => mulField(s.params, 'globalSpeedMultiplier', 0.7) },
  'dm-heavy-load': { id:'dm-heavy-load', name:'무거운 짐', desc:'정차 시간 +4 tick', type:'debuff',
    apply: (s) => addField(s.params, 'baseLoadTicks', 4) },
  'dm-narrow-door': { id:'dm-narrow-door', name:'좁은 문', desc:'엘베 정원 -2 (최소 2)', type:'debuff',
    apply: (s) => {
      const orig = s.building.elevators.map((e) => e.capacity);
      for (const e of s.building.elevators) e.capacity = Math.max(2, e.capacity - 2);
      return () => { for (let i = 0; i < s.building.elevators.length; i++) {
        const o = orig[i]; if (o !== undefined) s.building.elevators[i]!.capacity = o; } };
    } },
  'dm-restaurant-fest': { id:'dm-restaurant-fest', name:'식당가 축제', desc:'점심 식당 트래픽 폭증', type:'debuff',
    apply: (s) => mulRecord(s.params.phaseSpawnMultiplier, 'lunch', 0.5) }, // 단순화: lunch 스폰 ×2
  'dm-vip-day': { id:'dm-vip-day', name:'VIP 방문', desc:'근무 스폰 ×1.5', type:'debuff',
    apply: (s) => mulRecord(s.params.phaseSpawnMultiplier, 'work', 0.66) },
  'dm-night-shift': { id:'dm-night-shift', name:'야간 근무', desc:'야간 스폰 ×3.3', type:'debuff',
    apply: (s) => mulRecord(s.params.phaseSpawnMultiplier, 'night', 0.3) },
  'dm-fire-drill': { id:'dm-fire-drill', name:'화재 대피', desc:'시작 시 랜덤 층 큐 +4 (즉시)', type:'debuff',
    apply: (s) => {
      const idx = Math.floor(Math.random() * s.building.floors.length); // 일회성 모디파이어 — RNG 결정성 외
      const floor = s.building.floors[idx];
      if (!floor) return () => {};
      for (let i = 0; i < 4; i++) {
        const dest = (idx + 1 + Math.floor(Math.random() * (s.building.floors.length - 1))) % s.building.floors.length;
        floor.queue.push({ id: s.nextPassengerId++, origin: floor.id, dest, spawnTick: s.tick, anger: 0, archetype: 'normal' });
      }
      return () => {};
    } },

  // ─ Buff ───────────────────────────────────────────
  'dm-calm-day': { id:'dm-calm-day', name:'명상의 날', desc:'오늘 불만 누적 ×0.7', type:'buff',
    apply: (s) => {
      const u1 = mulField(s.params, 'angerWaitingPerTick', 0.7);
      const u2 = mulField(s.params, 'angerRidingPerTick', 0.7);
      return () => { u1(); u2(); };
    } },
  'dm-smooth-ops': { id:'dm-smooth-ops', name:'효율 운영', desc:'정차 시간 -2 tick', type:'buff',
    apply: (s) => addField(s.params, 'baseLoadTicks', -2) },
  'dm-quiet-day': { id:'dm-quiet-day', name:'한산한 하루', desc:'모든 페이즈 스폰 ×0.7', type:'buff',
    apply: (s) => mulField(s.params, 'spawnIntervalMultiplier', 1.4) },
  'dm-fast-motors': { id:'dm-fast-motors', name:'신속 모터', desc:'엘베 속도 ×1.2', type:'buff',
    apply: (s) => mulField(s.params, 'globalSpeedMultiplier', 1.2) },
  'dm-skill-prime': { id:'dm-skill-prime', name:'즉발 풀가동', desc:'스킬 쿨다운 ×0.5', type:'buff',
    apply: (s) => mulField(s.params, 'skillCooldownMultiplier', 0.5) },
  'dm-free-coffee': { id:'dm-free-coffee', name:'무료 커피', desc:'층 큐 상한 +3', type:'buff',
    apply: (s) => addField(s.params, 'floorCapacity', 3) },

  // ─ Mixed ──────────────────────────────────────────
  'dm-rush-rewards': { id:'dm-rush-rewards', name:'위기는 곧 기회', desc:'스폰 ×1.5, 보상으로 +30G', type:'mixed',
    apply: (s) => {
      s.gold += 30;
      return mulField(s.params, 'spawnIntervalMultiplier', 0.66);
    } },
  'dm-marathon': { id:'dm-marathon', name:'마라톤 데이', desc:'스폰 ×0.7, 불만 ×0.8 (한산하지만 길게)', type:'mixed',
    apply: (s) => {
      const u1 = mulField(s.params, 'spawnIntervalMultiplier', 1.4);
      const u2 = mulField(s.params, 'angerWaitingPerTick', 0.8);
      return () => { u1(); u2(); };
    } },
  'dm-vip-protocol': { id:'dm-vip-protocol', name:'VIP 의전', desc:'엘베 속도 +20%, 정원 -1', type:'mixed',
    apply: (s) => {
      const u1 = mulField(s.params, 'globalSpeedMultiplier', 1.2);
      const orig = s.building.elevators.map((e) => e.capacity);
      for (const e of s.building.elevators) e.capacity = Math.max(1, e.capacity - 1);
      return () => { u1(); for (let i = 0; i < s.building.elevators.length; i++) {
        const o = orig[i]; if (o !== undefined) s.building.elevators[i]!.capacity = o; } };
    } },
};

export function modifierById(id: string): ModifierEntry {
  const m = MODIFIERS[id]; if (!m) throw new Error(`unknown modifier: ${id}`); return m;
}

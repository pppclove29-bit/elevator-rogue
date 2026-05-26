import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, INITIAL_ELEVATORS, INITIAL_FLOORS, TICK_MS } from '../config';
import { ActionBlockId, ConditionBlockId } from '../domain/rules/blocks';
import { makeRuleId, RuleInSlot } from '../domain/rules/types';
import { Rng } from '../domain/rng';
import { createSim, startingSlotsForElevator, tick } from '../domain/simulation';
import { defaultPolicy, ElevatorId, ElevatorPolicy, MAX_SLOTS_PER_ELEVATOR, SimState } from '../domain/types';
import { EventEntry, rollDailyEvent } from '../meta/events';
import { modifierById } from '../meta/modifiers';
import { relicById } from '../meta/relics';
import { loadProgression, recordDayReached, saveProgression } from '../meta/progression';
import { rollShopOffers } from '../meta/shop';
import { readSave, SaveData, writeSave } from '../meta/save';
import { skillById } from '../meta/skills';
import { DEFAULT_THEME, THEMES, ThemeId } from '../meta/themes';
import { addFloor } from '../domain/building';
import { BuildingView } from '../render/BuildingView';
import { PassengerSprites } from '../render/PassengerSprites';

export class GameScene extends Phaser.Scene {
  state!: SimState;
  pendingReward = false; // = pendingModal (shop/modifier/relic 중 활성)
  private lastRewardedDay = 0;
  private lastModifierDay = 0;
  private lastRelicDay = 0;
  private lastFloorAddedDay = 0;
  private modifierCleanups: Map<string, () => void> = new Map();
  private eventCleanups: Array<{ id: string; expiresAtTick: number; cleanup: () => void }> = [];
  activeEventToday: EventEntry | null = null;
  pendingModalQueue: Array<'Shop' | 'Modifier' | 'Relic'> = [];
  recentUnlocks: ThemeId[] = []; // HUD가 잠시 표시할 새 해금
  private rng!: Rng;
  private view!: BuildingView;
  private sprites!: PassengerSprites;
  private accumulator = 0;
  paused = false;
  timeScale = 1;
  private seed = 1;
  private themeId: ThemeId = DEFAULT_THEME;
  private pendingLoad: SaveData | null = null;

  init(data: { theme?: ThemeId; load?: boolean }): void {
    if (data?.load) {
      this.pendingLoad = readSave();
    } else {
      this.pendingLoad = null;
      if (data?.theme) this.themeId = data.theme;
    }
  }

  constructor() {
    super('Game');
  }

  create(): void {
    if (this.pendingLoad) {
      this.applyLoad(this.pendingLoad);
      this.pendingLoad = null;
    } else {
      this.startRun(this.seed);
    }

    const margin = 80;
    const usableHeight = GAME_HEIGHT - margin * 2;
    const width = 320;
    const layout = {
      x: Math.floor((GAME_WIDTH - width) / 2),
      y: margin,
      width,
      totalHeight: usableHeight,
      shaftSpacing: 56,
    };
    this.view = new BuildingView(this, layout);
    this.sprites = new PassengerSprites(this, layout);

    this.scene.launch('HUD');
    this.bindInput();
  }

  setSpeed(scale: number): void { this.timeScale = scale; }

  rngHandle(): Rng { return this.rng; }

  togglePause(): void {
    if (this.state.gameOver) return;
    this.paused = !this.paused;
    if (this.paused) {
      if (!this.scene.isActive('RuleEditor')) this.scene.launch('RuleEditor');
    } else {
      if (this.scene.isActive('RuleEditor')) this.scene.stop('RuleEditor');
    }
  }

  restart(): void {
    this.seed += 1;
    if (this.scene.isActive('RuleEditor')) this.scene.stop('RuleEditor');
    if (this.scene.isActive('Shop')) this.scene.stop('Shop');
    if (this.scene.isActive('Modifier')) this.scene.stop('Modifier');
    if (this.scene.isActive('Relic')) this.scene.stop('Relic');
    if (this.scene.isActive('GameOver')) this.scene.stop('GameOver');
    this.startRun(this.seed);
  }

  // ───────── 정책 편집 API ─────────

  getPolicy(eId: ElevatorId): ElevatorPolicy {
    return this.state.policiesByElevator[eId] ?? defaultPolicy();
  }

  updatePolicy(eId: ElevatorId, patch: Partial<ElevatorPolicy>): void {
    const current = this.getPolicy(eId);
    this.state.policiesByElevator[eId] = { ...current, ...patch };
  }

  // ───────── 룰 슬롯 편집 API (레거시, 사용 X) ─────────

  slotsOf(eId: ElevatorId): RuleInSlot[] {
    return this.state.slotsByElevator[eId] ?? [];
  }

  addEmptyRule(eId: ElevatorId): boolean {
    const slots = this.slotsOf(eId);
    if (slots.length >= MAX_SLOTS_PER_ELEVATOR) return false;
    slots.push({ id: makeRuleId(), when: [], then: null });
    this.state.slotsByElevator[eId] = slots;
    return true;
  }

  removeRule(eId: ElevatorId, ruleId: string): void {
    this.state.slotsByElevator[eId] = this.slotsOf(eId).filter((r) => r.id !== ruleId);
  }

  reorderRule(eId: ElevatorId, fromIdx: number, toIdx: number): void {
    const slots = this.slotsOf(eId);
    if (fromIdx < 0 || fromIdx >= slots.length) return;
    if (toIdx < 0 || toIdx >= slots.length) return;
    const [r] = slots.splice(fromIdx, 1);
    if (r) slots.splice(toIdx, 0, r);
  }

  addConditionToRule(eId: ElevatorId, ruleId: string, cond: ConditionBlockId): void {
    const rule = this.slotsOf(eId).find((r) => r.id === ruleId);
    if (!rule) return;
    if (rule.when.includes(cond)) return;
    rule.when.push(cond);
  }

  removeConditionFromRule(eId: ElevatorId, ruleId: string, cond: ConditionBlockId): void {
    const rule = this.slotsOf(eId).find((r) => r.id === ruleId);
    if (!rule) return;
    rule.when = rule.when.filter((c) => c !== cond);
  }

  setActionForRule(eId: ElevatorId, ruleId: string, act: ActionBlockId | null): void {
    const rule = this.slotsOf(eId).find((r) => r.id === ruleId);
    if (!rule) return;
    rule.then = act;
  }

  // ───────── 보상/스킬 ─────────

  addSkill(skillId: string): void {
    if (this.state.ownedSkills.includes(skillId)) return;
    this.state.ownedSkills.push(skillId);
    this.state.skillCooldowns[skillId] = 0;
  }

  useSkill(skillId: string): boolean {
    if (this.paused || this.pendingReward || this.state.gameOver) return false;
    if (!this.state.ownedSkills.includes(skillId)) return false;
    const cd = this.state.skillCooldowns[skillId] ?? 0;
    if (cd > 0) return false;
    const skill = skillById(skillId);
    skill.effect(this.state);
    this.state.skillCooldowns[skillId] = skill.cooldownTicks;
    return true;
  }

  useSkillSlot(slot: number): void {
    const id = this.state.ownedSkills[slot];
    if (id) this.useSkill(id);
  }

  resolveShop(): void { this.advanceModalQueue(); }
  resolveModifier(modId: string | null): void {
    if (modId) this.applyModifier(modId);
    this.advanceModalQueue();
  }
  resolveRelic(relicId: string | null): void {
    if (relicId) this.applyRelic(relicId);
    this.advanceModalQueue();
  }

  private applyModifier(id: string): void {
    if (this.modifierCleanups.has(id)) return;
    const m = modifierById(id);
    const cleanup = m.apply(this.state);
    this.modifierCleanups.set(id, cleanup);
    this.state.activeModifiers.push({ id, expiresAtDay: this.state.dayCompleted + 1 });
  }

  private expireDailyModifiers(): void {
    const now = this.state.dayCompleted;
    const remaining: typeof this.state.activeModifiers = [];
    for (const am of this.state.activeModifiers) {
      if (am.expiresAtDay <= now) {
        const undo = this.modifierCleanups.get(am.id);
        if (undo) undo();
        this.modifierCleanups.delete(am.id);
      } else {
        remaining.push(am);
      }
    }
    this.state.activeModifiers = remaining;
  }

  private applyRelic(id: string): void {
    if (this.state.ownedRelics.includes(id)) return;
    const r = relicById(id);
    r.apply(this.state);
    this.state.ownedRelics.push(id);
  }

  private advanceModalQueue(): void {
    const next = this.pendingModalQueue.shift();
    if (!next) {
      this.pendingReward = false;
      return;
    }
    this.pendingReward = true;
    this.scene.launch(next);
  }

  private maybeTriggerEndOfDay(): void {
    if (this.pendingReward) return;
    if (this.state.dayCompleted <= this.lastRewardedDay) return;

    const day = this.state.dayCompleted; // 막 완료된 day (1 이상)
    this.lastRewardedDay = day;

    this.expireDailyModifiers();
    // 이벤트 만료/소진: 새 day 시작 시점에 남은 게 있다면 강제 정리
    for (const ec of this.eventCleanups) ec.cleanup();
    this.eventCleanups = [];
    this.activeEventToday = null;
    // 미만료된 active modifier도 강제 cleanup (저장 위해 — drop)
    for (const am of this.state.activeModifiers) {
      const undo = this.modifierCleanups.get(am.id);
      if (undo) undo();
    }
    this.modifierCleanups.clear();
    this.state.activeModifiers = [];

    // 깨끗한 상태 → 자동 저장
    this.saveNow();

    // 진행도 기록 (day = 방금 끝난 day. 새 day는 day+1)
    const prog = loadProgression();
    const newUnlocks = recordDayReached(prog, this.themeId, day + 1);
    saveProgression(prog);
    if (newUnlocks.length > 0) {
      this.recentUnlocks.push(...newUnlocks);
      console.log(`[해금] 새 테마: ${newUnlocks.join(', ')}`);
    }

    // 새 day 이벤트 굴림
    this.maybeRollDailyEvent(day + 1);

    rollShopOffers(this.state, this.rng);
    const queue: Array<'Shop' | 'Modifier' | 'Relic'> = ['Shop'];
    if (day - this.lastModifierDay >= 3) { queue.push('Modifier'); this.lastModifierDay = day; }
    if (day - this.lastRelicDay >= 5) { queue.push('Relic'); this.lastRelicDay = day; }
    if (day - this.lastFloorAddedDay >= 4) {
      addFloor(this.state.building);
      this.lastFloorAddedDay = day;
      console.log(`[t=${this.state.tick}] floor added → ${this.state.building.floors.length} floors`);
    }

    this.pendingModalQueue = queue;
    this.advanceModalQueue();
  }

  private startRun(seed: number): void {
    const sim = createSim({
      floorCount: INITIAL_FLOORS,
      elevatorCount: INITIAL_ELEVATORS,
      seed,
    });
    this.state = sim.state;
    this.rng = sim.rng;
    this.accumulator = 0;
    this.paused = false;
    this.pendingReward = false;
    this.lastRewardedDay = 0;
    this.lastModifierDay = 0;
    this.lastRelicDay = 0;
    this.lastFloorAddedDay = 0;
    this.modifierCleanups.clear();
    for (const ec of this.eventCleanups) ec.cleanup();
    this.eventCleanups = [];
    this.activeEventToday = null;
    this.pendingModalQueue = [];
    // 테마 적용 (시작 보너스 + apply)
    const theme = THEMES[this.themeId];
    if (theme) {
      this.state.gold += theme.startingGoldBonus ?? 0;
      theme.apply(this.state);
    }
    void startingSlotsForElevator;
  }

  private applyLoad(save: SaveData): void {
    // RNG는 seed로 재초기화 (저장 시점의 rng 내부 상태는 직렬화 X — 약간 결정성 손해, 게임플레이 영향 미미)
    const sim = createSim({
      floorCount: 1, elevatorCount: 1, seed: save.seed, // sim 초기화 후 state 통째로 교체
    });
    this.rng = sim.rng;
    this.state = save.state;
    this.themeId = save.themeId;
    this.seed = save.seed;
    this.lastRewardedDay = save.lastRewardedDay;
    this.lastModifierDay = save.lastModifierDay;
    this.lastRelicDay = save.lastRelicDay;
    this.lastFloorAddedDay = save.lastFloorAddedDay;
    this.accumulator = 0;
    this.paused = false;
    this.pendingReward = false;
    this.modifierCleanups.clear();
    this.eventCleanups = [];
    this.activeEventToday = null;
    this.pendingModalQueue = [];
    // 저장은 깨끗한 상태 (activeModifiers/eventCleanups 비어있음)
  }

  /** 매 day end 시점에 호출. cleanups 다 비운 후 직렬화. */
  private saveNow(): void {
    const data: SaveData = {
      version: 1,
      state: JSON.parse(JSON.stringify(this.state)) as typeof this.state,
      themeId: this.themeId,
      seed: this.seed,
      lastRewardedDay: this.lastRewardedDay,
      lastModifierDay: this.lastModifierDay,
      lastRelicDay: this.lastRelicDay,
      lastFloorAddedDay: this.lastFloorAddedDay,
      savedAt: Date.now(),
    };
    writeSave(data);
  }

  private maybeRollDailyEvent(day: number): void {
    const ev = rollDailyEvent(this.rng, day);
    this.activeEventToday = ev;
    if (!ev) return;
    const res = ev.trigger(this.state, this.rng, day);
    if (res) {
      this.eventCleanups.push({ id: ev.id, expiresAtTick: this.state.tick + res.durationTicks, cleanup: res.cleanup });
    }
    console.log(`[t=${this.state.tick}] event: ${ev.name}`);
  }

  /** 매 tick GameScene update에서 호출, 만료된 event cleanup */
  private expireEvents(): void {
    const now = this.state.tick;
    const remaining: typeof this.eventCleanups = [];
    for (const ec of this.eventCleanups) {
      if (ec.expiresAtTick <= now) ec.cleanup();
      else remaining.push(ec);
    }
    this.eventCleanups = remaining;
  }

  private bindInput(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    kb.on('keydown-SPACE', () => this.togglePause());
    kb.on('keydown-ONE', () => this.setSpeed(1));
    kb.on('keydown-TWO', () => this.setSpeed(2));
    kb.on('keydown-FOUR', () => this.setSpeed(4));
    kb.on('keydown-EIGHT', () => this.setSpeed(8));
    kb.on('keydown-R', () => this.restart());
    kb.on('keydown-Q', () => this.useSkillSlot(0));
    kb.on('keydown-W', () => this.useSkillSlot(1));
    kb.on('keydown-E', () => this.useSkillSlot(2));
  }

  update(_time: number, delta: number): void {
    // 게임 오버 시 GameOverScene 자동 launch (한 번만)
    if (this.state.gameOver && !this.scene.isActive('GameOver')) {
      this.scene.launch('GameOver');
    }
    if (!this.paused && !this.state.gameOver && !this.pendingReward) {
      this.accumulator += delta * this.timeScale;
      while (this.accumulator >= TICK_MS) {
        tick(this.state, this.rng);
        this.accumulator -= TICK_MS;
        this.expireEvents();
        if (this.state.dayCompleted > this.lastRewardedDay) {
          this.maybeTriggerEndOfDay();
          this.accumulator = 0;
          break;
        }
      }
    }
    this.view.draw(this.state);
    this.sprites.update(this.state, delta);
  }
}

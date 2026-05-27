import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, INITIAL_ELEVATORS, INITIAL_FLOORS, TICK_MS } from '../config';
import { Rng } from '../domain/rng';
import { phaseAtTick, Phase } from '../domain/phase';
import { createSim, tick } from '../domain/simulation';
import { defaultPolicy, ElevatorId, ElevatorPolicy, SimState } from '../domain/types';
import { EventEntry, rollDailyEvent } from '../meta/events';
import { modifierById } from '../meta/modifiers';
import { relicById } from '../meta/relics';
import { loadOptions } from '../meta/options';
import { loadProgression, recordDayReached, saveProgression } from '../meta/progression';
import { sound } from '../audio/sound';
import { rollShopOffers } from '../meta/shop';
import { readSave, SaveData, writeSave } from '../meta/save';
import { skillById } from '../meta/skills';
import { challengeById } from '../meta/challenges';
import { DEFAULT_THEME, THEMES, ThemeId } from '../meta/themes';
import { addFloor } from '../domain/building';
import { BuildingView } from '../render/BuildingView';
import { EventFx } from '../render/EventFx';
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
  private prevServedCount = 0;
  private prevGold = 0;
  private prevAngryCount = 0;
  private prevBrokenIds = new Set<number>();
  private prevEventName: string | null = null;
  private prevGameOver = false;
  private rng!: Rng;
  private view!: BuildingView;
  private sprites!: PassengerSprites;
  private fx!: EventFx;
  private prevFxEventId: string | null = null;
  private prevPhase: Phase | null = null;
  private tutorial: { pause: boolean; anger: boolean; shop: boolean; end: boolean } = { pause: false, anger: false, shop: false, end: false };
  private accumulator = 0;
  paused = false;
  timeScale = 1;
  private seed = 1;
  private themeId: ThemeId = DEFAULT_THEME;
  private challengeId: string | null = null;
  private pendingLoad: SaveData | null = null;

  init(data: { theme?: ThemeId; load?: boolean; challenge?: string | null }): void {
    if (data?.load) {
      this.pendingLoad = readSave();
    } else {
      this.pendingLoad = null;
      if (data?.theme) this.themeId = data.theme;
      this.challengeId = data?.challenge ?? null;
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
    // 옵션의 기본 속도 적용
    this.timeScale = loadOptions().defaultTimeScale;

    const margin = 80;
    const usableHeight = GAME_HEIGHT - margin * 2;
    const width = 560;
    const layout = {
      x: Math.floor((GAME_WIDTH - width) / 2),
      y: margin,
      width,
      totalHeight: usableHeight,
      shaftSpacing: 72,
    };
    this.view = new BuildingView(this, layout);
    this.sprites = new PassengerSprites(this, layout);
    this.fx = new EventFx(this);
    this.prevFxEventId = null;

    this.scene.launch('HUD');
    this.bindInput();
    this.maybeShowIntro();
  }

  /** 게임 첫 실행 시 인트로 스토리. localStorage flag 로 1회만. */
  private maybeShowIntro(): void {
    const KEY = 'elevator-rogue.story.introShown';
    this.loadTutorialFlags();
    if (this.pendingLoad) return; // 세이브 로드는 인트로 X
    if (localStorage.getItem(KEY)) return;
    this.playDialog('intro-opening', () => {
      localStorage.setItem(KEY, '1');
    });
  }

  // ───────── 튜토리얼 ─────────

  private loadTutorialFlags(): void {
    try {
      const raw = localStorage.getItem('elevator-rogue.tutorial.v1');
      if (raw) this.tutorial = { ...this.tutorial, ...JSON.parse(raw) };
    } catch { /* ignore */ }
  }

  private saveTutorialFlags(): void {
    try {
      localStorage.setItem('elevator-rogue.tutorial.v1', JSON.stringify(this.tutorial));
    } catch { /* ignore */ }
  }

  /** Dialog 모달 띄우고 시뮬 멈춤. onDone 후 시뮬 재개. */
  private playDialog(scriptId: string, onDone?: () => void): void {
    this.pendingReward = true;
    this.scene.launch('Dialog', {
      scriptId,
      onComplete: () => {
        this.pendingReward = false;
        if (onDone) onDone();
      },
    });
  }

  /** day 1 + 활성 모달 없음일 때만 트리거 가능 */
  private canTutorialFire(): boolean {
    if (this.pendingReward) return false;
    if (this.state.gameOver) return false;
    if (this.state.dayCompleted > 0 && this.state.tick > 0 && Math.floor(this.state.tick / 1) >= 0) {
      // day 1 진행 중 = dayCompleted === 0 인 동안만 (Day 1 종료 후 트리거인 shop/end 는 별도)
    }
    return true;
  }

  private isDayOne(): boolean {
    return this.state.dayCompleted === 0;
  }

  /** 매 update tick 마다 호출. phase 전환 / 첫 anger 감지. */
  private checkTutorialDuringPlay(): void {
    if (!this.isDayOne()) return;
    if (!this.canTutorialFire()) return;

    // 1) tutorial-pause: morning → work 첫 전환 시
    const info = phaseAtTick(this.state.tick);
    if (this.prevPhase !== null && this.prevPhase === 'morning' && info.phase === 'work' && !this.tutorial.pause) {
      this.tutorial.pause = true;
      this.saveTutorialFlags();
      this.playDialog('tutorial-pause');
      this.prevPhase = info.phase;
      return;
    }
    this.prevPhase = info.phase;
  }

  /** 첫 angry 발생 시. detectSoundEvents 에서 호출. */
  private maybeTriggerAngerTutorial(): void {
    if (!this.isDayOne()) return;
    if (this.tutorial.anger) return;
    if (!this.canTutorialFire()) return;
    this.tutorial.anger = true;
    this.saveTutorialFlags();
    this.playDialog('tutorial-anger');
  }

  /** Shop 모달 launch 직전 — day 1 한정. */
  private maybeTriggerShopTutorial(onAfter: () => void): boolean {
    if (this.state.dayCompleted !== 1) return false;
    if (this.tutorial.shop) return false;
    this.tutorial.shop = true;
    this.saveTutorialFlags();
    this.playDialog('tutorial-shop', onAfter);
    return true;
  }

  /** 모든 day1 모달(상점/모디파이어/렐릭) 닫힌 후 — 마지막 마무리. */
  private maybeTriggerDay1EndTutorial(): void {
    if (this.state.dayCompleted !== 1) return;
    if (this.tutorial.end) return;
    if (this.pendingReward) return;
    this.tutorial.end = true;
    this.saveTutorialFlags();
    this.playDialog('tutorial-day1-end');
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

  /** 매 frame 호출. SimState 변화를 감지해 효과음 + 시각 이펙트 트리거. */
  private detectSoundEvents(): void {
    if (!this.state) return;

    // 골드 변화: + = coin + 플로팅 +NG, - = thief + 빨간 -NG
    if (this.state.gold !== this.prevGold) {
      const delta = this.state.gold - this.prevGold;
      if (delta > 0) {
        sound.coin(delta);
        this.spawnFloatingText(`+${delta}G`, '#f5c542');
      } else if (delta < -5) {
        sound.thief();
        this.spawnFloatingText(`${delta}G`, '#e74c3c');
      } else if (delta < 0) {
        this.spawnFloatingText(`${delta}G`, '#e74c3c');
      }
      this.prevGold = this.state.gold;
    }

    // 처리 승객 증가 = ding (스폰 즉시 처리 흡수 케이스는 너무 잦아서 큰 변화만)
    if (this.state.servedCount > this.prevServedCount) {
      const delta = this.state.servedCount - this.prevServedCount;
      if (delta >= 1 && delta < 20) sound.ding();  // 큰 폭(스킬 비상 처리)은 별도 처리
      this.prevServedCount = this.state.servedCount;
    }

    // 불만 임계 도달 = alarm + 빨간 화면 깜빡임 (한 번만)
    let angry = 0;
    for (const f of this.state.building.floors) for (const p of f.queue) if (p.anger >= 100) angry++;
    for (const e of this.state.building.elevators) for (const p of e.passengers) if (p.anger >= 100) angry++;
    if (angry > this.prevAngryCount) {
      sound.alarm();
      this.flashAngryOverlay();
      this.maybeTriggerAngerTutorial();
    }
    this.prevAngryCount = angry;

    // 엘베 고장 = breakdown
    const broken = new Set<number>();
    for (const e of this.state.building.elevators) if (e.state.kind === 'broken') broken.add(e.id);
    for (const id of broken) if (!this.prevBrokenIds.has(id)) sound.breakdown();
    this.prevBrokenIds = broken;

    // 보스/공휴일 이벤트 시작 = 인트로
    const evName = this.activeEventToday?.name ?? null;
    if (evName && evName !== this.prevEventName) {
      if (evName.includes('🔥')) sound.bossDay();
      else sound.holiday();
    }
    this.prevEventName = evName;

    // 게임 오버
    if (this.state.gameOver && !this.prevGameOver) sound.gameOver();
    this.prevGameOver = this.state.gameOver;
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
      // Day 1 의 마지막 모달까지 닫혔으면 마무리 다이얼로그
      this.maybeTriggerDay1EndTutorial();
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
    // Day 1 첫 상점 진입 전 튜토리얼 다이얼로그 1회
    if (this.maybeTriggerShopTutorial(() => this.advanceModalQueue())) return;
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
    // 도전 모드 적용 (테마 이후)
    if (this.challengeId) {
      const ch = challengeById(this.challengeId);
      if (ch) ch.apply(this.state);
    }
    // 사운드 추적 초기화
    this.prevServedCount = this.state.servedCount;
    this.prevGold = this.state.gold;
    this.prevAngryCount = 0;
    this.prevBrokenIds = new Set();
    this.prevEventName = null;
    this.prevGameOver = false;
    this.prevPhase = null;
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

  /** 상단 중앙에서 위로 부유하면서 페이드아웃 되는 텍스트. */
  private spawnFloatingText(text: string, color: string): void {
    const x = GAME_WIDTH / 2 + (Math.random() - 0.5) * 80;
    const y = 100;
    const txt = this.add.text(x, y, text, {
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
      fontSize: '22px',
      color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(1000);
    this.tweens.add({
      targets: txt,
      y: y - 50,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => txt.destroy(),
    });
  }

  /** angry 임계 도달 시 화면 가장자리에 빨간 vignette 플래시 (1회). */
  private flashAngryOverlay(): void {
    const flash = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xe74c3c, 0.35)
      .setDepth(999);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 350,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });
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
    this.detectSoundEvents();
    this.checkTutorialDuringPlay();
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
    this.updateEventFx(delta);
  }

  /** activeEventToday 의 visualFx 가 바뀌면 fx 전환. 매 frame fx.update. */
  private updateEventFx(delta: number): void {
    const ev = this.activeEventToday;
    const evId = ev?.id ?? null;
    if (evId !== this.prevFxEventId) {
      this.fx.setFx(ev?.visualFx ?? null);
      this.prevFxEventId = evId;
    }
    this.fx.update(delta);
  }
}

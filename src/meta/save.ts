import { REPUTATION_INITIAL } from '../domain/simulation';
import { SimState } from '../domain/types';
import { ThemeId } from './themes';

const SAVE_KEY = 'elevator-rogue.save.v1';

export interface SaveData {
  version: 1;
  state: SimState;
  themeId: ThemeId;
  seed: number;
  // GameScene 메타 필드 (모달 트리거 추적)
  lastRewardedDay: number;
  lastModifierDay: number;
  lastRelicDay: number;
  lastFloorAddedDay: number;
  savedAt: number; // unix ms
}

export function saveExists(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export function readSave(): SaveData | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as SaveData;
    if (data.version !== 1) return null;
    // ── 마이그레이션: 옛 save 에 신규 필드 없으면 기본값 주입 ──
    if (!data.state) return data;
    const s = data.state as any;
    if (typeof s.reputation !== 'number') s.reputation = REPUTATION_INITIAL;
    // 아이작 시스템 필드 (Phase 1~4)
    if (typeof s.hasMadeDevilDeal !== 'boolean') s.hasMadeDevilDeal = false;
    if (typeof s.devilDealCount !== 'number') s.devilDealCount = 0;
    if (typeof s.angelDealCount !== 'number') s.angelDealCount = 0;
    if (!Array.isArray(s.ownedTrinkets)) s.ownedTrinkets = [];
    if (!Array.isArray(s.discardedTrinkets)) s.discardedTrinkets = [];
    if (!Array.isArray(s.activeTransformations)) s.activeTransformations = [];
    if (s.activeCurse === undefined) s.activeCurse = null;
    if (typeof s.revivesRemaining !== 'number') s.revivesRemaining = 0;
    if (typeof s.hasBeenRevivedOnce !== 'boolean') s.hasBeenRevivedOnce = false;
    if (!Array.isArray(s.brokenRelics)) s.brokenRelics = [];
    if (s.shopTrinketId === undefined) s.shopTrinketId = null;
    if (typeof s.shopMysteryAvailable !== 'boolean') s.shopMysteryAvailable = false;
    return data;
  } catch {
    return null;
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('[save] 저장 실패', e);
  }
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

/** 사용자에게 보여줄 짧은 요약 (계속하기 버튼 옆 등) */
export function summarize(data: SaveData): string {
  const day = data.state.dayCompleted + 1;
  const gold = data.state.gold;
  const served = data.state.servedCount;
  return `${day}일차 · ${gold}G · 처리 ${served}`;
}

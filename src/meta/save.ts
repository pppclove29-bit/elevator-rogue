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

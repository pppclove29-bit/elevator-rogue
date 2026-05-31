/**
 * 스토리/다이얼로그 등장 캐릭터. 데이터는 data/characters.json.
 * CMS (/cms.html) 에서 편집 가능.
 *
 * portraitKey 는 SPRITE_KEYS 의 character-* 키.
 * 이미지 없으면 DialogScene 이 plain 박스 + 이니셜 fallback.
 */
import characterData from '../../data/characters.json';

/**
 * 캐릭터 ID 는 임의 문자열. CMS 에서 새 캐릭터를 자유롭게 추가/삭제 가능.
 * 기본 4종 (narrator/mentor/owner/player) 은 dialog/튜토리얼 코드에서 직접 참조하므로 삭제 X.
 */
export type CharacterId = string;

export interface CharacterDef {
  id: CharacterId;
  displayName: string;
  defaultPortrait: string;
  portraits?: Record<string, string>;
  fallbackColor: number;
  initial: string;
}

interface JsonCharacter {
  displayName: string;
  defaultPortrait: string;
  portraits?: Record<string, string>;
  fallbackColor: string;     // "#rrggbb"
  initial: string;
}

function hexToNum(hex: string): number {
  const clean = hex.startsWith('#') ? hex.slice(1) : hex;
  return parseInt(clean, 16);
}

function build(): Record<string, CharacterDef> {
  const json = characterData as Record<string, JsonCharacter>;
  const out: Record<string, CharacterDef> = {};
  for (const [id, spec] of Object.entries(json)) {
    out[id] = {
      id,
      displayName: spec.displayName,
      defaultPortrait: spec.defaultPortrait,
      portraits: spec.portraits,
      fallbackColor: hexToNum(spec.fallbackColor),
      initial: spec.initial,
    };
  }
  return out;
}

export const CHARACTERS: Record<string, CharacterDef> = build();

/** 알 수 없는 speaker 키 fallback — 게임이 깨지지 않게 narrator 처럼 동작. */
export const FALLBACK_CHARACTER: CharacterDef = {
  id: '__unknown',
  displayName: '???',
  defaultPortrait: '',
  fallbackColor: 0x4a4a55,
  initial: '?',
};

/** 안전한 캐릭터 조회 — 없으면 fallback. */
export function getCharacter(id: string): CharacterDef {
  return CHARACTERS[id] ?? FALLBACK_CHARACTER;
}

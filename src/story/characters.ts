/**
 * 스토리/다이얼로그 등장 캐릭터.
 * portraitKey 는 SPRITE_KEYS 의 character-* 키.
 * 이미지 없으면 DialogScene 이 plain 박스 + 이니셜 fallback.
 *
 * 톤 가이드: 일상 드라마 + 약간 시니컬.
 * - mentor: 베테랑 운영진. 비꼬는 말투. 튜토리얼 가이드.
 * - owner: 사장님. 압박/평가. 가끔 등장.
 * - player: 신입 매니저(플레이어 자신). 짧은 반응 위주.
 */

export interface CharacterDef {
  id: CharacterId;
  /** 다이얼로그 박스 상단에 표시될 이름 */
  displayName: string;
  /** 기본 portrait sprite 키 */
  defaultPortrait: string;
  /** 표정/포즈 변형 (옵션) */
  portraits?: Record<string, string>;
  /** placeholder 색 (이미지 없을 때) */
  fallbackColor: number;
  /** 이니셜 (이미지 없을 때 placeholder 안에 표시) */
  initial: string;
}

export type CharacterId = 'mentor' | 'owner' | 'player' | 'narrator';

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  mentor: {
    id: 'mentor', displayName: '멘토 구판장',
    defaultPortrait: 'character-mentor-default',
    portraits: { smirk: 'character-mentor-smirk' },
    fallbackColor: 0x4a4a55, initial: '구',
  },
  owner: {
    id: 'owner', displayName: '사장님',
    defaultPortrait: 'character-owner-default',
    portraits: { angry: 'character-owner-angry' },
    fallbackColor: 0x1c1c26, initial: '사',
  },
  player: {
    id: 'player', displayName: '신입 매니저',
    defaultPortrait: 'character-player-default',
    portraits: { worried: 'character-player-worried' },
    fallbackColor: 0xb89968, initial: '나',
  },
  narrator: {
    id: 'narrator', displayName: '',
    defaultPortrait: '',
    fallbackColor: 0x0b0b10, initial: '',
  },
};

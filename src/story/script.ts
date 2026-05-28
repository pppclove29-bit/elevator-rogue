/**
 * 다이얼로그 스크립트 로더. 데이터는 data/dialog.json 에 있음.
 * CMS 페이지(/cms.html) 에서 편집 가능. 빌드시 Vite 가 JSON import 처리.
 *
 * 새 스크립트 추가: data/dialog.json 의 객체에 키 추가.
 * 캐릭터 portrait 키 등은 story/characters.ts 참고.
 */
import { CharacterId } from './characters';
// JSON import 는 Vite + tsconfig resolveJsonModule 로 자동 처리.
import dialogData from '../../data/dialog.json';

export interface DialogLine {
  speaker: CharacterId;
  text: string;
  /** characters.portraits 의 키 (예: 'smirk'). 생략 시 default. */
  portrait?: string;
}

export const SCRIPTS: Record<string, DialogLine[]> = dialogData as Record<string, DialogLine[]>;

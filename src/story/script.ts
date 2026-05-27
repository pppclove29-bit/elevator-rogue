/**
 * 다이얼로그 스크립트. id → 라인 배열.
 * 각 라인: { speaker, text, portrait? }
 *
 * 트리거 시점:
 * - intro-opening: 게임 첫 실행 (TitleScene 에서 첫 시작 클릭 시)
 * - tutorial-day1-*: Day 1 진행 중 특정 조건
 * - chapter-*: 보스 day / 마일스톤
 *
 * 톤: 일상 드라마 + 시니컬. 말풍선당 한국어 ~40자 권장.
 */
import { CharacterId } from './characters';

export interface DialogLine {
  speaker: CharacterId;
  text: string;
  /** characters.portraits 의 키 (예: 'smirk'). 생략 시 default. */
  portrait?: string;
}

export const SCRIPTS: Record<string, DialogLine[]> = {
  // ── 게임 첫 실행 인트로 ──────────────────────
  'intro-opening': [
    { speaker: 'narrator', text: '— 어느 도시, 한물간 빌딩의 1층 로비.' },
    { speaker: 'mentor',  text: '어서 와. 신입이지?' },
    { speaker: 'mentor',  text: '이 빌딩, 한때는 잘 나갔어. 지금은... 글쎄.' },
    { speaker: 'mentor',  text: '사장님이 마지막으로 베팅한 사람이 자네야.', portrait: 'smirk' },
    { speaker: 'player',  text: '그래서, 저는 뭘 하면 되죠?' },
    { speaker: 'mentor',  text: '엘리베이터를 직접 운전하진 않아. 우린 정책만 짜.' },
    { speaker: 'mentor',  text: '손님은 알아서 흐르고, 우리는 그 흐름을 받아치는 거지.' },
    { speaker: 'mentor',  text: '1일차야. 천천히 보고 익혀.' },
  ],

  // ── Day 1 튜토리얼 (Step 2 에서 트리거 연결) ──
  'tutorial-pause': [
    { speaker: 'mentor', text: 'Space 키를 누르면 일시정지. 그 사이에 정책을 손볼 수 있어.' },
    { speaker: 'mentor', text: '운영 중에 생각이 바뀌면 언제든 멈춰.' },
  ],

  'tutorial-anger': [
    { speaker: 'mentor', text: '저 빨간 표시 보여? 손님이 화났다는 뜻이야.' },
    { speaker: 'mentor', text: '5명 동시면 게임 끝. 너무 오래 기다리게 하지 마.', portrait: 'smirk' },
  ],

  'tutorial-shop': [
    { speaker: 'mentor', text: '하루 정산 시간이야. 골드로 강화나 수리를 살 수 있어.' },
    { speaker: 'mentor', text: '한 번 산 건 다시 못 무르니까 신중히.' },
  ],

  'tutorial-day1-end': [
    { speaker: 'mentor', text: '1일차 끝났네. 나쁘지 않았어.' },
    { speaker: 'owner',  text: '...기대해도 되는 거지?' },
    { speaker: 'player', text: '...열심히 하겠습니다.', portrait: 'worried' },
    { speaker: 'mentor', text: '내일부턴 진짜로 어려워진다.' },
  ],
};

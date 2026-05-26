/**
 * i18n (다국어) 시스템.
 *
 * 사용: import { t } from '../i18n/locale'; t('title.start')
 * locale 변경: setLocale('en'). 변경은 localStorage에 영구 저장.
 * 새 locale 적용은 Scene 재시작 또는 새 텍스트 생성 시점부터.
 */

export type Locale = 'ko' | 'en';

const STORAGE_KEY = 'elevator-rogue.locale';

const STRINGS = {
  ko: {
    // ── 타이틀 화면 ───────────────────────
    'title.subtitle': '하루의 트래픽을 정책으로 받아치는 로그라이크',
    'title.theme_section': '빌딩 테마',
    'title.start': '게임 시작',
    'title.new_game': '새 게임 시작',
    'title.continue': '계속하기',
    'title.help': '조작법',
    'title.options': '옵션',
    'title.version': 'v0.3 alpha',
    'title.unlock_locked_prefix': '🔒',
    'title.unlock_condition': '해금 조건: {label}',
    'title.dev_docs': '[DEV] 문서·디자인 페이지',

    // ── 공통 ────────────────────────────
    'common.gold_suffix': 'G',
    'common.close': '닫기',
    'common.confirm': '확인',
    'common.cancel': '취소',
    'common.on': 'ON',
    'common.off': 'OFF',
    'common.empty': '— 없음',

    // ── HUD ─────────────────────────────
    'hud.pause': '일시정지',
    'hud.resume': '재개',
    'hud.restart': '재시작',
    'hud.angry': '불만',
    'hud.modifier_count': '오늘의 변수: {n}',
    'hud.relic_count': '유물 {n}',
    'hud.day_year_prefix': '{year}년차 ',
    'hud.day_format': '{prefix}{month}월 {date}일 ({dow}) · {phase}',
    'hud.emergency_repair': '긴급 수리',
    'hud.repair_button': '🔧 E{id} 수리 {cost}G',

    // ── 페이즈 / 요일 ───────────────────
    'phase.morning': '출근',
    'phase.work': '근무',
    'phase.lunch': '점심',
    'phase.evening': '퇴근',
    'phase.night': '야간',
    'dow.mon': '월', 'dow.tue': '화', 'dow.wed': '수', 'dow.thu': '목',
    'dow.fri': '금', 'dow.sat': '토', 'dow.sun': '일',

    // ── 게임 오버 ───────────────────────
    'gameover.title': '게임 오버',
    'gameover.summary_title': '이번 런 결산',
    'gameover.retry': '다시 도전 (R)',
    'gameover.menu': '메인 메뉴',
    'gameover.stat.survival': '생존 시간',
    'gameover.stat.last_day': '최종 일자',
    'gameover.stat.served': '처리 승객',
    'gameover.stat.angry_served': '그중 불만 처리',
    'gameover.stat.gold': '최종 골드',
    'gameover.stat.floors': '최종 빌딩',
    'gameover.stat.elevators': '엘리베이터',
    'gameover.stat.relics': '보유 유물',
    'gameover.stat.skills': '보유 스킬',
    'gameover.stat.modifiers': '활성 변수',
    'gameover.unlock_banner': '🎉 새 테마 해금!',
    'gameover.flavor.0': '하루도 못 버틸 줄이야...',
    'gameover.flavor.3': '운영 정책을 조금만 더 다듬어보세요.',
    'gameover.flavor.7': '꽤 버텼습니다. 한 주는 채울 수 있을까?',
    'gameover.flavor.14': '베테랑 운영자의 경지에 가까워졌습니다.',
    'gameover.flavor.max': '전설적인 빌딩 운영자였습니다.',
    'gameover.acquired_relics': '획득 유물',
    'gameover.held_skills': '보유 스킬',

    // ── 상점 ────────────────────────────
    'shop.title': '상점',
    'shop.subtitle': '오늘의 매물 — 마음에 안 들면 리롤하세요. 다음 날 시작 시 매물 갱신.',
    'shop.next_day': '다음 날 시작',
    'shop.reroll_status': '리롤 {n}회 · 다음 {cost}G',
    'shop.reroll_button': '리롤 ({cost}G)',
    'shop.buy': '구매',
    'shop.no_gold': '골드 부족',
    'shop.no_items': '매물 없음 — 리롤하거나 다음 날 시작',
    'shop.tag.upgrade': '업그레이드',
    'shop.tag.upgrade_stackable': '업그레이드 · 누적',
    'shop.tag.upgrade_unique': '업그레이드 · 1회 한정',
    'shop.tag.skill': '스킬 · 1회 한정',
    'shop.tag.repair': '수리',
    'shop.repair_name': '엘리베이터 E{id} 수리',
    'shop.repair_desc': '고장 즉시 복구',

    // ── 정책 편집기 ─────────────────────
    'policy.title': '엘리베이터 운영 정책',
    'policy.resume': '재개 (Space)',
    'policy.hint': '엘리베이터별로 운영 범위와 픽업 정책을 설정하세요.',
    'policy.floor_range': '운영 층 범위',
    'policy.min_floor': '최저층',
    'policy.max_floor': '최고층',
    'policy.unlimited': '무제한',
    'policy.parity': '층 패리티',
    'policy.parity.all': '모두',
    'policy.parity.even': '짝수층(2,4,…)',
    'policy.parity.odd': '홀수층(1,3,…)',
    'policy.pickup_mode': '픽업 대상',
    'policy.pickup.any': '모든 호출',
    'policy.pickup.lobby_only': '1F(로비)에서만',
    'policy.pickup.role': '특정 역할만',
    'policy.unload_when_full': '정원 풀이면 즉시 하차',

    // ── 모디파이어 / 렐릭 / 보상 ────────
    'modifier.title': '오늘의 변수',
    'modifier.subtitle': '하루 한정 모디파이어 3장 중 1택 — SKIP 없음',
    'modifier.tag.debuff': 'DEBUFF',
    'modifier.tag.buff': 'BUFF',
    'modifier.tag.mixed': 'MIXED',
    'modifier.note': '오늘 하루만 지속',
    'relic.title': '운명의 선택 — 유물',
    'relic.subtitle': '이번 런 동안 영구 지속. 3장 중 1택 (SKIP 가능)',
    'relic.tag.pure': 'RELIC',
    'relic.tag.tradeoff': 'RELIC · TRADE',
    'relic.tag.curse': 'RELIC · CURSE',
    'relic.note': '이번 런 동안 영구',
    'reward.take': '선택',
    'reward.skip': 'SKIP',

    // ── 옵션 ────────────────────────────
    'options.title': '옵션',
    'options.section.sound': '사운드 (구현 예정)',
    'options.section.gameplay': '게임 플레이',
    'options.section.display': '화면',
    'options.section.data': '데이터',
    'options.section.language': '언어',
    'options.master_volume': '마스터',
    'options.sfx_volume': '효과음 (SFX)',
    'options.bgm_volume': '배경 음악 (BGM)',
    'options.default_speed': '기본 게임 속도',
    'options.show_tutorial': '첫 진입 시 도움말 자동 표시',
    'options.fullscreen': '풀스크린',
    'options.zoom': '화면 줌',
    'options.reset_data': '게임 데이터 초기화',
    'options.reset_desc': '(저장된 런 + 진행도 + 해금 모두 삭제)',
    'options.reset_button': '초기화',
    'options.language.ko': '한국어',
    'options.language.en': 'English',

    // ── 도움말 ──────────────────────────
    'help.welcome': '환영합니다 — 빠른 가이드',
    'help.title': '조작법 / 가이드',
    'help.close': '닫기 (ESC)',
  },

  en: {
    // ── Title ──────────────────────────
    'title.subtitle': 'A roguelike where you parry daily traffic with policies',
    'title.theme_section': 'Building Theme',
    'title.start': 'Start Game',
    'title.new_game': 'New Game',
    'title.continue': 'Continue',
    'title.help': 'How to Play',
    'title.options': 'Options',
    'title.version': 'v0.3 alpha',
    'title.unlock_locked_prefix': '🔒',
    'title.unlock_condition': 'Unlock: {label}',
    'title.dev_docs': '[DEV] Docs / Design',

    // ── Common ─────────────────────────
    'common.gold_suffix': 'G',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.cancel': 'Cancel',
    'common.on': 'ON',
    'common.off': 'OFF',
    'common.empty': '— none',

    // ── HUD ────────────────────────────
    'hud.pause': 'Pause',
    'hud.resume': 'Resume',
    'hud.restart': 'Restart',
    'hud.angry': 'angry',
    'hud.modifier_count': "Today's mods: {n}",
    'hud.relic_count': 'Relics {n}',
    'hud.day_year_prefix': 'Year {year} ',
    'hud.day_format': '{prefix}{month}/{date} ({dow}) · {phase}',
    'hud.emergency_repair': 'EMERGENCY',
    'hud.repair_button': '🔧 E{id} Repair {cost}G',

    // ── Phase / Day ────────────────────
    'phase.morning': 'Morning',
    'phase.work': 'Work',
    'phase.lunch': 'Lunch',
    'phase.evening': 'Evening',
    'phase.night': 'Night',
    'dow.mon': 'Mon', 'dow.tue': 'Tue', 'dow.wed': 'Wed', 'dow.thu': 'Thu',
    'dow.fri': 'Fri', 'dow.sat': 'Sat', 'dow.sun': 'Sun',

    // ── Game Over ──────────────────────
    'gameover.title': 'GAME OVER',
    'gameover.summary_title': 'Run Summary',
    'gameover.retry': 'Retry (R)',
    'gameover.menu': 'Main Menu',
    'gameover.stat.survival': 'Time Survived',
    'gameover.stat.last_day': 'Last Day',
    'gameover.stat.served': 'Passengers Served',
    'gameover.stat.angry_served': 'Angry Served',
    'gameover.stat.gold': 'Final Gold',
    'gameover.stat.floors': 'Final Building',
    'gameover.stat.elevators': 'Elevators',
    'gameover.stat.relics': 'Relics',
    'gameover.stat.skills': 'Skills',
    'gameover.stat.modifiers': 'Active Mods',
    'gameover.unlock_banner': '🎉 New Theme Unlocked!',
    'gameover.flavor.0': "Couldn't even last a day...",
    'gameover.flavor.3': 'Polish your operating policies a bit more.',
    'gameover.flavor.7': 'A solid run. Can you finish a full week?',
    'gameover.flavor.14': 'Approaching veteran operator status.',
    'gameover.flavor.max': 'A legendary building operator.',
    'gameover.acquired_relics': 'Acquired Relics',
    'gameover.held_skills': 'Active Skills',

    // ── Shop ───────────────────────────
    'shop.title': 'Shop',
    'shop.subtitle': "Today's stock — reroll if you don't like it. Refreshes each night.",
    'shop.next_day': 'Start Next Day',
    'shop.reroll_status': 'Rerolls {n} · Next {cost}G',
    'shop.reroll_button': 'Reroll ({cost}G)',
    'shop.buy': 'Buy',
    'shop.no_gold': 'No Gold',
    'shop.no_items': 'No items — reroll or start the next day',
    'shop.tag.upgrade': 'UPGRADE',
    'shop.tag.upgrade_stackable': 'UPGRADE · STACK',
    'shop.tag.upgrade_unique': 'UPGRADE · ONCE',
    'shop.tag.skill': 'SKILL · ONCE',
    'shop.tag.repair': 'REPAIR',
    'shop.repair_name': 'Repair Elevator E{id}',
    'shop.repair_desc': 'Instant breakdown recovery',

    // ── Policy ─────────────────────────
    'policy.title': 'Elevator Policy',
    'policy.resume': 'Resume (Space)',
    'policy.hint': 'Configure operating range and pickup policy per elevator.',
    'policy.floor_range': 'Operating Floor Range',
    'policy.min_floor': 'Min',
    'policy.max_floor': 'Max',
    'policy.unlimited': 'Unlimited',
    'policy.parity': 'Floor Parity',
    'policy.parity.all': 'All',
    'policy.parity.even': 'Even (2,4,…)',
    'policy.parity.odd': 'Odd (1,3,…)',
    'policy.pickup_mode': 'Pickup Target',
    'policy.pickup.any': 'Any call',
    'policy.pickup.lobby_only': 'Lobby only',
    'policy.pickup.role': 'Specific role',
    'policy.unload_when_full': 'Unload first when full',

    // ── Modifier / Relic / Reward ──────
    'modifier.title': "Today's Modifier",
    'modifier.subtitle': "Daily modifier — pick 1 of 3 (no skip)",
    'modifier.tag.debuff': 'DEBUFF',
    'modifier.tag.buff': 'BUFF',
    'modifier.tag.mixed': 'MIXED',
    'modifier.note': 'Lasts today only',
    'relic.title': 'Fated Choice — Relic',
    'relic.subtitle': 'Permanent for this run. Pick 1 of 3 (skip allowed)',
    'relic.tag.pure': 'RELIC',
    'relic.tag.tradeoff': 'RELIC · TRADE',
    'relic.tag.curse': 'RELIC · CURSE',
    'relic.note': 'Permanent this run',
    'reward.take': 'Take',
    'reward.skip': 'Skip',

    // ── Options ────────────────────────
    'options.title': 'Options',
    'options.section.sound': 'Sound (TBD)',
    'options.section.gameplay': 'Gameplay',
    'options.section.display': 'Display',
    'options.section.data': 'Data',
    'options.section.language': 'Language',
    'options.master_volume': 'Master',
    'options.sfx_volume': 'SFX',
    'options.bgm_volume': 'BGM',
    'options.default_speed': 'Default Game Speed',
    'options.show_tutorial': 'Show tutorial on first start',
    'options.fullscreen': 'Fullscreen',
    'options.zoom': 'Display Zoom',
    'options.reset_data': 'Reset All Data',
    'options.reset_desc': '(Saved run + progression + unlocks all deleted)',
    'options.reset_button': 'Reset',
    'options.language.ko': '한국어',
    'options.language.en': 'English',

    // ── Help ───────────────────────────
    'help.welcome': 'Welcome — Quick Guide',
    'help.title': 'How to Play / Guide',
    'help.close': 'Close (ESC)',
  },
} as const;

type StringKey = keyof typeof STRINGS['ko'];

let currentLocale: Locale = (localStorage.getItem(STORAGE_KEY) as Locale) || 'ko';

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale): void {
  currentLocale = locale;
  try { localStorage.setItem(STORAGE_KEY, locale); } catch (e) { console.warn('[locale] save fail', e); }
}

/**
 * 키 → 현재 locale의 문자열. {placeholder} 치환 지원.
 * 키가 없으면 키 자체를 반환 (디버깅 도움).
 */
export function t(key: StringKey, params?: Record<string, string | number>): string {
  const dict = STRINGS[currentLocale] ?? STRINGS.ko;
  let s: string = dict[key] ?? STRINGS.ko[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return s;
}

export const SUPPORTED_LOCALES: Locale[] = ['ko', 'en'];

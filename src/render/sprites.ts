/**
 * 스프라이트(이미지 에셋) 시스템 — 사운드 시스템과 미러링.
 *
 * 정책:
 * - 모든 게임 비주얼 요소(엘베/승객/층/환경/UI 아이콘)는 키로 식별.
 * - 파일이 있으면 image 렌더, 없으면 기존 도형 fallback (silent).
 * - 파일은 public/sprites/<key>.png (BootScene 이 preload, loaderror 흡수).
 * - 새 키 추가: SPRITE_KEYS 에 메타만 추가하면 /sprites.html 카탈로그 자동 갱신.
 *
 * 스타일 가이드: 픽셀 아트 32~64px. 색 8~16개 팔레트 권장.
 *   - elevator: 64×96
 *   - passenger: 16×24 (작게)
 *   - floor-icon: 32×32 (역할 표식)
 *   - building/decor: 자유
 *
 * 트리거 시점 / 추천 사이즈는 SPRITE_KEYS 카탈로그 참고.
 */
import Phaser from 'phaser';

export type SpriteCategory = 'elevator' | 'passenger' | 'floor' | 'environment' | 'ui' | 'decoration' | 'character';

export interface SpriteMeta {
  key: string;
  category: SpriteCategory;
  /** 한국어 라벨 */
  label: string;
  /** 어디서 쓰이는지 */
  usage: string;
  /** 추천 사이즈 ("64x96" 등). 표시용. */
  size: string;
  /** 필수/선택 */
  priority: 'must' | 'nice';
  /** 현재 도형 fallback 설명 (없으면 빈 string) */
  fallback?: string;
}

/**
 * 게임 내 모든 스프라이트 키. (단일 진실원)
 * /sprites.html 페이지가 이 배열을 import해서 카탈로그 표시.
 *
 * 필수(must) 우선순위:
 * - 엘베 cab 1종 (게임에서 가장 자주 보임)
 * - 승객 normal 1종 (대부분 승객)
 * - 층 lobby 1종 (1F)
 * 위 셋만 채워도 게임 분위기가 확 바뀜.
 */
export const SPRITE_KEYS: readonly SpriteMeta[] = [
  // ── 엘리베이터 ────────────────────────────────
  { key: 'elevator-cab',         category: 'elevator', label: '엘베 cab (정상)',  usage: '엘베 박스 (idle/moving)', size: '64x96',  priority: 'must', fallback: '회색 사각형' },
  { key: 'elevator-cab-broken',  category: 'elevator', label: '엘베 cab (고장)',  usage: '엘베 broken 상태',       size: '64x96',  priority: 'nice', fallback: '빨간 사각형 + 깜빡임' },
  { key: 'elevator-door-open',   category: 'elevator', label: '엘베 문 (열림)',   usage: 'loading 상태',            size: '64x16',  priority: 'nice', fallback: '없음' },
  { key: 'elevator-door-closed', category: 'elevator', label: '엘베 문 (닫힘)',   usage: 'idle/moving 상태',        size: '64x96',  priority: 'nice', fallback: '단색 사각형' },
  { key: 'elevator-cable',       category: 'elevator', label: '엘베 케이블',      usage: 'shaft 가운데 세로 라인',  size: '4x*',    priority: 'nice', fallback: '회색 세로선' },

  // ── 승객 (14 archetypes) ─────────────────────
  { key: 'passenger-normal',     category: 'passenger', label: '일반',         usage: '큐/엘베/방문 sprite',   size: '16x24', priority: 'must', fallback: '흰 사각형' },
  { key: 'passenger-vip',        category: 'passenger', label: 'VIP',          usage: '큐/엘베/방문 sprite',   size: '16x24', priority: 'nice', fallback: '금색 사각형' },
  { key: 'passenger-elderly',    category: 'passenger', label: '노약자',       usage: '큐/엘베/방문 sprite',   size: '16x24', priority: 'nice', fallback: '보라 사각형' },
  { key: 'passenger-suit',       category: 'passenger', label: '비즈니스',     usage: '큐/엘베/방문 sprite',   size: '16x24', priority: 'nice', fallback: '파랑 사각형' },
  { key: 'passenger-group',      category: 'passenger', label: '단체',         usage: '큐/엘베/방문 sprite',   size: '16x24', priority: 'nice', fallback: '주황 사각형' },
  { key: 'passenger-baggage',    category: 'passenger', label: '짐꾼',         usage: '큐/엘베/방문 sprite',   size: '20x28', priority: 'nice', fallback: '큰 갈색 사각형' },
  { key: 'passenger-shady',      category: 'passenger', label: '의심 인물',    usage: '큐/엘베/방문 sprite',   size: '16x24', priority: 'nice', fallback: '어두운 사각형' },
  { key: 'passenger-tourist',    category: 'passenger', label: '관광객',       usage: '큐/엘베/방문 sprite',   size: '16x24', priority: 'nice', fallback: '청록 사각형' },
  { key: 'passenger-staff',      category: 'passenger', label: '직원',         usage: '큐/엘베/방문 sprite',   size: '16x24', priority: 'nice', fallback: '회색 사각형' },
  { key: 'passenger-thief',      category: 'passenger', label: '도둑',         usage: '큐/엘베/방문 sprite',   size: '16x24', priority: 'must', fallback: '검정+빨강 사각형' },
  { key: 'passenger-patient',    category: 'passenger', label: '환자',         usage: '큐/엘베/방문 sprite',   size: '16x24', priority: 'nice', fallback: '연한 회색 사각형' },
  { key: 'passenger-medical',    category: 'passenger', label: '의료진',       usage: '큐/엘베/방문 sprite',   size: '16x24', priority: 'nice', fallback: '흰 + 빨간 사각형' },
  { key: 'passenger-hotel-guest', category: 'passenger', label: '호텔 손님',   usage: '큐/엘베/방문 sprite',   size: '20x28', priority: 'nice', fallback: '큰 베이지 사각형' },
  { key: 'passenger-crew',       category: 'passenger', label: '승무원',       usage: '큐/엘베/방문 sprite',   size: '16x24', priority: 'nice', fallback: '네이비 사각형' },

  // ── 층 역할 아이콘 (11종) ─────────────────────
  { key: 'floor-lobby',      category: 'floor', label: '로비',     usage: '1F 좌측 배지/라벨',   size: '32x32', priority: 'must', fallback: '회색 사각형' },
  { key: 'floor-office',     category: 'floor', label: '사무실',   usage: '층 좌측 배지/라벨',   size: '32x32', priority: 'nice', fallback: '파랑 사각형' },
  { key: 'floor-restaurant', category: 'floor', label: '식당가',   usage: '층 좌측 배지/라벨',   size: '32x32', priority: 'nice', fallback: '주황 사각형' },
  { key: 'floor-rooftop',    category: 'floor', label: '옥상',     usage: '최상층 배지',          size: '32x32', priority: 'nice', fallback: '청록 사각형' },
  { key: 'floor-basement',   category: 'floor', label: '지하',     usage: '지하층 배지',          size: '32x32', priority: 'nice', fallback: '암회색 사각형' },
  { key: 'floor-gym',        category: 'floor', label: '체육관',   usage: '체육관 배지',          size: '32x32', priority: 'nice', fallback: '녹색 사각형' },
  { key: 'floor-mall',       category: 'floor', label: '쇼핑몰',   usage: '쇼핑몰 배지',          size: '32x32', priority: 'nice', fallback: '핑크 사각형' },
  { key: 'floor-medical',    category: 'floor', label: '의료',     usage: '의료층 배지',          size: '32x32', priority: 'nice', fallback: '흰+빨강 사각형' },
  { key: 'floor-hotel-room', category: 'floor', label: '호텔 객실', usage: '호텔 객실 배지',       size: '32x32', priority: 'nice', fallback: '베이지 사각형' },
  { key: 'floor-gate',       category: 'floor', label: '게이트',   usage: '공항 게이트 배지',      size: '32x32', priority: 'nice', fallback: '파랑 사각형' },
  { key: 'floor-checkin',    category: 'floor', label: '체크인',   usage: '체크인 카운터 배지',    size: '32x32', priority: 'nice', fallback: '갈색 사각형' },

  // ── 환경 (입구/계단/시설) ─────────────────────
  { key: 'env-subway',      category: 'environment', label: '지하철 입구',    usage: '1F 좌측 외부',        size: '48x32', priority: 'nice', fallback: '단색 사각형' },
  { key: 'env-escalator',   category: 'environment', label: '에스컬레이터',   usage: '층 사이 우측',        size: '32x64', priority: 'nice', fallback: '단색 선' },
  { key: 'env-stairs',      category: 'environment', label: '계단',           usage: '층 사이 우측',        size: '32x64', priority: 'nice', fallback: '단색 선' },
  { key: 'env-helipad',     category: 'environment', label: '헬리패드',       usage: '옥상 우측',           size: '64x32', priority: 'nice', fallback: 'H 마크' },
  { key: 'env-toilet-clean', category: 'environment', label: '화장실 (깨끗)',  usage: '화장실 보유 층 우측', size: '24x24', priority: 'nice', fallback: '청색 도트' },
  { key: 'env-toilet-dirty', category: 'environment', label: '화장실 (더러움)', usage: 'cleanliness < 30',  size: '24x24', priority: 'nice', fallback: '빨간 도트' },

  // ── UI 아이콘 (HUD) ──────────────────────────
  { key: 'ui-icon-gold',    category: 'ui', label: '골드 아이콘',  usage: 'HUD 골드 표시',  size: '16x16', priority: 'nice', fallback: 'G 텍스트' },
  { key: 'ui-icon-anger',   category: 'ui', label: '분노 아이콘',  usage: 'HUD 분노 표시',  size: '16x16', priority: 'nice', fallback: '느낌표' },
  { key: 'ui-icon-clock',   category: 'ui', label: '시계 아이콘',  usage: 'HUD 페이즈 표시', size: '16x16', priority: 'nice', fallback: '시계 텍스트' },
  { key: 'ui-icon-passenger', category: 'ui', label: '승객 아이콘', usage: 'HUD 처리 수 표시', size: '16x16', priority: 'nice', fallback: '사람 텍스트' },
  { key: 'ui-icon-elevator', category: 'ui', label: '엘베 아이콘', usage: '정책 편집기 헤더', size: '16x16', priority: 'nice', fallback: 'E 텍스트' },

  // ── 데코 (배경/타이틀) ────────────────────────
  { key: 'decor-wall-tile', category: 'decoration', label: '외벽 타일',    usage: '빌딩 외벽 반복 패턴',     size: '32x32', priority: 'nice', fallback: '단색' },
  { key: 'decor-window-lit', category: 'decoration', label: '창문 (불 켜짐)', usage: '빌딩 픽셀 디테일 점',   size: '8x12',  priority: 'nice', fallback: '노란 점' },
  { key: 'decor-window-dark', category: 'decoration', label: '창문 (꺼짐)', usage: '빌딩 픽셀 디테일 점',     size: '8x12',  priority: 'nice', fallback: '회색 점' },
  { key: 'decor-title-building', category: 'decoration', label: '타이틀 빌딩 실루엣', usage: 'TitleScene 좌측 큰 그림', size: '256x480', priority: 'nice', fallback: '도형 빌딩' },

  // ── 캐릭터 portrait (다이얼로그) ──────────────
  // 비주얼 노벨 스타일. 256x384 추천. 투명 배경 PNG.
  // 없으면 둥근 사각형 placeholder + 이니셜.
  { key: 'character-mentor-default', category: 'character', label: '멘토 (기본)',  usage: '튜토리얼/일상 다이얼로그', size: '256x384', priority: 'must', fallback: '회색 사각형 + 이니셜' },
  { key: 'character-mentor-smirk',   category: 'character', label: '멘토 (시니컬)', usage: '비꼬는 대사 시',          size: '256x384', priority: 'nice', fallback: '동일' },
  { key: 'character-owner-default',  category: 'character', label: '사장님 (기본)', usage: '압박/평가 다이얼로그',     size: '256x384', priority: 'nice', fallback: '검은 사각형 + 이니셜' },
  { key: 'character-owner-angry',    category: 'character', label: '사장님 (화남)', usage: '실패/경고 다이얼로그',     size: '256x384', priority: 'nice', fallback: '동일' },
  { key: 'character-player-default', category: 'character', label: '신입 매니저 (기본)', usage: '플레이어 자신 대사', size: '256x384', priority: 'nice', fallback: '베이지 사각형 + 이니셜' },
  { key: 'character-player-worried', category: 'character', label: '신입 매니저 (걱정)', usage: '위기 상황 대사',     size: '256x384', priority: 'nice', fallback: '동일' },
];

// ──────────────────────────────────────────────────────────
// 렌더 helper — sprite 있으면 image, 없으면 fallback 콜백 실행
// ──────────────────────────────────────────────────────────

/**
 * 키에 해당하는 이미지가 cache 에 있는지.
 * 한 frame 에 여러 번 호출되므로 try/catch 없이 가벼움.
 */
export function hasSprite(scene: Phaser.Scene, key: string): boolean {
  return scene.textures.exists(key);
}

/**
 * sprite 가 있으면 add.image, 없으면 fallback() 호출.
 * 반환값: 이미지 객체 or fallback 결과.
 *
 * 호출 예:
 *   tryImage(scene, 'elevator-cab', cx, cy,
 *     () => scene.add.rectangle(cx, cy, 64, 96, 0x4a90e2));
 */
export function tryImage<T>(
  scene: Phaser.Scene,
  key: string,
  x: number,
  y: number,
  fallback: () => T,
): Phaser.GameObjects.Image | T {
  if (hasSprite(scene, key)) {
    return scene.add.image(x, y, key);
  }
  return fallback();
}

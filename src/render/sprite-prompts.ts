/**
 * 각 sprite 키별 AI 이미지 생성용 프롬프트.
 * - 영어 (AI 도구 친화 — PixelLab/Retro Diffusion/SD/Midjourney 등)
 * - 게임 톤 일관성 위해 공통 suffix 자동 결합
 *
 * 사용: /sprites.html 카탈로그 페이지에서 "복사" 버튼으로 클립보드 → AI 도구에 붙여넣기.
 */

/** 모든 프롬프트에 공통으로 붙는 suffix — 게임 톤 통일 (다크 UI, 한국 도시 빌딩, 픽셀 그리드 정확). */
const COMMON_SUFFIX = ', pixel art, sharp pixel grid, transparent background, 16-color palette, ENDESGA-16 style, retro indie game asset, front view';

/** key → prompt. 사이즈는 SPRITE_KEYS 의 size 를 참고. */
export const SPRITE_PROMPTS: Record<string, string> = {
  // ── 엘리베이터 ────────────────────────────────
  'elevator-cab': 'small retro elevator cab interior, metallic blue panels, yellow accent strip at bottom, small floor display screen with up arrow at top, 64x96 px, vertical rectangular box, two-tone shading',
  'elevator-cab-broken': 'broken elevator cab, sparking wires, red warning light, cracked panels, smoke wisp, exclamation mark inside, 64x96 px, vertical box, distressed look',
  'elevator-door-open': 'elevator doors fully opened, split horizontally, brushed metal panels, thin shadow inside, top-down compressed view, 64x16 px wide horizontal strip',
  'elevator-door-closed': 'elevator doors closed, dark center seam, metallic panels with vertical grooves, two-tone gray, 64x96 px, tall rectangular',
  'elevator-cable': 'thin vertical elevator cable, dark gray steel rope, simple tileable strip, 4 px wide repeating vertical line',

  // ── 승객 (14 archetypes) ─────────────────────
  'passenger-normal': 'simple pixel character, casual office worker, plain shirt, neutral pose standing, ordinary appearance, 16x24 px, head + body + small legs',
  'passenger-vip': 'pixel character VIP businessman, golden suit accent, confident posture, slight smirk, premium look, 16x24 px, head + body',
  'passenger-elderly': 'pixel elderly character with cane, gray hair, hunched posture, purple cardigan, slow gentle look, 16x24 px',
  'passenger-suit': 'pixel businessman in blue suit and tie, briefcase, sharp posture, hurried look, 16x24 px',
  'passenger-group': 'pixel three friends standing together as group, orange shirts, casual chatty pose, side by side trio, 16x24 px',
  'passenger-baggage': 'pixel character carrying large suitcase, brown coat, big bag taking space, 20x28 px, wide silhouette',
  'passenger-shady': 'pixel suspicious character in dark hoodie, hood up, dark red tones, shifty pose, 16x24 px',
  'passenger-tourist': 'pixel tourist with camera, green shirt, sun hat, bright cheerful look, 16x24 px',
  'passenger-staff': 'pixel maintenance staff in gray work uniform, name tag, neutral pose, 16x24 px',
  'passenger-thief': 'pixel thief character, black hoodie with red mask accent, sneaky crouching posture, eyes shifted sideways, 16x24 px',
  'passenger-patient': 'pixel hospital patient in light pink gown, IV pole or bandage, weak posture, 16x24 px, soft pale palette',
  'passenger-medical': 'pixel doctor in white coat with red cross accent, stethoscope, calm professional pose, 16x24 px',
  'passenger-hotel-guest': 'pixel hotel guest with rolling suitcase, beige coat, comfortable travel look, 20x28 px',
  'passenger-crew': 'pixel airline crew member, navy blue uniform, scarf, professional flight attendant pose, 16x24 px',

  // ── 층 역할 아이콘 ────────────────────────────
  'floor-lobby': 'flat icon symbol for hotel lobby, sofa or chandelier silhouette, gray-blue palette, simple emblem, 32x32 px, dark rounded square background',
  'floor-office': 'flat icon symbol for office floor, desk with monitor silhouette, blue palette, professional emblem, 32x32 px, dark rounded square background',
  'floor-restaurant': 'flat icon symbol for restaurant, fork and spoon silhouette, orange palette, simple emblem, 32x32 px, dark rounded square background',
  'floor-rooftop': 'flat icon symbol for rooftop, sun and small antenna silhouette, cyan palette, simple emblem, 32x32 px, dark rounded square',
  'floor-basement': 'flat icon symbol for basement, downward arrow with brick texture, dark gray palette, simple emblem, 32x32 px',
  'floor-gym': 'flat icon symbol for gym, dumbbell silhouette, green palette, simple emblem, 32x32 px, dark rounded square',
  'floor-mall': 'flat icon symbol for shopping mall, shopping bag silhouette, pink palette, simple emblem, 32x32 px',
  'floor-medical': 'flat icon symbol for medical floor, red cross on white background, hospital emblem, 32x32 px, clean and clinical',
  'floor-hotel-room': 'flat icon symbol for hotel room, bed silhouette, beige palette, simple emblem, 32x32 px, dark rounded square',
  'floor-gate': 'flat icon symbol for airport gate, airplane silhouette, blue palette, departure board feeling, 32x32 px',
  'floor-checkin': 'flat icon symbol for check-in counter, podium with luggage, brown palette, simple emblem, 32x32 px',

  // ── 환경 ──────────────────────────────────────
  'env-subway': 'pixel subway entrance, dark stairwell going down with metal railings, M sign above, 48x32 px, side-view perspective',
  'env-escalator': 'pixel escalator going up, diagonal metal steps, side view with handrail, green safety strip, 32x64 px, animated feel',
  'env-stairs': 'pixel stairs going up, side view, simple gray steps, 32x64 px, neutral lighting',
  'env-helipad': 'pixel helipad on rooftop, white H symbol on dark square, faded landing markings, 64x32 px, top-down view',
  'env-toilet-clean': 'pixel bathroom symbol clean and shiny, white tile background, blue droplet sparkle, 24x24 px',
  'env-toilet-dirty': 'pixel bathroom symbol dirty and gross, sickly green-brown tones, fly or stink lines, 24x24 px, distressed',

  // ── UI 아이콘 (HUD) ──────────────────────────
  'ui-icon-gold': 'pixel gold coin icon, bright yellow with G letter or shiny edge, simple circular emblem, 16x16 px, dark background',
  'ui-icon-anger': 'pixel anger icon, red exclamation mark with sharp edges, alarmed look, 16x16 px, dark background',
  'ui-icon-clock': 'pixel clock icon, circular face with hour/minute hands, neutral gray, 16x16 px, dark background',
  'ui-icon-passenger': 'pixel person silhouette icon, generic standing figure, neutral gray, 16x16 px, dark background',
  'ui-icon-elevator': 'pixel elevator icon, simple box with up/down arrow, blue accent, 16x16 px, dark background',

  // ── 데코 ──────────────────────────────────────
  'decor-wall-tile': 'pixel building exterior wall tile, dark gray concrete texture, subtle dotted pattern, 32x32 px, seamlessly tileable',
  'decor-window-lit': 'pixel building window lit at night, warm yellow square divided by cross frame, 8x12 px, glowing feel',
  'decor-window-dark': 'pixel building window unlit, dark gray rectangle divided by cross frame, 8x12 px, empty office at night',
  'decor-title-building': 'pixel art tall city building silhouette at night, many small glowing windows, retro 8-bit style, 256x480 px, vertical composition, Seoul skyline mood',

  // ── 캐릭터 portrait (다이얼로그) ──────────────
  'character-mentor-default': 'visual novel anime portrait, korean man in late 30s, gray business suit, slightly cynical neutral expression, half-body shot, 256x384 px, soft anime line art, transparent background, slight stubble, knowing tired eyes, building manager vibe',
  'character-mentor-smirk': 'visual novel anime portrait, same korean man in late 30s, gray business suit, smirking sardonic expression, half-body shot, 256x384 px, anime style, transparent background, raised eyebrow, condescending grin',
  'character-owner-default': 'visual novel anime portrait, korean man in 50s, black premium business suit, stern serious expression, half-body shot, 256x384 px, anime style, transparent background, gray streaks in hair, authoritative aura, building owner vibe',
  'character-owner-angry': 'visual novel anime portrait, same korean man in 50s, black suit, furious expression with frowning brow, half-body shot, 256x384 px, anime style, transparent background, red anger marks, intense glare',
  'character-player-default': 'visual novel anime portrait, korean young adult in 20s, white shirt with loosened tie, slightly nervous neutral expression, half-body shot, 256x384 px, anime style, transparent background, freshly hired employee vibe, slight bags under eyes',
  'character-player-worried': 'visual novel anime portrait, same korean young adult in 20s, white shirt, worried anxious expression, half-body shot, 256x384 px, anime style, transparent background, hand near face, concerned eyebrows, sweat drop',
};

/** key → 공통 suffix 가 결합된 최종 프롬프트 */
export function fullPromptFor(key: string): string {
  const base = SPRITE_PROMPTS[key];
  if (!base) return '';
  // 캐릭터 portrait 는 anime 스타일이라 픽셀 suffix 안 붙임
  if (key.startsWith('character-')) return base;
  return base + COMMON_SUFFIX;
}

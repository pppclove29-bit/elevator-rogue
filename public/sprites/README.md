# 스프라이트 파일 가이드

여기에 `<key>.png` 파일을 넣으면 게임이 자동 로드해서 도형 대신 image 렌더링한다.
**파일이 없어도 게임은 동작한다** — 로드 실패는 silent fallback (기존 도형 그대로).

상세 카탈로그(트리거/추천 사이즈/우선순위)는
`http://localhost:5173/sprites.html` 또는 빌드 후 `/sprites.html` 에서 확인.

## 스타일

- **픽셀 아트 32~64px** (사용자 결정)
- 색 팔레트 8~16개 권장
- 픽셀 정렬 — 0.5px 안 됨 (Phaser는 그대로 보여줌, 보간 시 흐림)
- 투명 배경 PNG

## 키 목록 (단일 진실원: [src/render/sprites.ts](../../src/render/sprites.ts) `SPRITE_KEYS`)

### 우선순위 (must) — 게임 분위기에 가장 큰 영향
- `elevator-cab.png` — 엘베 cab (64×96)
- `passenger-normal.png` — 일반 승객 (16×24)
- `passenger-thief.png` — 도둑 (16×24, 어두운 톤 + 빨간 포인트)
- `floor-lobby.png` — 1F 로비 배지 (32×32)

위 4개만 채워도 톤이 확 바뀐다.

### 카테고리별 (nice)
- **elevator**: cab-broken, door-open/closed, cable
- **passenger** (13종): vip, elderly, suit, group, baggage, shady, tourist, staff, patient, medical, hotel-guest, crew
- **floor** (10종): office, restaurant, rooftop, basement, gym, mall, medical, hotel-room, gate, checkin
- **environment**: subway, escalator, stairs, helipad, toilet-clean, toilet-dirty
- **ui** (HUD 아이콘): gold, anger, clock, passenger, elevator
- **decoration**: wall-tile, window-lit, window-dark, title-building

## 권장 소스 (CC0/CC-BY)

- [opengameart.org](https://opengameart.org) — 게임용 픽셀 아트 풍부
- [itch.io free assets](https://itch.io/game-assets/free/tag-pixel-art) — 픽셀 아트 팩
- [kenney.nl](https://kenney.nl/assets) — CC0 게임 자산 대량
- [craftpix.net](https://craftpix.net/freebies/) — 무료 픽셀 셋
- 본인 작업: Aseprite / Piskel (무료)

## 포맷 / 사이즈

- PNG (투명 알파 채널 권장)
- 픽셀 아트는 항상 nearest-neighbor 업스케일. Phaser 는 기본적으로 그대로 렌더.
- BootScene 이 preload — 새 키 추가 시 자동 시도.

## 새 키 추가 절차

1. [src/render/sprites.ts](../../src/render/sprites.ts) `SPRITE_KEYS` 에 `{ key, category, label, usage, size, priority, fallback }` 항목 추가.
2. 해당 렌더 코드(예: `BuildingView`, `PassengerSprites`)를 `tryImage(scene, key, ...)` 패턴으로 변경.
3. `public/sprites/<key>.png` 파일 두기 (선택 — 나중에 OK).
4. `/sprites.html` 카탈로그 자동 갱신.

## 현재 적용된 렌더 위치

- (TODO) elevator cab — BuildingView 의 엘베 박스
- (TODO) passenger sprite — PassengerSprites 의 도형
- 그 외는 카탈로그만 준비 — 점진 적용.

# Claude Code 컨텍스트 — Elevator Rogue

다음 세션 시작 시 빠르게 컨텍스트 잡기 위한 요약. **TODO.md**도 함께 보세요.

## 게임 한 줄

**"하루의 트래픽을 정책으로 받아치는 로그라이크"** — 엘리베이터를 직접 운전 X. 운영 정책을 설정 + 골드 경제 + 메타 진행(테마 해금/공휴일).

## 스택

- **Phaser 3** + **TypeScript (strict)** + **Vite**
- 빌드: `pnpm dev` / `pnpm build`
- PC 게임 출시 목표 (Steam — Electron 래핑 예정)

## 코드 구조

```
src/
├── main.ts                 # Phaser.Game 부트 + 줌 단축키 (+/-/0)
├── config.ts               # 상수 (TICK_MS, FONT, COLORS, INITIAL_*)
├── i18n/
│   ├── locale.ts           # t() + ko/en STRINGS 사전
│   └── cards.ts            # 카드 다국어 (modifier/relic/upgrade/skill)
├── domain/                 # 시뮬 코어 (Phaser 의존 X)
│   ├── types.ts            # SimState/SimParams/Floor/Elevator/Passenger/Policy
│   ├── building.ts         # 빌딩 생성, 층 추가 (rooftop 위로 끼움)
│   ├── phase.ts            # 페이즈/요일/캘린더 (Day 1 = 1월 1일 월요일)
│   ├── policy.ts           # decide() — 정책 form 기반 의사결정
│   ├── archetypes.ts       # 승객 14종 (normal/vip/thief/patient/medical 등)
│   ├── spawner.ts          # 스폰 + 에스컬레이터/지하철 흡수 + 도둑 1F 강제
│   ├── simulation.ts       # tick() — 메인 루프 + 고장/수리
│   └── rng.ts              # mulberry32 seedable
├── meta/                   # 메타 시스템
│   ├── upgrades.ts, skills.ts, modifiers.ts, relics.ts, events.ts
│   ├── themes.ts           # 4테마 (오피스/호텔/병원/공항)
│   ├── shop.ts             # 매물 굴림 + 리롤
│   ├── save.ts             # 자동 세이브 (매 day end)
│   ├── progression.ts      # 누적/해금 (테마 순차 해금)
│   └── options.ts          # 옵션 (언어/속도/줌/풀스크린)
├── scenes/                 # 11개 Phaser Scene
│   ├── BootScene → TitleScene
│   ├── TitleScene → GameScene (테마 선택 + 계속하기)
│   ├── GameScene + HUDScene (parallel)
│   ├── RuleEditorScene (Space)  ← 명칭은 RuleEditor지만 정책 form UI
│   ├── ShopScene (매일 밤)
│   ├── ModifierScene (매 3일) / RelicScene (매 5일)
│   ├── GameOverScene (사망 결산)
│   ├── HelpScene (조작법)
│   └── OptionsScene (옵션)
├── render/
│   ├── BuildingView.ts     # 빌딩 박스 + 문 + 계단 + 픽셀 디테일 (sprite-aware)
│   ├── PassengerSprites.ts # 승객 sprite 보간 (입구→큐→엘베→방문)
│   ├── EventFx.ts          # 공휴일 시각 효과 (폭죽/눈/할로윈/하트)
│   └── sprites.ts          # SPRITE_KEYS 카탈로그 + tryImage/hasSprite helper
├── audio/
│   └── sound.ts            # SOUND_KEYS 카탈로그 + Phaser 기반 SoundManager (파일 없으면 silent)
├── sounds/                  # /sounds.html 페이지 (사운드 작업 카탈로그)
├── sprites_page/           # /sprites.html 페이지 (스프라이트 작업 카탈로그)
└── ui/
    └── Button.ts           # 공용 Phaser 버튼
```

## 디자인 결정 핵심

- **운영 정책 form** (룰 블록 조립은 폐기됨). 엘베별 4가지: 운영 층 범위 / 패리티 / 픽업 모드 / 정원 풀 시 즉시 하차.
- **승객은 도메인 4단계 라이프사이클** (스폰 → 큐 → 탑승 → 도착). 시각은 PassengerSprites가 stagger 보간.
- **자동 세이브** = 매 day 종료 시점 (cleanup 다 비운 깨끗한 SimState만 직렬화).
- **테마 순차 해금**: 오피스 → 7일차에 호텔 → 14일차에 병원 → 21일차에 공항.
- **캘린더**: Day 1 = 1년차 1월 1일 월요일. 평년 365일 × N년 무한.
- **공휴일 12종** + **보스 day 5종** 모두 매년 / 매 7일 자동 발동.
- **i18n**: 한국어/영어 둘 다 지원. 카드 desc 포함 거의 모든 UI 다국어.
- **사운드**: Phaser preload + 키 시스템. 단일 진실원 = `src/audio/sound.ts` `SOUND_KEYS`. 파일은 `public/sounds/<key>.mp3` (없으면 silent fallback — 게임은 무음으로 동작 가능). 작업 카탈로그는 `/sounds.html`.
- **스프라이트**: 사운드와 동일 패턴. 단일 진실원 = `src/render/sprites.ts` `SPRITE_KEYS`. 파일은 `public/sprites/<key>.png` (없으면 도형 fallback). 작업 카탈로그는 `/sprites.html`. 픽셀 아트 32~64px. 첫 적용처 = BuildingView 엘베 cab (`elevator-cab.png` 두면 자동 image 렌더).

## 빠른 게임 흐름

1. Title → 테마 선택 → Game 시작
2. 매 day = 2.5분 (1×) = 5페이즈 (출근/근무/점심/퇴근/야간)
3. Day 끝 → 자동 세이브 → 상점 모달 → (매 3일) 모디파이어 → (매 5일) 렐릭
4. 매 4일 자동으로 층 +1
5. 불만 임계 5명 동시 → 게임오버 → 결산 → 메인 메뉴 또는 재시도

## 작업 우선순위

[TODO.md](TODO.md) 참고. 한 줄 요약: **사운드 → 통계 화면 → 챌린지 → 콘텐츠 풀 확장 → 스팀 출시(i18n Phase 3 / Electron / Steamworks)**.

## 자주 쓰는 명령

```bash
pnpm dev                    # 개발 서버
pnpm build                  # 타입체크 + 빌드
npx tsc --noEmit            # 타입체크만

# 진행도 초기화 (브라우저 콘솔)
['save.v1','progression.v1','options.v1','tutorialShown','locale']
  .forEach(k => localStorage.removeItem(`elevator-rogue.${k}`))
```

## 페이지

- 게임: `http://localhost:5173/`
- 코드 진실원천 대시보드: `http://localhost:5173/docs.html`
- 디자인 카탈로그 (기획자용): `http://localhost:5173/design.html`
- 사운드 작업 카탈로그: `http://localhost:5173/sounds.html`
- 스프라이트 작업 카탈로그: `http://localhost:5173/sprites.html`
- 게임 화면 좌하단에 DEV 버튼 (개발 모드만)

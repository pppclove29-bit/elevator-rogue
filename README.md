# Elevator Rogue

엘리베이터를 직접 운전하지 않는다. **하루의 트래픽 페이즈(출근/점심/퇴근…)를 룰로 받아치는 전략 빌더.** 일시정지로 룰을 편집하고, 위기에는 즉발 스킬로 회피하며, 마일스톤마다 카드로 정책·스탯·스킬을 빌드업하는 2D 로그라이크. 자동 시뮬 타이쿤이 아니라 **패턴 인식 + 정책 디자인** 게임.

## 컨셉

| 항목 | 결정 |
|---|---|
| 진행 방식 | 실시간 + 일시정지 |
| 조작 단위 | (1) AI 룰 슬롯 편집 — 5칸 제한, 우선순위 정렬 / (2) 즉발 스킬 발동 — 위기 회피 도구 |
| 트래픽 구조 | 층 역할(lobby/office/restaurant/rooftop/basement) × 페이즈(morning/work/lunch/evening/night) 가중치 |
| 실패 조건 | 승객 anger 임계 초과 활성 N명이면 게임오버 (회복 가능) |
| 강화 | 룰 카드 + 업그레이드 카드 + 즉발 스킬 카드 (3종 혼합) |
| 메타 | 마일스톤마다 카드 3택 1, 일정 시점 빌딩에 층 추가 |
| 비주얼 | 심플 도형/픽셀 |

## 디자인 노트

운빨 → 구조로 바꾸기 위한 세 축:
1. **층 역할 + 페이즈로 트래픽 패턴화**. "점심엔 식당층으로 몰린다" 같은 예측 가능한 룰이 룰 카드의 의미를 만든다.
2. **룰 슬롯 5칸 하드 제한**. 카드를 많이 모은다고 다 쓰는 게 아니라 무엇을 빼고 넣을지 매번 결정.
3. **즉발 스킬 카드(소프트 소울)**. 운빨 위기를 회피할 1회/쿨다운 도구. 룰만으로 풀리지 않는 상황의 안전판.

## 스택

- Phaser 3 — 2D 게임 엔진
- TypeScript (strict)
- Vite — dev/build

## 실행

```bash
pnpm install   # 또는 npm install
pnpm dev       # http://localhost:5173
pnpm build     # tsc --noEmit && vite build
pnpm preview   # 빌드 결과 확인
```

## 구조

```
src/
├── main.ts                 # Phaser.Game 부트스트랩
├── config.ts               # 상수 (TICK_MS, INITIAL_FLOORS, COLORS)
├── scenes/
│   ├── BootScene.ts        # Game 씬으로 라우팅
│   ├── GameScene.ts        # sim 호스트 + slotted/inventory + accumulator tick
│   ├── HUDScene.ts         # 시간/상태/페이즈/컨트롤 바 (parallel)
│   ├── RuleEditorScene.ts  # pause 시 모달, 슬롯/인벤토리 편집
│   └── RewardScene.ts      # 하루 종료 시 카드 3택
├── domain/                 # Phaser 무관 시뮬 코어
│   ├── types.ts            # Building/Floor/Elevator/Passenger 타입
│   ├── building.ts         # createBuilding, 좌표 헬퍼, 역할 배치
│   ├── phase.ts            # Phase enum + 시간 + origin/dest 가중치
│   ├── spawner.ts          # 페이즈·역할 기반 가중치 스폰
│   ├── simulation.ts       # tick(state, rng, rules): FSM·승하차·anger
│   ├── rng.ts              # mulberry32 seedable
│   └── rules/
│       ├── types.ts        # Condition / Action / Rule 데이터
│       ├── evaluator.ts    # priority 순 평가 → Intent
│       └── library.ts      # 카드 풀 + 시작 슬롯/인벤토리
├── meta/
│   ├── upgrades.ts         # 업그레이드 카드 (속도/정원/정차/친절도/대기공간/엘베+1)
│   ├── skills.ts           # 즉발 스킬 카드 + 쿨다운
│   └── reward.ts           # 보상 3장 드로우 (룰/업/스킬 가중)
├── ui/
│   └── Button.ts           # 공용 Phaser 버튼
└── render/
    └── BuildingView.ts     # SimState → 도형
```

향후 추가 예정: `domain/rules/` (룰 DSL/평가기), `meta/` (런·강화·마일스톤), `ui/` (Phaser GameObject 기반 룰편집기·카드 UI).

## 배포 타겟

Steam. Phaser+Vite 빌드를 Electron으로 래핑(알파 빌드 단계). Steamworks SDK는 `steamworks.js` (업적·클라우드 세이브). 모든 텍스트는 처음부터 i18n 키로 관리 — 하드코딩된 한국어/영어 문자열 금지.

## 아키텍처 원칙

- **Phaser 분리 도메인 계층.** 시뮬·룰 엔진은 GameObject에 의존하지 않는 순수 TS. 단위 테스트·결정성·리플레이를 위해.
- **고정 timestep.** `TICK_MS = 50`, accumulator 패턴. 도메인 시간은 정수 tick.
- **룰 DSL = 플랫 우선순위 리스트 + AND 조건 + 단일 액션.** 트리/BT는 MVP 과잉.
- **Seedable RNG (mulberry32).** `Math.random` 직접 호출 금지.
- **단방향 통신.** 도메인 → Scene events. 도메인이 Scene을 참조하지 않음.
- **UI는 Phaser-only.** 룰 편집기/카드 선택도 GameObject로 구현. (스팀 배포 대비 — 컨트롤러 입력·풀스크린·Electron 래핑 시 DOM overlay는 마찰이 큼.)

## 현재 상태 (Step 7+8+9 통합)

- **층 역할 + 페이즈** (Step 3) — 트래픽 패턴 결정성
- **룰 엔진** (Step 4) — 정책이 데이터
- **룰 조립 시스템 (Step 8)** — 완제 카드 폐기. 조건 블록 20종 + 액션 블록 12종을 직접 조립
  - **엘베마다 슬롯 5칸 독립** — 엘베 +1 받으면 새 엘베에도 시작 룰셋 자동
  - 편집기에 엘베 탭 (E1/E2/...) 전환
  - 슬롯 클릭 → 편집 중 표시 → 인벤토리에서 조건/액션 클릭으로 추가
  - 빈 슬롯 클릭 = 새 룰 생성, 룰 안 칩 클릭 = 제거
- **메카닉 묶음** (Step 6a): 정원 비례 정차 시간, 층 포화 anger 가중
- **즉발 스킬** (Step 6b) — Q/W/E 슬롯, 쿨다운 게이지
- **골드 경제** (Step 9): 승객 처리 시 dest 역할별 골드 적립 (LB 1G / OF 2G / RT 3G / RF 5G). 시작 20G
- **밤의 상점** (Step 9): 매일 종료 시 자동. 업그레이드/스킬/수리 골드로 구매. 매일 닫고 다음날 시작
- **엘베 고장** (Step 9): 정차 누적 + 4% × breakdownMultiplier 확률. 수리 25G 또는 응급 수리 키트 자동 복구
- **엘베 정원 시각화**: HUD 아닌 엘베 샤프트 상단에 `E1  3/6` 형태 표시
- **메타** (Step 7):
  - **매 3일** Daily Modifier 모달 — 20장 풀, 3장 강제 1택 (디버프 11 / 버프 6 / 혼합 3). 다음날 시작 시 자동 만료
  - **매 5일** Relic 모달 — 16장 풀, 3장 1택 (SKIP 가능). 런 영구. 순수 8 / 트레이드오프 5 / 디버프 렐릭 3
  - **매 4일** 빌딩에 층 자동 추가 (rooftop 한 칸 위로, 새 office 끼움). 시각적으로 floorHeight 자동 축소
- **DEV 좌하단 버튼**: DOCS / DESIGN (개발 모드에서만 표시)
- **승객 아키타입 9종**: normal/vip/elderly/suit/group/baggage/shady/tourist/staff
- **Random Event 10종**: Day 2부터 매일 35%
- **승객 이동 경로**: 입구(▶) → 큐 → 엘베 → 출구, 한 명씩 90ms stagger
- **엘베 정책 폼** (Step 8 룰 조립 단순화): 엘베별 form — `운영 층 범위 1F~5F` / `층 패리티 모두/짝수/홀수` / `픽업 모든 호출/로비만/특정 역할만` / `정원 풀이면 즉시 하차 토글`. 룰 블록 조립 폐기 (백엔드 코드는 유지)

## 로드맵

- [x] **Step 0** — 라우팅 + GameScene/HUDScene + config
- [x] **Step 1** — 도메인 모델 + 고정 tick + 하드코딩 정책 + 기본 렌더
- [x] **Step 2** — 불만도 + 게임오버 + pause/속도조절(1·2·4·8x)/restart, 클릭 버튼 바
- [x] **Step 3** — **층 역할 + 페이즈** (스폰 패턴 결정성)
- [x] **Step 4** — 룰 엔진 데이터화 (presets → evaluator), phase/role 조건 정의
- [x] **Step 5** — RuleEditorScene + 룰 슬롯 5칸 제한
- [x] **Step 6a** — 메카닉 묶음 + 보상 흐름 (※ Step 9에서 골드 상점으로 대체)
- [x] **Step 6b** — 즉발 스킬 + 엘베+1
- [x] **Step 7** — 메타: D-Mod / Relic / 층 추가
- [x] **Step 8** — 룰 블록 조립 (엘베별 슬롯 5칸 독립)
- [x] **Step 9** — 골드 경제 + 밤의 상점 + 엘베 고장

상세 플랜: `/Users/paakhyungjun/.claude/plans/toasty-marinating-dawn.md`

Step 7 카드 풀 디자인: [docs/modifiers.md](docs/modifiers.md)

## 디자인 페이지

`pnpm dev` 실행 후 두 페이지가 동시에 떠 있음:

### `http://localhost:5173/docs.html` — 코드 진실원천 대시보드
코드(`CARD_LIBRARY`, `UPGRADES`, `SKILLS`, `defaultParams()`, `PHASE_TRAFFIC`)를 직접 import해 자동 렌더링. 카드 추가/수정 시 즉시 반영 (Vite HMR). **구현 상태 검증용.**

소스: `docs.html`, `src/docs/main.ts`, `src/docs/dashboard.css`.

### `http://localhost:5173/design.html` — 기획자용 레벨 디자인 카탈로그
디자인 안 + 미구현 풀까지 한자리에. **검토/기획 회의용.**
표시:
- Daily Modifier (20장: 디버프 11 / 버프 6 / 혼합 3)
- 엘베 업그레이드 (6 구현 + 6 안)
- 층 디자인 (5 + 6 안, 골드 보상치 포함)
- 고객 디자인 (1 + 8 아키타입 안)
- 랜덤 이벤트 (10 안, 트리거/심각도)
- 요일 개념 (7일 사이클 도입 검토)

각 항목에 `구현됨 / 부분 / 예정 / 안` 배지. 데이터 진실원천: `src/design/catalogs.ts`.

# Block Composition System — 설계

기존 "완제 룰 카드 보상" → "**블록 보상 + 직접 조립**"으로 패러다임 전환. 엘베별 룰셋 분리.

## 결정 (2026-05-26)

| 항목 | 결정 |
|---|---|
| 조립 깊이 | **C** — 시작만 프리셋(`unload-first`, `pickup-nearest`), 그 외 모든 룰은 직접 조립 |
| 엘베별 룰셋 | **1** — 엘베마다 슬롯 5칸 독립. 엘베가 늘어나면 슬롯도 +5 |
| 블록 보유 모델 | 한 번 받으면 영구 보유, 자유 사용. 중복 보상 X (이미 있는 블록은 풀에서 빠짐) |

## 데이터 모델

```ts
type ConditionBlockId = string;  // e.g. 'cond-phase-morning'
type ActionBlockId    = string;  // e.g. 'act-goto-highest-call'

interface RuleInSlot {
  id: string;                    // 자동 생성 (uuid)
  when: ConditionBlockId[];      // AND 조건
  then: ActionBlockId | null;    // 액션 1개 (null이면 미완성)
}

// GameScene
slotsByElevator: Record<ElevatorId, RuleInSlot[]>;   // 엘베마다 최대 5
ownedConditions: Set<ConditionBlockId>;
ownedActions:    Set<ActionBlockId>;
```

평가 시: `RuleInSlot` → 기존 `Rule` 변환 (런타임). when=빈 배열이면 `always` 취급 가능. then=null이면 미완성 룰로 스킵.

## 블록 카탈로그

### Condition Blocks (조건)

| ID | 라벨 | 매칭 |
|---|---|---|
| `c-always` | 항상 | true |
| `c-has-passengers` | 탑승객 있음 | elevator.passengers.length > 0 |
| `c-any-call` | 대기열 있음 | 어느 층에 큐 |
| `c-at-capacity` | 엘베 풀 | passengers.length >= capacity |
| `c-phase-morning` | MORNING이면 | |
| `c-phase-work` | WORK면 | |
| `c-phase-lunch` | LUNCH면 | |
| `c-phase-evening` | EVENING이면 | |
| `c-phase-night` | NIGHT이면 | |
| `c-call-on-lobby` | 로비 콜 있음 | |
| `c-call-on-office` | 오피스 콜 있음 | |
| `c-call-on-restaurant` | 식당 콜 있음 | |
| `c-call-on-rooftop` | 옥상 콜 있음 | |
| `c-call-on-basement` | 지하 콜 있음 | |
| `c-queue-2plus` | 어느 층 대기 ≥ 2 | |
| `c-queue-4plus` | 어느 층 대기 ≥ 4 | |
| `c-queue-6plus` | 어느 층 대기 ≥ 6 | |
| `c-elevator-idle` | 엘베 대기 중 | (사실상 평가 시점 = 항상 true) — 위의 always와 동일, 단 디버깅 표시용 |
| `c-at-lobby` | 1F(로비)에 있음 | nearestFloor(elevator.y) === 0 |
| `c-at-rooftop` | 최상층에 있음 | |

총 **20개**. 시작 보유: `c-always`, `c-has-passengers`, `c-any-call`.

### Action Blocks (액션)

| ID | 라벨 | 효과 |
|---|---|---|
| `a-nearest-pdest` | 가까운 목적지 | 탑승객 dest 중 가장 가까운 |
| `a-nearest-call` | 가까운 호출 | 큐 있는 가장 가까운 층 |
| `a-call-lobby` | 로비 가까운 콜 | role=lobby 중 큐 있는 가까운 |
| `a-call-office` | 오피스 가까운 콜 | |
| `a-call-restaurant` | 식당 가까운 콜 | |
| `a-call-rooftop` | 옥상 가까운 콜 | |
| `a-call-basement` | 지하 가까운 콜 | |
| `a-highest-call` | 가장 높은 콜 | |
| `a-lowest-call` | 가장 낮은 콜 | |
| `a-largest-queue` | 가장 큰 큐 | |
| `a-park-lobby` | 1F 대기 | goTo 0 |
| `a-park-here` | 그 자리 대기 | stay |

총 **12개**. 시작 보유: `a-nearest-pdest`, `a-nearest-call`, `a-park-lobby`.

## 시작 슬롯 (각 엘베)

```
E1 slot 1: WHEN [c-has-passengers]  THEN [a-nearest-pdest]
E1 slot 2: WHEN [c-any-call]        THEN [a-nearest-call]
slot 3, 4, 5: empty
```

엘베 +1 업그레이드 받으면 새 엘베도 같은 시작 슬롯 2개로 부팅.

## 보상 시스템 변경

**매일 보상 (현행 RewardScene)**:
- 룰 카드 풀 → **블록 카드 풀**로 교체
- 조건 블록 / 액션 블록 / 업그레이드 카드 가중 (예: 35/30/35)
- 미보유 블록만 풀에 들어감

**매 3일 Daily Modifier**, **매 5일 Relic (+스킬)**: 별도 모달 (modifiers.md 참고)

## 편집기 UI (RuleEditorScene 재설계)

```
┌─ Rule Editor ───────────────────────────────────────────────────────┐
│ [E1] [E2] [E3]                                       [RESUME]       │
├─────────────────────────────────────────────┬───────────────────────┤
│ Slot 1 (priority 50)                        │ Conditions            │
│ WHEN [phaseIs morning] [callOnRole lobby] + │ [always]              │
│ THEN [goToNearestCallOfRole lobby]          │ [hasPassengers]       │
│                                  [↑][↓][X]  │ [anyCall]             │
├─────────────────────────────────────────────┤ [phaseIs morning]     │
│ Slot 2 (priority 40)                        │ [phaseIs lunch]       │
│ WHEN [hasPassengers]                        │ [callOnRole lobby]    │
│ THEN [goToNearestPassengerDest]             │ ...                   │
│                                  [↑][↓][X]  │                       │
├─────────────────────────────────────────────┤ Actions               │
│ Slot 3: + 룰 추가                            │ [nearestPDest]        │
│ Slot 4: empty                                │ [nearestCall]         │
│ Slot 5: empty                                │ [callRole lobby]      │
│                                              │ ...                   │
└──────────────────────────────────────────────┴───────────────────────┘
```

상호작용:
- 좌상단 엘베 탭으로 편집 대상 전환
- 빈 슬롯 클릭 → 새 룰 생성 모드
- 룰 안 WHEN 영역의 `+` → 우측 인벤토리 조건 클릭으로 추가
- 룰 안 THEN 영역의 `+` → 우측 인벤토리 액션 클릭으로 설정
- 룰의 조건/액션 클릭 → 제거 (또는 X 표시)
- 슬롯 ↑↓로 priority 재정렬, X로 룰 삭제

## 평가기 변경 사항

`evaluator.ts`는 거의 그대로. 단:
- `Rule.when = []`이면 모두 매치 (always)
- `Rule.then = null`이면 룰 자체 비활성 (다음으로 폴스루)

## 데이터 마이그레이션

기존 `CARD_LIBRARY` (완제 룰) → 폐기. 다만 시작 슬롯에 박는 2장은 코드에서 직접 RuleInSlot 형태로 생성.

## 단계 분해

- **Step 8.1**: 블록 라이브러리 (conditions/actions 카탈로그)
- **Step 8.2**: 데이터 모델 변경 (slotsByElevator, ownedConditions, ownedActions, RuleInSlot)
- **Step 8.3**: 평가기 RuleInSlot 받게 변환 어댑터
- **Step 8.4**: 보상 시스템 재편 (블록 카드 풀)
- **Step 8.5**: RuleEditor 재작성 (엘베 탭 + 슬롯 + 인벤토리)
- **Step 8.6**: 대시보드 갱신 (블록 카탈로그 섹션)

기존 Step 5/6의 룰 카드 시스템은 **Step 8 시점에 폐기/교체**. Step 7(메타 모디파이어/렐릭)과는 독립 — 어느 쪽 먼저 가도 됨.

## 결정 필요

- Step 7(메타) vs Step 8(조립 시스템) 중 어디 먼저?
- 추천: **Step 8 먼저**. 보상 시스템이 통째로 바뀌니까 Step 7 카드(모디파이어/렐릭)를 Step 8 위에 얹는 게 자연.

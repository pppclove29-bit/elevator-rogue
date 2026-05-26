# Modifiers & Relics — 설계 카탈로그

Step 7 메타 시스템에 들어갈 카드 풀의 사전 설계. 구현 전 디자인 안.

## 용어

| 종류 | 지속 시간 | 비고 |
|---|---|---|
| **Daily Modifier** | 하루(=1 morning→night 사이클) 한정 | 강한 임팩트, 가변성. 매 N일마다 부여 |
| **Relic** | 런이 끝날 때까지 영구 | 보통 +효과, 가끔 트레이드오프. 빈도 적음 |

## 트리거 안 (3개 옵션 — 검토용)

### 안 A: 모달 분리
- 매일 → Daily Reward (현행)
- **매 3일** → Daily Modifier 모달 (3장 중 1택, 그날 적용)
- **매 5일** → Relic 모달 (3장 중 1택, 영구)

### 안 B: 통합 모달
- 매일 보상 풀에 가끔 Modifier/Relic 섞이고, 슬롯 1택은 동일

### 안 C: 풀 사이클
- Day 1~2: Daily Reward만
- Day 3: Daily Modifier (1택 강제)
- Day 5: Relic (3장 중 1택)
- Day 7: Modifier + 층 추가
- Day 10: Relic + 모디파이어 (boss day)
- 이후 반복 압축

**추천**: 안 A. 보상 흐름이 종류별로 명확하고 압박 곡선 설계 쉬움.

## Daily Modifier 풀

### 디버프 (압박)
| ID | 이름 | 효과 |
|---|---|---|
| `dm-traffic-jam-morning` | 출근길 정체 | MORNING 스폰 간격 ×0.6 (1.7배 빨라짐) |
| `dm-lunch-rush` | 점심 광풍 | LUNCH 스폰 간격 ×0.6 |
| `dm-evening-rush` | 퇴근 러시 | EVENING 스폰 간격 ×0.6 |
| `dm-bad-mood` | 짜증의 날 | 오늘 anger 누적 ×1.4 |
| `dm-power-dip` | 정전 경고 | 오늘 엘베 속도 ×0.7 |
| `dm-heavy-load` | 무거운 짐 | 오늘 정차 시간 +4 tick |
| `dm-narrow-door` | 좁은 문 | 오늘 엘베 정원 -2 (최소 2) |
| `dm-restaurant-fest` | 식당가 축제 | LUNCH dest 가중치: restaurant 100% 단일 |
| `dm-vip-day` | VIP 방문 | 오늘 rooftop 가중치 ×3 |
| `dm-night-shift` | 야간 근무 | NIGHT 스폰 간격 ×0.3 (3배 빨라짐) |
| `dm-fire-drill` | 화재 대피 | 시작 시 랜덤 층 큐 +4 |

### 버프 (숨통)
| ID | 이름 | 효과 |
|---|---|---|
| `dm-calm-day` | 명상의 날 | 오늘 anger 누적 ×0.7 |
| `dm-smooth-ops` | 효율 운영 | 오늘 정차 시간 -2 tick |
| `dm-quiet-day` | 한산한 하루 | 모든 페이즈 스폰 ×0.7 |
| `dm-fast-motors` | 신속 모터 | 오늘 엘베 속도 ×1.2 |
| `dm-skill-prime` | 즉발 풀가동 | 오늘 스킬 쿨다운 ×0.5 |
| `dm-free-coffee` | 무료 커피 | 오늘 angry 처리 시 같은 엘베 다른 승객 anger -20 |

### 혼합 (trade-off) — 로그라이크 맛
| ID | 이름 | 효과 |
|---|---|---|
| `dm-rush-rewards` | 위기는 곧 기회 | 스폰 ×1.5, 보상 카드 다음날 +1 (선택지 4장으로) |
| `dm-marathon` | 마라톤 데이 | 오늘 day 길이 ×1.5, anger 누적 ×0.8 |
| `dm-vip-protocol` | VIP 의전 | rooftop dest 승객 처리 시 anger -10 모든 곳, BUT lobby 가중치 ×0.5 |

## Relic 풀 — 한 런 지속

### 순수 강화
| ID | 이름 | 효과 |
|---|---|---|
| `r-revolving-door` | 회전문 | 엘베 정원 +1 (영구) |
| `r-light-cage` | 가벼운 케이지 | 엘베 속도 +10% (영구) |
| `r-host` | 친절한 안내원 | anger 누적 -5% (영구) |
| `r-24h-cafe` | 24시간 카페 | WORK 페이즈 스폰 ×0.8 |
| `r-security` | 보안 시스템 | 층 포화 임계 +2 |
| `r-skill-keeper` | 스킬 키퍼 | 즉발 스킬 쿨다운 -15% |
| `r-spare-key` | 보조 키 | 새 런 시작 시 보너스 슬롯(+1, 최대 6칸) ※ Step 8 |
| `r-frequent-rider` | 단골 우대 | 같은 dest 승객 2명 이상 한 엘베에 있으면 anger 누적 ×0.7 |

### 트레이드오프
| ID | 이름 | 효과 |
|---|---|---|
| `r-luxury-interior` | 럭셔리 인테리어 | 정원 +2, 속도 -10% |
| `r-master-key` | 마스터 키 | 즉발 스킬 쿨다운 -30%, 매일 처리 인원 -10% |
| `r-night-contract` | 야간 근무 협약 | NIGHT 길이 ×2, MORNING 길이 ×0.8 |
| `r-vip-pass` | VIP 패스 | 정원 풀일 때도 1명 추가 탑승, 정차 시간 +2 tick |
| `r-overtime` | 야근 수당 | 처리수 +25% 가산, 단 day 종료 보상 풀에서 SKIP 옵션 제거 |

### 디버프 렐릭 (도전/Curse) — 메타에서 추가 시드
| ID | 이름 | 효과 |
|---|---|---|
| `r-old-cable` | 노후 케이블 | 속도 -15% |
| `r-strict-union` | 엄격한 노조 | 정차 시간 +2 tick |
| `r-complaint-board` | 불만 게시판 | anger 누적 +10% |

→ 디버프 렐릭은 보상으로 받는 게 아니라, **선택지에 강제 섞임(예: trade-off relic 효과의 '뒷면')** 또는 **층 추가 등 '액 페이지' 페널티**로 도입 검토.

## 풀 크기 요약

- Daily Modifier: 디버프 11 / 버프 6 / 혼합 3 = **20**
- Relic: 순수 8 / 트레이드오프 5 / 디버프 3 = **16**

Step 7 MVP는 각각 절반 정도(D-Mod 10 / Relic 8)로 시작해 밸런스 잡고 확장 권장.

## SimParams 추가 필요 항목 (구현 시)

현재 `SimParams`로 표현 못 하는 효과들. 모디파이어 적용 위해 신설:
- `phaseSpawnMultiplier: Partial<Record<Phase, number>>` — 페이즈별 스폰 가중
- `phaseDestOverride: Partial<Record<Phase, RoleWeights>>` — 페이즈 dest 가중치 덮어쓰기
- `phaseTickScale: Partial<Record<Phase, number>>` — 페이즈 길이 배수
- `globalSpeedMultiplier: number`
- `globalCapacityDelta: number`
- `skillCooldownMultiplier: number`
- `floorCapacityDelta: number` (이미 floorCapacity 있지만 모디파이어용으로 분리)

만료 처리:
- `dailyModifierStartTick` 기록
- 다음 day 진입 시 자동 해제 (timer 패턴)

## 모달 UI 안

- 보상 모달과 시각 구분 (다른 컬러/타이틀)
- 디버프 카드는 빨강 테두리
- 버프는 녹색
- 혼합은 노랑/보라

## 결정사항 (2026-05-26)

| 항목 | 결정 |
|---|---|
| 트리거 | **안 A — 모달 분리** |
| Daily Modifier 풀 | **20장 전부** |
| Relic 풀 | **16장 전부 (디버프 렐릭 포함)** |
| 디버프 강제도 | **완전 랜덤** — 3장 다 디버프일 수 있음 (로그라이크 정통) |
| 스킬 통합 | **Relic 모달(매 5일)로 이관**. 매일 보상에서는 스킬 제거. Relic 모달 풀 가중치는 Relic 75% / 스킬 25% 예상 |

## 트리거 최종

- **매일** = Daily Reward (룰 / 업그레이드만, 50:50)
- **매 3일** = Daily Modifier 모달 (3장 강제 1택, SKIP 없음, 완전 랜덤)
- **매 5일** = Relic + 스킬 통합 모달 (3장 1택, SKIP 가능)
- **매 N일** = 층 추가 (N 결정 필요 — 안: 4일?)

## 구현 시 주의

- `pendingReward` 처럼 `pendingModifier`, `pendingRelic` 플래그 별도
- 한 tick에 여러 트리거 동시 발화 시 순서 보장 (Reward → Modifier → Relic → 층 추가)
- Daily Modifier 만료: 다음 day 시작 시점에 해제 (timer 패턴)
- 영구 효과(Relic): SimParams에 직접 적용

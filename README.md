# Elevator Rogue

> **하루의 트래픽을 정책으로 받아치는 로그라이크.**
> 엘리베이터를 직접 운전하지 않는다. 엘베마다 운영 정책을 설정하고, 밤마다 골드로 상점에서 강화하며, 365일 캘린더의 공휴일·보스 day를 통과해 한 해를 살아내는 게임.

## 스택 / 실행

- **Phaser 3** + **TypeScript (strict)** + **Vite**
- **Electron** 데스크톱 빌드 (스팀 출시 목표)
- 게임패드 (Xbox 컨벤션) 지원

```bash
pnpm install
pnpm dev               # http://localhost:5173 (브라우저)
pnpm build             # tsc --noEmit && vite build

# 데스크톱 (Electron)
pnpm electron:dev      # vite + electron 동시 실행
pnpm electron:build    # 현재 OS 패키지 → release/
pnpm electron:build:mac     # macOS dmg (x64 + arm64)
pnpm electron:build:win     # Windows nsis
pnpm electron:build:linux   # Linux AppImage
```

언어: 한국어 / English (옵션에서 전환). 줌: `+`/`-`/`0` (확대 시 우클릭 드래그).

## 게임 흐름

1. **타이틀**에서 빌딩 테마 선택 (오피스 → 공항 → 병원 → 호텔 → 카오스, 순차 해금)
2. **매일 = 2.5분 (1×)** 5페이즈 사이클 (출근/근무/점심/퇴근/야간)
3. **밤마다 상점** (골드로 업그레이드/스킬/수리 구매, 리롤 가능)
4. **매 3일 = Daily Modifier** (3장 강제 1택, 그날 한정)
5. **매 5일 = Relic** (영구 효과, 1택 + SKIP)
6. **매 4일 = 층 자동 추가**
7. **공휴일** (12종 — 신정/광복절/추석/할로윈/크리스마스 등)과 **보스 day** (Day 7/14/21/28+) 자동 발동
8. **불만 임계 5명 동시** → 게임오버 → 결산 카운트업 + 신기록 배너 + 누적 진행도 기록

## 게임 모드

- **일반 모드** — 자유 런. 테마 best day 기록.
- **도전 모드 5종** — 솔로 엘베 / 소형 정원 / 러시 / 가난 / 예민한 손님. 별도 best 기록.
- **일일 챌린지** — 오늘 날짜 시드 + 자동 챌린지/테마. 매일 같은 셋업으로 도전.

## 핵심 시스템

- **운영 정책** (엘베별 4가지 form): 운영 층 범위 / 패리티(모두/짝수/홀수) / 픽업 모드 / 정원 풀 시 즉시 하차
- **승객 14 archetype** (일반/VIP/노약자/도둑/환자/의료진/호텔 손님/승무원 등 — 테마별 가중치)
- **승객 경로 이벤트** — 도둑 큐 절도 / 환자 큐 쓰러짐 (시각 floating text)
- **공휴일 시각 효과** — 신년 폭죽 / 크리스마스 눈 / 할로윈 박쥐 / 밸런타인 하트
- **모디파이어 20 · 렐릭 27 · 업그레이드 8 · 스킬 4 · 이벤트 23+**
- **자동 세이브** (매 day 종료) + **테마 순차 해금** (localStorage)
- **승객 라이프사이클 시각화** (입구 → 큐 → 엘베 → 방 문, dest 컬러 dot)
- **에스컬레이터/지하철/헬리포트** 운송 수단 렐릭 (즉시 처리)
- **경비/청소부/화장실** 인력·시설 라이프사이클
- **스토리/튜토리얼** — 비주얼 노벨 스타일 다이얼로그. 첫 실행 인트로 + Day 1 튜토리얼 4단계.

## 에셋 시스템

게임 비주얼은 도형 fallback + 옵션 이미지. 외부 자산을 두면 자동 적용 (없어도 동작):

| 폴더 | 형식 | 가이드 |
|---|---|---|
| `public/sounds/` | `.mp3` | [README](public/sounds/README.md) + [/sounds.html](http://localhost:5173/sounds.html) |
| `public/sprites/` | `.png` (픽셀 32~64px) | [README](public/sprites/README.md) + [/sprites.html](http://localhost:5173/sprites.html) |
| `public/fonts/` | `Galmuri11.woff2` | [README](public/fonts/README.md) — 픽셀 폰트 자동 적용 |
| `electron/build/` | `icon.{png,icns,ico}` | [README](electron/build/README.md) — 데스크톱 빌드 아이콘 |

## 페이지

| URL | 용도 |
|---|---|
| `/` | 게임 |
| `/docs.html` | 코드 진실원천 대시보드 |
| `/design.html` | 기획자용 카탈로그 + 용어집 |
| `/sounds.html` | 사운드 작업 카탈로그 (키 + 로드 상태 + 미리듣기) |
| `/sprites.html` | 스프라이트 작업 카탈로그 (키 + 로드 상태 + 미리보기) |

게임 화면 좌하단에 `[DEV]` 버튼이 위 4개 페이지 한 번에 열어줌 (개발 모드만).

## 다음 작업

[TODO.md](TODO.md) 참고. 큰 남은 작업:
- 에셋 채우기 (SFX 11 + 캐릭터 portrait 3 + sprite must 4 — 외부 작업)
- Steamworks SDK (App ID 발급 후 — 업적/클라우드 세이브)
- 모달 게임패드 입력 매핑 (정책 편집기/상점 안 D-pad/A 지원)
- 픽셀화 cleanup (인라인 fontFamily 를 config.FONT 상수로)

## 라이선스

MIT — [LICENSE](LICENSE). 사용된 모든 서드파티 라이브러리/에셋 라이선스도 LICENSE 참고.

## 컨텍스트 (Claude Code)

다음 세션 시작 시 [CLAUDE.md](CLAUDE.md) 참고.

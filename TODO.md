# TODO — 다음 작업

마지막 업데이트: 2026-05-26
현재 git 위치: `main` 브랜치 (remote 없음 — push 안 됨)

## 즉시 (집에서 처음 켜면)

```bash
# 의존성 설치
pnpm install
pnpm dev        # http://localhost:5173

# (선택) GitHub remote 추가
gh repo create elevator-rogue --private --source=. --remote=origin --push
# 또는 수동
# git remote add origin git@github.com:<user>/elevator-rogue.git
# git push -u origin main
```

## 알아둘 것

- localStorage 키 4개에 진행도 저장 — **다른 브라우저/머신에선 처음부터** (구현 미비).
  - `elevator-rogue.save.v1` — 현재 런 (게임오버 시 삭제)
  - `elevator-rogue.progression.v1` — 누적 진행/해금
  - `elevator-rogue.options.v1` — 옵션 (언어/줌/속도)
  - `elevator-rogue.locale` — 언어
  - `elevator-rogue.tutorialShown` — 첫 도움말 표시 여부
- 1년 = 365일 게임 시간. 1× = 약 15시간 / 8× = 약 2시간.
- 현재 i18n: 한국어 + English 둘 다 지원. 옵션에서 전환.

## 다음 작업 우선순위

### 1순위 — 알파 마무리 (감각 임팩트)
- [ ] **사운드 효과** — Web Audio API
  - 엘베 도착 `ding`, 골드 +N 팝업/효과음, anger 알람, 도둑 경고
  - 보스 day 인트로, 공휴일 효과음 (신년 카운트다운, 크리스마스 등)
  - 게임오버 효과음
- [ ] **이펙트** — 골드 획득 시 `+N` 플로팅 텍스트, anger 임계 도달 시 화면 깜빡임
- [ ] **공휴일 시각 효과** — 신년 폭죽, 할로윈 어둠, 크리스마스 트리 도트

### 2순위 — 게임 가치
- [ ] **누적 통계 화면** — 메인 메뉴 → "통계" (progression 데이터 활용)
- [ ] **일일 챌린지** — 시드 고정 (날짜 기반)
- [ ] **도전 모드** — 특수 룰셋 (엘베 1대만, 정원 4 고정 등)

### 3순위 — 콘텐츠 확장
- [ ] 스킬 4 → 8 (시간 정지, 골드 부스트, 도둑 잡기, 임시 엘베)
- [ ] 추가 빌딩 테마 (학교/카지노/박물관)
- [ ] 추가 승객 아키타입 (요청 시)
- [ ] 운영 정책 고급 옵션 (위/아래층 우선, 페이즈별 활동)

### 4순위 — 스팀 출시 준비
- [ ] **i18n Phase 3** — Event name 다국어 (보스 day / 공휴일)
- [ ] **Electron 래핑** — 알파 빌드 (스팀 페이지 캡쳐용)
- [ ] **Steamworks SDK** — 업적/클라우드 세이브 (steamworks.js)
- [ ] **윈도우 모드** 향상 — 해상도 선택, 브라우저 줌과 함께 사용 시 충돌 점검
- [ ] **게임패드 대응**

### 5순위 — 폴리시
- [ ] 픽셀 폰트 재시도 (Galmuri11 — 11px 한글 픽셀, 깔끔)
  - 이전엔 DotGothic16 + image-rendering: pixelated가 가독성 깸. 다른 폰트 시도 가능.
- [ ] 타이틀 화면 빌딩 실루엣 애니메이션 (창문 깜빡임 등)
- [ ] 게임오버 화면 자체에 진행도 카드/배지 표시

## 알려진 작은 이슈/검토

- `BuildingView` 우측 방 문이 좁아 보일 수 있음 (width 560 기준 다시 검토)
- 옵션 풀스크린 토글 시 줌과 함께 적용되면 시각 문제 가능 (확인 필요)
- 진행도/세이브 localStorage라 브라우저 데이터 삭제하면 잃음 — Steam 클라우드 세이브로 해결 예정
- 캘린더는 평년만 (윤년 미고려). 1년 = 365일 고정.

## 디자인 메모 / 미구현 안

- 페이즈 추가 (early-morning, late-night)
- 빌딩 외부 환경 (날씨 / 계절)
- 층별 영구 효과 (트랩 / 부스트)
- "거부" 메카닉 (shady 승객 안 받기 — 골드 vs 안전)
- 보스 day 클리어 보상 (도달 시 추가 렐릭 선택)
- 추가 페이즈 (early-morning 6시 운동, late-night 24시 야간)

## 참고 파일

- 코드 진실원천: `/docs.html`
- 디자인 카탈로그: `/design.html`
- 이전 디자인 안 (아카이브): `docs/blocks.md`, `docs/modifiers.md`
- 플랜 파일: `~/.claude/plans/toasty-marinating-dawn.md`

## 빠른 명령어

```bash
pnpm dev           # 개발 서버 (HMR)
pnpm build         # 타입체크 + 빌드
pnpm preview       # 빌드 결과 확인

# 진행도 초기화 (옵션 → 데이터 → 초기화 또는)
localStorage.removeItem('elevator-rogue.save.v1')
localStorage.removeItem('elevator-rogue.progression.v1')
```

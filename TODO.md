# TODO — 다음 작업

마지막 업데이트: 2026-05-27
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
- [~] **스프라이트 파이프라인** — Phaser sprite key 시스템 + 카탈로그 페이지(`/sprites.html`) 구축 완료. 픽셀 아트 32~64px 스타일. `public/sprites/<key>.png` 두면 자동 적용 (없으면 도형 fallback). 첫 적용: BuildingView 엘베 cab.
  - [ ] 우선순위 must 4개 채우기: `elevator-cab`, `passenger-normal`, `passenger-thief`, `floor-lobby`
  - [ ] 점진적 다른 위치 sprite-aware 화: PassengerSprites, floor role, 환경(계단/엘베컬레이터/지하철), HUD 아이콘
  - 새 키 추가: `SPRITE_KEYS` 항목 추가 → 렌더 코드에 `tryImage(scene, key, x, y, fallback)` 적용 → png 두기. 끝.
- [~] **사운드 파이프라인** — Phaser audio key 시스템으로 전환 완료. 트리거 hook은 모두 박혀있고, `public/sounds/<key>.mp3` 파일만 채우면 즉시 들림 (없으면 silent fallback).
  - [ ] SFX 파일 채우기: `ding`, `coin`, `thief`, `alarm`, `breakdown`, `gameOver`, `click`, `purchase` (필수 8종)
  - [ ] SFX 추가: `modalOpen`, `bossDay`, `holiday` (nice-to-have)
  - [ ] BGM: `bgm-title`, `bgm-game`, `bgm-shop`, `bgm-gameover` (모두 nice)
  - 카탈로그/로드 상태/미리듣기: `/sounds.html` (단일 진실원 = `src/audio/sound.ts` `SOUND_KEYS`)
  - 새 키 추가: `SOUND_KEYS` 에 항목 추가 → `SoundManager` 메서드 추가 → 게임에서 호출. 끝.
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
- [x] **i18n Phase 3** — Event name 다국어 (보스 day / 공휴일) ✅ ko/en 23종
- [~] **Electron 래핑** — 셋업 완료 (`electron/main.cjs`, `package.json` scripts, electron-builder).
  - `pnpm electron:dev` (vite + electron 동시) / `pnpm electron:build` (현재 OS) / `:mac` `:win` `:linux`
  - 빌드 산출물 `release/` (.gitignored)
  - 아이콘 / 코드사이닝 / 자동 업데이트는 별개 TODO
- [ ] **Steamworks SDK** — 업적/클라우드 세이브 (steamworks.js)
- [ ] **윈도우 모드** 향상 — 해상도 선택, 브라우저 줌과 함께 사용 시 충돌 점검
- [ ] **게임패드 대응**
- [ ] **아이콘** — electron/build/icon.{png,ico,icns}
- [ ] **코드사이닝** — macOS Developer ID / Windows EV

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
- 사운드 카탈로그: `/sounds.html`
- 스프라이트 카탈로그: `/sprites.html`
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

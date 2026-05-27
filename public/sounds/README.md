# 사운드 파일 가이드

여기에 `<key>.mp3` (또는 `.ogg` / `.wav`) 파일을 넣으면 게임이 자동으로 로드한다.
**파일이 없어도 게임은 동작한다** — 로드 실패는 silent fallback.

상세 카탈로그(트리거 시점/추천 톤/우선순위)는 게임 실행 후
`http://localhost:5173/sounds.html` 또는 빌드 후 `/sounds.html` 에서 확인.

## 키 목록 (단일 진실원: [src/audio/sound.ts](../../src/audio/sound.ts) `SOUND_KEYS`)

### SFX (효과음) — 우선 작업 권장
- `ding.mp3` — 엘베 도착 (짧은 두 음, 0.2s)
- `coin.mp3` — 골드 획득 (가벼운 짤랑, 0.1s)
- `thief.mp3` — 도둑 강탈 (어두운 sting, 0.3s)
- `alarm.mp3` — 승객 분노 임계 (단속 비프 2회, 0.25s)
- `breakdown.mp3` — 엘베 고장 (메탈 깨짐 + thud, 0.3s)
- `gameOver.mp3` — 게임오버 (하강 sine + tail, 1s)
- `click.mp3` — UI 클릭 (짧은 tick, 0.02s)
- `purchase.mp3` — 상점 구매 (코인 + ding, 0.3s)

### SFX (효과음) — 있으면 좋음
- `modalOpen.mp3` — 모달 진입 (부드러운 sweep, 0.15s)
- `bossDay.mp3` — 보스 day 인트로 (낮은 sawtooth 3음, 0.7s)
- `holiday.mp3` — 공휴일 인트로 (밝은 triangle 3음, 0.6s)

### BGM (배경음) — 모두 nice (무음으로도 OK)
- `bgm-title.mp3` — 타이틀 (1~2분 loop, ambient)
- `bgm-game.mp3` — 플레이 (2~3분 loop, 미니멀 lofi/electronic)
- `bgm-shop.mp3` — 상점 (1~2분 loop, 마트/카페)
- `bgm-gameover.mp3` — 게임오버 (10~20s, 쓸쓸한 피아노)

## 권장 사운드 소스 (CC0/CC-BY)

- [freesound.org](https://freesound.org) — SFX 풍부, 라이선스 필터 가능
- [zapsplat.com](https://zapsplat.com) — 무료 계정 다운로드 (출처 표기)
- [opengameart.org](https://opengameart.org) — CC0/CC-BY 게임 자산
- [itch.io free assets](https://itch.io/game-assets/free/tag-music) — 게임용 음악
- [pixabay.com/sound-effects](https://pixabay.com/sound-effects/) — CC0 무료

## 새 사운드 키 추가 절차

1. [src/audio/sound.ts](../../src/audio/sound.ts) `SOUND_KEYS` 배열에 `{ key, category, label, trigger, suggest, priority }` 항목 추가.
2. 필요 시 `SoundManager` 클래스에 메서드 추가 (예: `mySound() { this.playSfx('mySound'); }`).
3. `public/sounds/<key>.mp3` 파일 두기 (선택 — 나중에 추가해도 무방).
4. `sounds.html` 카탈로그가 자동 갱신.

## 포맷 선택

브라우저 호환을 위해 가능하면 `.mp3` 권장.
Phaser audio loader는 배열 첫 항목부터 시도 (`mp3 → ogg → wav`).
용량은 SFX 50KB 이하, BGM 2MB 이하 목표.

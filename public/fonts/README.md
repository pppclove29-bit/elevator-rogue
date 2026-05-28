# 폰트 파일 가이드

`Galmuri11.woff2` 를 여기에 두면 게임 텍스트가 자동으로 한국어 픽셀 폰트로 표시됩니다.
**파일이 없어도 게임은 동작합니다** — system sans 로 자동 fallback (font-display: swap).

## Galmuri11 받기

- 공식: https://github.com/quiple/galmuri (OFL 라이선스, 상업 사용 OK)
- 직접 빌드 또는 release 의 woff2 다운로드
- 이 폴더에 `Galmuri11.woff2` 라는 이름으로 저장하면 끝.

## 다른 픽셀 폰트로 바꾸기

1. 원하는 폰트 woff2 를 이 폴더에 두기 (이름 임의)
2. `index.html` 의 `@font-face { src: url('/fonts/<파일명>') format('woff2'); }` 수정
3. `src/config.ts` 의 `FONT` 의 첫 family name 을 새 폰트 이름으로 변경

## 주의

- 코드 곳곳에 인라인으로 `fontFamily: '-apple-system, ...'` 가 들어가있어,
  config.ts FONT 만 변경해도 그 부분은 시스템 폰트 유지됩니다 (혼용).
  완전 픽셀화는 후속 cleanup TODO — 인라인 → FONT 상수 교체.
- 영문 픽셀 폰트만 쓰려면 한국어 fallback 도 cascade 에 같이 넣어야 합니다.

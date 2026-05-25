# Elevator Rogue

엘리베이터를 관리해 특정 층에 사람이 몰리지 않도록 하는 2D 로그라이크. 사이드 프로젝트.

## 스택

- Phaser 3 (2D 게임 엔진)
- TypeScript (strict)
- Vite (dev/build)

## 실행

```bash
pnpm install   # 또는 npm install
pnpm dev       # http://localhost:5173
pnpm build     # dist/
pnpm preview   # 빌드 결과 확인
```

## 구조

```
src/
├── main.ts             # Phaser.Game 부트스트랩
└── scenes/
    ├── BootScene.ts    # 초기 진입
    └── MainScene.ts    # 메인 게임 씬 (현재 자리 표시자)
```

## 아이디어 메모

- 코어 루프: 매 턴 새 승객 등장 → 엘리베이터 운행 지시 → 층별 혼잡도 관리
- 실패 조건: 특정 층 혼잡도가 임계치 초과
- 로그라이크 요소: 빌딩/엘리베이터 업그레이드, 랜덤 이벤트(VIP, 화재, 정전 등), 런 단위 진행

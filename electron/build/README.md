# Electron 빌드 리소스

`electron-builder` 가 패키징 시 이 폴더에서 아이콘/리소스를 찾는다.
(package.json `build.directories.buildResources` → `electron/build`)

## 필수 파일 (없어도 빌드는 되지만 기본 Electron 아이콘 사용)

### `icon.png` (전체 플랫폼 fallback)
- **1024×1024** 권장 (electron-builder 가 자동 리사이즈)
- 투명 배경
- 게임 로고 / 빌딩 실루엣 / Elevator 글자 등

### `icon.icns` (macOS 전용, 선호)
- macOS Finder / Dock 아이콘
- `iconutil -c icns icon.iconset/` 로 생성하거나
- electron-builder 가 png 만 있어도 자동 변환 시도

### `icon.ico` (Windows 전용, 선호)
- Windows 실행파일 아이콘
- 256×256 (또는 multi-resolution ico)
- `convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico`

### `background.png` (선택, macOS dmg)
- **540×380** 권장
- dmg 인스톨러 배경 (drag-to-Applications 안내)

## 빠른 시작 (placeholder 만들기)

ImageMagick 있으면:
```bash
# 1024x1024 단색 + 텍스트로 placeholder
magick -size 1024x1024 xc:'#0b0b10' \
  -fill '#f5c542' -gravity center -pointsize 200 \
  -annotate +0+0 'ER' \
  electron/build/icon.png
```

또는 Figma/Photoshop/Aseprite 에서 직접 그리기.

## 코드 사이닝 (출시 시)

- macOS: Apple Developer ID 필요. `electron-builder` 의 `mac.identity` 설정.
- Windows: EV 코드사이닝 인증서 또는 self-signed (스마트스크린 경고).

자세히: https://www.electron.build/code-signing

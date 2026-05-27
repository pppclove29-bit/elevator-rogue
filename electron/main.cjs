/**
 * Electron main 프로세스.
 *
 * 개발: VITE_DEV_URL 환경변수의 vite dev server 를 로드 (기본 http://localhost:5173).
 * 프로덕션: 패키지에 포함된 dist/index.html 를 file:// 로 로드.
 *
 * 보안 기본:
 * - nodeIntegration: false (renderer 에서 Node API 직접 접근 차단)
 * - contextIsolation: true (preload 만이 window 와 통신)
 * 현재 preload 사용 안 함 (Steamworks 연동 시 추가 예정).
 */
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;
const VITE_URL = process.env.VITE_DEV_URL || 'http://localhost:5173';

/** @type {BrowserWindow | null} */
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800, // 게임 720 + 메뉴/타이틀 약간
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#0b0b10',
    title: 'Elevator Rogue',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // 프로덕션에선 메뉴바 비활성화
  if (!isDev) Menu.setApplicationMenu(null);

  if (isDev) {
    mainWindow.loadURL(VITE_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // macOS 는 Dock 에서 명시적으로 종료할 때까지 유지하는 게 표준이지만
  // 게임에선 일관성 위해 모두 종료.
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

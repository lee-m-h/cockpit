import { app, BrowserWindow, Menu, shell, dialog } from "electron";
import { spawn, type ChildProcess } from "child_process";
import * as net from "net";
import * as path from "path";
import * as http from "http";
import { autoUpdater } from "electron-updater";

const IS_DEV = !app.isPackaged;
const ROOT = IS_DEV
  ? path.resolve(__dirname, "..")
  : path.resolve(process.resourcesPath, "app");

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;
let serverPort = 0;

// ─── 빈 포트 찾기 ────────────────────────────────────────────
function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      if (!addr || typeof addr === "string") {
        srv.close();
        return reject(new Error("포트 할당 실패"));
      }
      const port = addr.port;
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

// ─── 서버 기동 대기 ──────────────────────────────────────────
function waitForServer(port: number, timeoutMs = 30_000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      if (Date.now() - start > timeoutMs) {
        return reject(new Error("서버 기동 타임아웃 (30초)"));
      }
      const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
        if (res.statusCode === 200) return resolve();
        setTimeout(check, 500);
      });
      req.on("error", () => setTimeout(check, 500));
      req.end();
    };
    check();
  });
}

// ─── 서버 프로세스 시작 ──────────────────────────────────────
async function startServer(): Promise<number> {
  const port = IS_DEV ? 4000 : await findFreePort();
  serverPort = port;

  // tsx로 server.ts 실행 (dev/prod 공통)
  // 패키징 시 tsx는 node_modules에 포함됨
  const serverScript = path.join(ROOT, "server.ts");

  // tsx 실행 — Electron의 내장 node + ELECTRON_RUN_AS_NODE로 일반 node처럼 동작
  const tsxCli = path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
  const cmd = process.execPath;
  const args = IS_DEV
    ? [path.join(ROOT, "node_modules", ".bin", "tsx"), serverScript]
    : [tsxCli, serverScript];

  const useExecPath = !IS_DEV;

  const child = spawn(
    IS_DEV ? args[0] : cmd,
    IS_DEV ? [serverScript] : args,
    {
      cwd: ROOT,
      env: {
        ...process.env,
        PORT: String(port),
        HOST: "127.0.0.1",
        NODE_ENV: IS_DEV ? "development" : "production",
        ...(useExecPath ? { ELECTRON_RUN_AS_NODE: "1" } : {}),
      },
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32" && IS_DEV,
    },
  );

  child.stdout?.on("data", (data: Buffer) => {
    console.log(`[server] ${data.toString().trim()}`);
  });
  child.stderr?.on("data", (data: Buffer) => {
    console.error(`[server] ${data.toString().trim()}`);
  });
  child.on("exit", (code) => {
    console.log(`[server] 프로세스 종료 (code=${code})`);
    serverProcess = null;
  });

  serverProcess = child;
  return port;
}

// ─── 자동 업데이트 ───────────────────────────────────────────
function setupAutoUpdater(): void {
  if (IS_DEV) return; // 개발 모드에서는 비활성

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    console.log(`[updater] 새 버전 발견: v${info.version}`);
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log(`[updater] 다운로드 완료: v${info.version}`);
    // 사용자에게 알림
    if (mainWindow) {
      dialog
        .showMessageBox(mainWindow, {
          type: "info",
          title: "업데이트",
          message: `새 버전 (v${info.version})이 준비되었습니다.`,
          detail: "앱을 재시작하면 업데이트가 적용됩니다.",
          buttons: ["지금 재시작", "나중에"],
          defaultId: 0,
        })
        .then(({ response }) => {
          if (response === 0) {
            autoUpdater.quitAndInstall();
          }
        });
    }
  });

  autoUpdater.on("error", (err) => {
    console.error("[updater] 오류:", err.message);
  });

  // 시작 후 5초 뒤 업데이트 확인
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 5000);
}

// ─── 메뉴 ────────────────────────────────────────────────────
function buildMenu(): void {
  const isMac = process.platform === "darwin";
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),
    {
      label: "편집",
      submenu: [
        { role: "undo", label: "실행 취소" },
        { role: "redo", label: "다시 실행" },
        { type: "separator" },
        { role: "cut", label: "잘라내기" },
        { role: "copy", label: "복사" },
        { role: "paste", label: "붙여넣기" },
        { role: "selectAll", label: "전체 선택" },
      ],
    },
    {
      label: "보기",
      submenu: [
        { role: "reload", label: "새로고침" },
        { role: "forceReload", label: "강제 새로고침" },
        { role: "toggleDevTools", label: "개발자 도구" },
        { type: "separator" },
        { role: "zoomIn", label: "확대" },
        { role: "zoomOut", label: "축소" },
        { role: "resetZoom", label: "기본 크기" },
        { type: "separator" },
        { role: "togglefullscreen", label: "전체 화면" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── 창 생성 ─────────────────────────────────────────────────
function createWindow(port: number): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "Cockpit",
    backgroundColor: "#0b0d12",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}`);

  // 외부 링크는 기본 브라우저에서 열기
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://127.0.0.1")) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ─── 앱 라이프사이클 ─────────────────────────────────────────
app.whenReady().then(async () => {
  buildMenu();
  setupAutoUpdater();

  try {
    const port = await startServer();
    console.log(`[cockpit] 서버 시작 중 (port=${port})…`);
    await waitForServer(port);
    console.log(`[cockpit] 서버 준비 완료!`);
    createWindow(port);
  } catch (err) {
    console.error("[cockpit] 서버 시작 실패:", err);
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0 && serverPort > 0) {
      createWindow(serverPort);
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill("SIGTERM");
    serverProcess = null;
  }
});

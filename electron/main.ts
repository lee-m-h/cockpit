import { app, BrowserWindow, Menu, shell } from "electron";
import { spawn, type ChildProcess } from "child_process";
import * as path from "path";
import * as http from "http";

// 앱 이름 설정 (Dock, 메뉴바, 창 타이틀에 표시됨)
app.setName("Cockpit");

const ROOT = path.resolve(__dirname, "..");

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;
const PORT = 4000;

// ─── 서버 기동 대기 ──────────────────────────────────────────
function waitForServer(timeoutMs = 30_000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      if (Date.now() - start > timeoutMs) {
        return reject(new Error("서버 기동 타임아웃 (30초)"));
      }
      const req = http.get(`http://127.0.0.1:${PORT}/api/health`, (res) => {
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
function startServer(): void {
  const serverScript = path.join(ROOT, "server.ts");
  const tsxBin = path.join(ROOT, "node_modules", ".bin", "tsx");

  const child = spawn(tsxBin, [serverScript], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      HOST: "127.0.0.1",
      NODE_ENV: "development",
    },
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });

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
}

// ─── 메뉴 ────────────────────────────────────────────────────
function buildMenu(): void {
  const isMac = process.platform === "darwin";
  const template: any[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
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
function createWindow(): void {
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

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);

  // 페이지 title이 창 타이틀을 덮어쓰지 않도록 고정
  mainWindow.on("page-title-updated", (e) => e.preventDefault());

  mainWindow.webContents.setWindowOpenHandler(({ url }: any) => {
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
  startServer();

  try {
    console.log(`[cockpit] 서버 시작 중 (port=${PORT})…`);
    await waitForServer();
    console.log(`[cockpit] 서버 준비 완료!`);
    createWindow();
  } catch (err) {
    console.error("[cockpit] 서버 시작 실패:", err);
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
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

// Cockpit Electron preload script
// contextIsolation: true 환경에서 renderer에 노출할 API 정의.

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("cockpitElectron", {
  /** webview DevTools를 지정한 webContents에 도킹 */
  dockDevTools: (webviewWCId: number, devtoolsWCId: number) =>
    ipcRenderer.invoke("dock-devtools", webviewWCId, devtoolsWCId),
  /** DevTools 닫기 */
  closeDevTools: (webviewWCId: number) =>
    ipcRenderer.invoke("close-devtools", webviewWCId),
  /** DevTools 열림 여부 */
  isDevToolsOpened: (webviewWCId: number) =>
    ipcRenderer.invoke("is-devtools-opened", webviewWCId),
});

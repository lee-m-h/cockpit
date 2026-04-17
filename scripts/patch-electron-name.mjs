#!/usr/bin/env node
/**
 * Electron dev 모드에서 macOS 메뉴바/Dock 앱 이름을 "Cockpit"으로 변경.
 * node_modules/electron/dist/Electron.app/Contents/Info.plist의
 * CFBundleName / CFBundleDisplayName을 치환.
 *
 * packaged 앱이 아닌 dev 모드에서만 필요.
 */
import fs from "node:fs";
import path from "node:path";

const APP_NAME = "Cockpit";

function patchMacPlist() {
  const plistPath = path.resolve(
    "node_modules/electron/dist/Electron.app/Contents/Info.plist",
  );
  if (!fs.existsSync(plistPath)) return;

  let content = fs.readFileSync(plistPath, "utf8");
  let changed = false;

  // CFBundleName
  content = content.replace(
    /(<key>CFBundleName<\/key>\s*<string>)[^<]*(<\/string>)/,
    (_, p1, p2) => {
      changed = true;
      return `${p1}${APP_NAME}${p2}`;
    },
  );

  // CFBundleDisplayName — 없으면 추가
  if (/<key>CFBundleDisplayName<\/key>/.test(content)) {
    content = content.replace(
      /(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*(<\/string>)/,
      (_, p1, p2) => {
        changed = true;
        return `${p1}${APP_NAME}${p2}`;
      },
    );
  } else {
    content = content.replace(
      /(<key>CFBundleName<\/key>\s*<string>[^<]*<\/string>)/,
      `$1\n\t<key>CFBundleDisplayName</key>\n\t<string>${APP_NAME}</string>`,
    );
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(plistPath, content);
    console.log(`[patch-electron-name] ${plistPath} → ${APP_NAME}`);
  }
}

if (process.platform === "darwin") {
  patchMacPlist();
}

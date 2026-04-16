import type { NextConfig } from "next";
import pkg from "./package.json";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Electron 패키징용 자체 포함 빌드 (NEXT_OUTPUT=default 로 비활성화 가능)
  output: process.env.NEXT_OUTPUT === "default" ? undefined : "standalone",
  // node-pty, ws는 서버 전용
  serverExternalPackages: ["node-pty", "ws"],
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  experimental: {
    // app router는 기본
  },
  // xterm.js는 클라이언트 전용이라 별도 처리 불필요 ('use client' + dynamic import)
};

export default nextConfig;

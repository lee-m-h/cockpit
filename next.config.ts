import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone", // Electron 패키징용 자체 포함 빌드
  // node-pty, ws는 서버 전용
  serverExternalPackages: ["node-pty", "ws"],
  experimental: {
    // app router는 기본
  },
  // xterm.js는 클라이언트 전용이라 별도 처리 불필요 ('use client' + dynamic import)
};

export default nextConfig;

import type { NextConfig } from "next";
import path from "path";
import pkg from "./package.json";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Electron 패키징용 자체 포함 빌드 (NEXT_OUTPUT=default 로 비활성화 가능)
  output: process.env.NEXT_OUTPUT === "default" ? undefined : "standalone",
  // standalone 빌드 시 파일 추적 범위를 프로젝트 루트로 제한 (Windows CI EPERM 방지)
  outputFileTracingRoot: path.resolve(__dirname),
  // node-pty, ws는 서버 전용
  serverExternalPackages: ["node-pty", "ws"],
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  experimental: {
    // app router는 기본
  },
};

export default nextConfig;

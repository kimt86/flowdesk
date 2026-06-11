/** @type {import('next').NextConfig} */
const nextConfig = {
  // 데스크톱(Electron) 임베드용 standalone 서버 산출 — .next/standalone/server.js
  output: "standalone",
  // mermaid 11 ESM 번들이 Terser minify 파싱을 깨뜨림 → Next SWC 파이프라인으로
  // transpile해 호환 문법으로 낮춘다.
  transpilePackages: ["mermaid"],
  experimental: {
    // 동적 import('chokidar')를 webpack 번들에서 제외해 node_modules에서 직접 로드
    // (Next의 정적 트레이서가 계산된 require를 못 따라가는 문제 회피)
    // @github/copilot-sdk(+@github/copilot 런타임 로더)도 동일 처리 — 번들 대신 standalone
    // node_modules에서 require, copilot.exe(@github/copilot-win32-x64)는 extraResources로 동봉.
    serverComponentsExternalPackages: [
      "chokidar",
      "@github/copilot-sdk",
      "@github/copilot",
    ],
    // 서버 부팅 시 instrumentation.ts의 register() 실행 (Phase 3: file-watcher 부팅 초기화)
    instrumentationHook: true,
  },
};

export default nextConfig;

// next build(output:'standalone') 후 실행: standalone은 .next/static 과 public 을
// 자동 복사하지 않으므로 수동으로 채워 넣어 임베드 서버가 정적 자산을 서빙하도록 한다.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const standalone = join(root, ".next", "standalone");

if (!existsSync(join(standalone, "server.js"))) {
  console.error(
    "[copy-standalone] .next/standalone/server.js 가 없습니다. 먼저 `next build`(output:'standalone')를 실행하세요.",
  );
  process.exit(1);
}

// .next/static → .next/standalone/.next/static
const staticSrc = join(root, ".next", "static");
const staticDest = join(standalone, ".next", "static");
mkdirSync(dirname(staticDest), { recursive: true });
cpSync(staticSrc, staticDest, { recursive: true });

// public → .next/standalone/public (있을 때만).
// aa_ 커스텀 한글 폰트(비공개·라이선스)는 배포 패키지에서 제외 → 설치본은 무료 폰트로
// 폴백(globals.css @font-face src 404 → Pretendard/Paperlogy). dev 로컬 서버는 영향 없음.
const publicSrc = join(root, "public");
if (existsSync(publicSrc)) {
  cpSync(publicSrc, join(standalone, "public"), {
    recursive: true,
    filter: (src) => !/[\\/]aa_[^\\/]*\.ttf$/i.test(src),
  });
}

console.log("[copy-standalone] static/public → .next/standalone 복사 완료");

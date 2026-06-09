// electron-builder afterPack 훅.
// 문제: electron-builder의 글로벌 `!**/node_modules/**` 필터가 extraResources로 복사하는
// .next/standalone 의 node_modules(=nft가 트레이싱한 서버 런타임 deps: next/react/chokidar 등)를
// 제외해버려, 패키지된 standalone 서버가 require에 실패한다.
// 해결: 패키징 후 standalone node_modules를 resources/standalone/node_modules로 직접 복사(필터 무관).
const path = require("node:path");
const fs = require("node:fs");

exports.default = async function afterPack(context) {
  const projectRoot = path.join(__dirname, "..");
  const src = path.join(projectRoot, ".next", "standalone", "node_modules");
  const dest = path.join(
    context.appOutDir,
    "resources",
    "standalone",
    "node_modules",
  );

  if (!fs.existsSync(src)) {
    console.warn("[after-pack] standalone node_modules 없음(빌드 누락?):", src);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  const count = fs.readdirSync(dest).length;
  console.log(`[after-pack] standalone node_modules 복사 완료 (${count} 항목) → ${dest}`);
};

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { WORKSPACE_ROOT } from "@/lib/paths";

export const dynamic = "force-dynamic";

/**
 * 워크스페이스의 `.fonts/` 폴더에서 커스텀 폰트(aa_*.ttf)를 서빙한다.
 *
 * 의도: 라이선스상 비공개인 aa_ 폰트를 앱 번들/저장소에 넣지 않고 사용자 워크스페이스에
 * 둔다. 폰트가 있으면 200으로 서빙(→ aa 렌더), 없으면 404 → globals.css @font-face가
 * Pretendard/Paperlogy로 자동 폴백. 자동 업데이트는 앱 번들만 교체하고 워크스페이스
 * `.fonts/`는 건드리지 않으므로 업데이트 후에도 폰트가 유지된다.
 */
const FONTS_DIR = path.join(WORKSPACE_ROOT, ".fonts");

// aa_ 접두 + 영숫자/언더스코어 + .ttf 만 허용 (path traversal 차단)
const ALLOWED = /^aa_[A-Za-z0-9_-]+\.ttf$/;

export async function GET(
  _req: Request,
  { params }: { params: { name: string } },
) {
  const { name } = params;
  if (!ALLOWED.test(name)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const filePath = path.join(FONTS_DIR, name);
  // 경계 이중 검증
  if (!filePath.startsWith(FONTS_DIR + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }
  try {
    const buf = fs.readFileSync(filePath);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "font/ttf",
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}

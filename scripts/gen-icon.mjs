// 외부 도구 없이(ImageMagick 등 불필요) 순수 Node로 FlowDesk 브랜드 아이콘 PNG 생성.
// 디자인: 단청 레드(#C9452B) 바탕 + 흰 인장(印) 프레임 — DESIGN.md "한지와 먹" 모티프.
// electron-builder가 icon.png(256+)를 .ico로 자동 변환. 트레이용 32px도 생성.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "build-resources");
mkdirSync(outDir, { recursive: true });

// CRC32 (PNG chunk용)
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// RGBA 픽셀 버퍼를 PNG로 인코딩
function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // 각 스캔라인 앞에 filter 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// 단청 레드 바탕 + 흰 인장 프레임 렌더
function render(size) {
  const red = [201, 69, 43, 255]; // #C9452B
  const white = [245, 241, 232, 255]; // warm paper
  const buf = Buffer.alloc(size * size * 4);
  const inset = Math.round(size * 0.18);
  const stroke = Math.max(2, Math.round(size * 0.055));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // 프레임(인장 테두리) 영역인지 판정
      const onFrame =
        (x >= inset && x < size - inset && y >= inset && y < size - inset) &&
        (x < inset + stroke ||
          x >= size - inset - stroke ||
          y < inset + stroke ||
          y >= size - inset - stroke);
      const c = onFrame ? white : red;
      const o = (y * size + x) * 4;
      buf[o] = c[0];
      buf[o + 1] = c[1];
      buf[o + 2] = c[2];
      buf[o + 3] = c[3];
    }
  }
  return buf;
}

// icon.png(256): 빌드 타임 앱 아이콘(electron-builder가 .ico로 변환) → build-resources/
// tray.png(32): 런타임 트레이 아이콘 → electron/ (asar에 번들되어 패키지에서도 로드 가능)
const icon256 = encodePng(256, 256, render(256));
writeFileSync(join(outDir, "icon.png"), icon256); // 빌드: electron-builder → .ico
writeFileSync(join(root, "electron", "icon.png"), icon256); // 런타임: 창/알림 아이콘
writeFileSync(join(root, "electron", "tray.png"), encodePng(32, 32, render(32))); // 트레이
console.log("[gen-icon] build-resources/icon.png, electron/icon.png (256), electron/tray.png (32) 생성");

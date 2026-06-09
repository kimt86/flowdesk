import type { Metadata } from "next";
import {
  IBM_Plex_Mono,
  IBM_Plex_Sans_KR,
  JetBrains_Mono,
  Noto_Serif_KR,
} from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { FileChangeListener } from "@/components/file-change-listener";
import { CommandPalette } from "@/components/command-palette";

// aa_ 커스텀 한글 폰트(sans 본문 + display 타이틀)는 globals.css의 @font-face
// (/fonts/aa_*.ttf, 비공개 자산)로 로드한다. 파일이 있으면 그걸로 렌더,
// 없으면(저장소 미포함·미배치) Pretendard/Paperlogy 등 무료 폰트로 자동 폴백.

// Google 폰트 — next/font/google이 빌드 타임에 다운로드해 .next/static에 self-host한다.
// 런타임 CDN 호출 0 → 오프라인 데스크톱에서도 동작. 이들은 Latin/숫자 위주 역할이며
// 한글은 self-host된 Pretendard(전체 한글) / Paperlogy(디스플레이)로 폴백된다(globals.css).
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});
const ibmPlexSansKr = IBM_Plex_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-ibm-plex-sans-kr",
  display: "swap",
  preload: false,
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});
const notoSerifKr = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-noto-serif-kr",
  display: "swap",
  preload: false,
});

const fontVariables = [
  ibmPlexMono.variable,
  ibmPlexSansKr.variable,
  jetbrainsMono.variable,
  notoSerifKr.variable,
].join(" ");

export const metadata: Metadata = {
  title: "FlowDesk",
  description: "업무의 흐름을 한 곳에서",
};

// Runs before React hydrates — prevents flash of wrong theme.
const themeInitScript = `
(function(){try{
  var t = localStorage.getItem("flowdesk-theme");
  if (!t) { t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; }
  if (t === "dark") document.documentElement.setAttribute("data-theme","dark");
}catch(e){}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning className={fontVariables}>
      <head>
        {/* 폰트는 전부 self-host(next/font + public/fonts @font-face) — 런타임 CDN 없음(오프라인 보장). */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">
        <div className="flex flex-col md:flex-row min-h-screen bg-background text-foreground">
          <Sidebar />
          <main className="flex-1 overflow-auto">{children}</main>
          <FileChangeListener />
          <CommandPalette />
        </div>
      </body>
    </html>
  );
}

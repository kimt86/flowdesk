import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { FileChangeListener } from "@/components/file-change-listener";
import { CommandPalette } from "@/components/command-palette";

export const metadata: Metadata = {
  title: "FlowDesk — CLT Digital Team",
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
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* Pretendard Variable — Korean-first body face */}
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
        {/* IBM Plex Sans KR (data) + IBM Plex Mono (metadata) + JetBrains Mono (code) + Noto Serif KR (Paperlogy fallback) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans+KR:wght@400;500;700&family=JetBrains+Mono:wght@400;500&family=Noto+Serif+KR:wght@700;900&display=swap"
          rel="stylesheet"
        />
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

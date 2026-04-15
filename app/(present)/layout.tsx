import type { Metadata } from "next";
import { FileChangeListener } from "@/components/file-change-listener";
import "../globals.css";

export const metadata: Metadata = {
  title: "FlowDesk — 발표 모드",
  description: "마크다운 발표 모드",
};

export default function PresentLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
        <FileChangeListener />
      </body>
    </html>
  );
}

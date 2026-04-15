"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Monitor } from "lucide-react";

interface Props {
  html: string;
  title: string;
  backHref: string;
}

export function MarkdownPresenter({ html, title, backHref }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fullscreenEnabled, setFullscreenEnabled] = useState(true);
  const [showButton, setShowButton] = useState(false);

  const handleClose = async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // Fullscreen exit 실패해도 계속 진행
      }
    }
    // 발표 모드와 뷰어는 서로 다른 루트 레이아웃을 쓰므로 풀 페이지 리로드 필요
    window.location.href = backHref;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 자동 fullscreen 시도
    const requestFull = async () => {
      try {
        await document.documentElement.requestFullscreen();
        setFullscreenEnabled(true);
      } catch {
        // fullscreen 불가 (보안 정책, 사용자 제스처 필요 등)
        setShowButton(true);
      }
    };

    // 약간의 delay 후 시도 (DOM 렌더링 이후)
    const timer = setTimeout(requestFull, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleManualFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setShowButton(false);
    } catch {
      console.error("Fullscreen request failed");
    }
  };

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-background text-foreground overflow-auto flex flex-col"
    >
      {/* 헤더: 닫기 + 제목 + 수동 fullscreen 버튼 */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm px-6 py-4 flex items-center justify-between shrink-0">
        <button
          onClick={handleClose}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          닫기
        </button>
        <h1 className="text-sm font-semibold text-center flex-1 mx-4 truncate">
          {title}
        </h1>
        {showButton && (
          <button
            onClick={handleManualFullscreen}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Monitor className="w-3.5 h-3.5" />
            전체화면
          </button>
        )}
        {!showButton && <div className="w-20" />}
      </div>

      {/* 본문: prose + 큰 폰트 */}
      <div className="flex-1 flex justify-center py-8 px-6">
        <div
          className="prose prose-invert max-w-5xl w-full
            [&_h1]:text-5xl [&_h1]:font-bold [&_h1]:mb-6 [&_h1]:mt-8
            [&_h2]:text-4xl [&_h2]:font-bold [&_h2]:mb-5 [&_h2]:mt-6
            [&_h3]:text-3xl [&_h3]:font-semibold [&_h3]:mb-4 [&_h3]:mt-5
            [&_h4]:text-2xl [&_h4]:font-semibold [&_h4]:mb-3 [&_h4]:mt-4
            [&_h5]:text-xl [&_h5]:font-semibold [&_h5]:mb-3 [&_h5]:mt-3
            [&_h6]:text-lg [&_h6]:font-semibold [&_h6]:mb-2 [&_h6]:mt-3
            [&_p]:text-2xl [&_p]:leading-relaxed [&_p]:mb-6
            [&_li]:text-2xl [&_li]:leading-relaxed [&_li]:mb-2
            [&_ul]:mb-6 [&_ol]:mb-6
            [&_code]:text-xl [&_code]:px-2 [&_code]:py-1 [&_code]:rounded [&_code]:bg-muted
            [&_pre]:text-lg [&_pre]:overflow-auto [&_pre]:mb-6
            [&_blockquote]:text-xl [&_blockquote]:italic [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:my-6
            [&_table]:text-lg [&_table]:mb-6
            [&_a]:text-primary [&_a]:underline hover:[&_a]:no-underline
            dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}

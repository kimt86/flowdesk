"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Monitor } from "lucide-react";

/*
 * MarkdownPresenter — "한지와 먹" 발표 모드
 * 풀블리드 hanji 배경, Paperlogy 96px 타이틀, 단청 레드 4px 시그니처 룰.
 */
interface Props {
  html: string;
  title: string;
  backHref: string;
}

export function MarkdownPresenter({ html, title, backHref }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showButton, setShowButton] = useState(false);

  const handleClose = async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // 실패해도 계속 진행
      }
    }
    window.location.href = backHref;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const requestFull = async () => {
      try {
        await document.documentElement.requestFullscreen();
      } catch {
        setShowButton(true);
      }
    };

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
      {/* 상단 유틸리티 바 — 얇고 조용하게 */}
      <div className="sticky top-0 z-10 bg-background/85 backdrop-blur-sm">
        <div className="flex items-center justify-between px-lg py-2">
          <button
            type="button"
            onClick={handleClose}
            aria-label="닫기"
            className="inline-flex items-center gap-1.5 mono-meta !normal-case !tracking-snug text-xs text-muted-foreground hover:text-foreground transition-colors duration-short ease-out-flow"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
            닫기
          </button>
          <h1 className="mono-meta !normal-case !tracking-snug text-xs text-ink-soft flex-1 text-center mx-lg truncate">
            {title}
          </h1>
          {showButton ? (
            <button
              type="button"
              onClick={handleManualFullscreen}
              aria-label="전체화면"
              className="inline-flex items-center gap-1.5 mono-meta !normal-case !tracking-snug text-xs text-muted-foreground hover:text-foreground transition-colors duration-short ease-out-flow"
            >
              <Monitor className="w-3.5 h-3.5" strokeWidth={1.5} />
              전체화면
            </button>
          ) : (
            <span className="w-16" aria-hidden />
          )}
        </div>
        {/* 시그니처: 단청 레드 4px 룰 — 발표 내내 존재 */}
        <div className="h-[4px] bg-accent" aria-hidden />
      </div>

      {/* 본문 — prose 위에 발표 스케일 덮기 */}
      <div className="flex-1 flex justify-center py-2xl px-lg">
        <div
          className="prose w-full max-w-5xl
            [&_h1]:font-display [&_h1]:text-[64px] md:[&_h1]:text-[96px] [&_h1]:font-black [&_h1]:leading-[0.92] [&_h1]:tracking-display [&_h1]:mb-lg [&_h1]:mt-xl [&_h1]:border-0
            [&_h2]:font-display [&_h2]:text-5xl [&_h2]:font-bold [&_h2]:leading-tight [&_h2]:tracking-tight [&_h2]:mb-md [&_h2]:mt-xl [&_h2]:border-0 [&_h2]:pb-0
            [&_h3]:font-display [&_h3]:text-4xl [&_h3]:font-bold [&_h3]:leading-tight [&_h3]:tracking-tight [&_h3]:mb-md [&_h3]:mt-lg
            [&_h4]:font-display [&_h4]:text-3xl [&_h4]:font-bold [&_h4]:mb-sm [&_h4]:mt-md
            [&_p]:text-2xl [&_p]:leading-[1.55] [&_p]:mb-lg
            [&_li]:text-2xl [&_li]:leading-[1.55] [&_li]:mb-2
            [&_ul]:mb-lg [&_ol]:mb-lg
            [&_code]:text-xl [&_code]:px-2 [&_code]:py-1
            [&_pre]:text-lg [&_pre]:mb-lg [&_pre]:border-l-[3px] [&_pre]:border-l-accent
            [&_blockquote]:text-2xl [&_blockquote]:border-l-[3px] [&_blockquote]:border-l-accent [&_blockquote]:pl-lg [&_blockquote]:my-lg [&_blockquote]:not-italic
            [&_hr]:my-2xl [&_hr]:border-border-strong
            [&_table]:text-lg [&_table]:mb-lg
            [&_a]:text-foreground [&_a]:underline [&_a]:decoration-accent [&_a]:underline-offset-4 [&_a]:decoration-[2px]"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      {/* 하단 footer — 얇은 signature */}
      <div className="px-lg py-sm border-t border-border mono-meta flex justify-between items-center shrink-0">
        <span className="inline-flex items-center gap-2">
          <span className="seal" aria-hidden />
          FlowDesk · Presenter
        </span>
        <span className="!normal-case !tracking-snug text-xs text-muted-foreground truncate max-w-[50%]">
          {title}
        </span>
      </div>
    </div>
  );
}

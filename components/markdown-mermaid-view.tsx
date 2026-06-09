"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

interface Props {
  html: string;
  className?: string;
}

interface ContentProps {
  html: string;
  className: string;
  onSvgClick: (svgHtml: string) => void;
}

/**
 * 컨텐츠 div + mermaid 렌더링을 담당. memo로 감싸 zoom state 변경 시
 * 재렌더링되지 않도록 — dangerouslySetInnerHTML이 다시 적용돼 mermaid SVG가
 * 원본 <pre><code>로 리셋되는 사고를 방지.
 */
const ContentDiv = memo(function ContentDiv({
  html,
  className,
  onSvgClick,
}: ContentProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const blocks = Array.from(
      root.querySelectorAll<HTMLElement>("pre > code.language-mermaid"),
    );
    if (blocks.length === 0) {
      root.setAttribute("data-mermaid-status", "ready");
      return;
    }

    root.setAttribute("data-mermaid-status", "rendering");

    let cancelled = false;
    let counter = 0;

    (async () => {
      // 풀번들 엔트리: 모든 다이어그램이 사전 포함됨.
      // 기본 "mermaid" 엔트리는 다이어그램별 동적 import를 쓰는데, Next.js
      // webpack이 node_modules 내부 chunk를 못 찾아 런타임에 실패한다.
      let mermaid: typeof import("mermaid").default;
      try {
        mermaid = (
          await import("mermaid/dist/mermaid.esm.min.mjs" as string)
        ).default;
      } catch (err) {
        console.error("[mermaid] 모듈 로드 실패:", err);
        root.setAttribute("data-mermaid-status", "error");
        return;
      }
      const isDark =
        document.documentElement.getAttribute("data-theme") === "dark";

      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        fontFamily:
          "var(--font-aa-sans), Pretendard Variable, Pretendard, sans-serif",
        theme: "base",
        themeVariables: isDark
          ? {
              background: "#1D1A17",
              primaryColor: "#25211C",
              primaryTextColor: "#ECE6D9",
              primaryBorderColor: "#3C362F",
              lineColor: "#857F74",
              secondaryColor: "#1D1A17",
              tertiaryColor: "#141210",
              noteBkgColor: "#25211C",
              noteTextColor: "#ECE6D9",
              noteBorderColor: "#3C362F",
            }
          : {
              background: "#FBF8F1",
              primaryColor: "#FBF8F1",
              primaryTextColor: "#1A1816",
              primaryBorderColor: "#B8AE99",
              lineColor: "#6D685F",
              secondaryColor: "#F0EADC",
              tertiaryColor: "#F5F1E8",
              noteBkgColor: "#F0EADC",
              noteTextColor: "#1A1816",
              noteBorderColor: "#D9D1C0",
            },
      });

      if (cancelled) return;

      for (const codeEl of blocks) {
        if (cancelled) return;
        const pre = codeEl.parentElement;
        if (!pre) continue;

        const source = codeEl.textContent ?? "";
        const id = `mermaid-${Date.now()}-${counter++}`;
        const container = document.createElement("div");
        container.className = "mermaid-rendered my-4 flex justify-center";
        pre.replaceWith(container);

        try {
          const { svg, bindFunctions } = await mermaid.render(id, source);
          if (cancelled) return;
          container.innerHTML = svg;
          bindFunctions?.(container);

          // 클릭 → 확대 보기
          container.style.cursor = "zoom-in";
          container.title = "클릭해서 크게 보기";
          container.addEventListener("click", () => {
            onSvgClick(container.innerHTML);
          });
        } catch (err) {
          container.innerHTML = `<pre class="text-xs text-[var(--danger)] border border-[var(--border)] p-3 rounded whitespace-pre-wrap">mermaid 렌더링 오류:\n${String(
            err instanceof Error ? err.message : err,
          ).replace(/[<>&]/g, (c) =>
            c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&amp;",
          )}</pre>`;
        }
      }

      if (!cancelled) root.setAttribute("data-mermaid-status", "ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [html, onSvgClick]);

  return (
    <div
      ref={ref}
      data-doc-content-root=""
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

export function MarkdownMermaidView({ html, className = "prose" }: Props) {
  const [zoomedSvg, setZoomedSvg] = useState<string | null>(null);

  // 안정적 콜백 — ContentDiv의 memo가 깨지지 않도록
  const handleSvgClick = useCallback((svgHtml: string) => {
    setZoomedSvg(svgHtml);
  }, []);

  return (
    <>
      <ContentDiv
        html={html}
        className={className}
        onSvgClick={handleSvgClick}
      />
      <Dialog.Root
        open={zoomedSvg !== null}
        onOpenChange={(open) => {
          if (!open) setZoomedSvg(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-foreground/40 backdrop-blur-[2px] z-50 animate-in fade-in duration-micro" />
          <Dialog.Content
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(95vw,1400px)] max-h-[92vh] bg-surface border border-border-strong rounded-sm z-50 overflow-auto"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Dialog.Title className="sr-only">다이어그램 확대 보기</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="닫기"
                className="absolute top-3 right-3 z-10 inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
            {zoomedSvg && (
              <div
                className="flex items-center justify-center p-8 min-h-[60vh] [&_svg]:!max-w-full [&_svg]:!h-auto [&_svg]:w-full"
                dangerouslySetInnerHTML={{ __html: zoomedSvg }}
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

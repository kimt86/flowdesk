"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  FileText,
  ImageIcon,
  Loader2,
  X,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

interface Props {
  markdown: string;
}

type Status = "idle" | "working" | "copied" | "failed";

function legacyCopy(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.opacity = "0";
  textarea.setAttribute("readonly", "");
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(textarea);
  return ok;
}

const utf8ToBase64 = (s: string): string => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
};

async function svgToPngDataUrl(
  svg: SVGElement,
  width: number,
  height: number,
  scale = 2,
): Promise<string> {
  const xml = new XMLSerializer().serializeToString(svg);
  const dataUrl = `data:image/svg+xml;base64,${utf8ToBase64(xml)}`;

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("SVG → Image 로드 실패"));
    img.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context 없음");
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/png");
}

interface BuildResult {
  html: string;
  text: string;
}

/**
 * 외부 앱(구글 Docs/Word 등)이 prose 클래스 CSS를 참조할 수 없으므로
 * 표/헤더/셀 테두리를 인라인 style로 주입한다. 색은 DESIGN.md 라이트 팔레트 기준.
 */
function inlineCopyStyles(root: HTMLElement) {
  const BORDER = "1px solid #D9D1C0";
  const HEADER_BG = "#F0EADC";
  const PADDING = "6px 10px";

  root.querySelectorAll("table").forEach((t) => {
    t.setAttribute("border", "1");
    t.style.borderCollapse = "collapse";
    t.style.width = "100%";
    t.style.marginBottom = "1em";
  });
  root.querySelectorAll("th").forEach((th) => {
    th.style.border = BORDER;
    th.style.padding = PADDING;
    th.style.backgroundColor = HEADER_BG;
    th.style.textAlign = "left";
    th.style.fontWeight = "600";
  });
  root.querySelectorAll("td").forEach((td) => {
    td.style.border = BORDER;
    td.style.padding = PADDING;
    td.style.verticalAlign = "top";
  });
}

/**
 * mermaid 렌더링이 끝날 때까지 대기 (최대 timeoutMs).
 * MarkdownMermaidView가 root에 data-mermaid-status로 상태를 노출:
 * 미설정 = 효과 미실행, "rendering" = 진행 중, "ready"/"error" = 완료.
 */
async function waitForMermaidReady(
  root: HTMLElement,
  timeoutMs = 8000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const status = root.getAttribute("data-mermaid-status");
    if (status === "ready" || status === "error") return;
    await new Promise((r) => setTimeout(r, 50));
  }
  console.warn("[copy] mermaid 렌더 대기 타임아웃 — 현재 상태로 진행");
}

async function buildRichPayload(): Promise<BuildResult | null> {
  const root = document.querySelector<HTMLElement>("[data-doc-content-root]");
  if (!root) return null;

  // mermaid가 아직 렌더 중이면 기다림 — 그렇지 않으면 <pre><code> 텍스트가 그대로 복사됨
  await waitForMermaidReady(root);

  const clone = root.cloneNode(true) as HTMLElement;
  const originalSvgs = Array.from(root.querySelectorAll<SVGElement>("svg"));
  const cloneSvgs = Array.from(clone.querySelectorAll<SVGElement>("svg"));

  for (let i = 0; i < cloneSvgs.length; i++) {
    const origSvg = originalSvgs[i];
    const cloneSvg = cloneSvgs[i];
    if (!origSvg || !cloneSvg) continue;

    const bbox = origSvg.getBoundingClientRect();
    const w = Math.max(1, Math.round(bbox.width));
    const h = Math.max(1, Math.round(bbox.height));

    try {
      const png = await svgToPngDataUrl(origSvg, w, h);
      const img = clone.ownerDocument.createElement("img");
      img.src = png;
      img.width = w;
      img.height = h;
      const wrapper = cloneSvg.closest(".mermaid-rendered") ?? cloneSvg;
      wrapper.parentNode?.replaceChild(img, wrapper);
    } catch (err) {
      console.warn("[copy] SVG → PNG 실패, 해당 다이어그램 제외", err);
    }
  }

  inlineCopyStyles(clone);

  // 구글 Docs는 <html><body>...</body></html> 형태를 안정적으로 인식.
  // <!DOCTYPE>이나 <head>는 일부 파서에서 plain text로 폴백 시키는 사례 있음.
  const html = `<html><body><meta charset="utf-8">${clone.innerHTML}</body></html>`;
  const text = (root as HTMLElement).innerText;
  return { html, text };
}

export function MarkdownCopyButton({ markdown }: Props) {
  const [status, setStatus] = useState<Status>("idle");

  const flash = (s: Exclude<Status, "working">) => {
    setStatus(s);
    setTimeout(() => setStatus("idle"), 1500);
  };

  async function handleRich() {
    setStatus("working");

    // Promise<Blob> 패턴: clipboard.write를 사용자 제스처 직후 동기적으로 호출.
    // 내부 SVG→PNG 변환은 비동기지만, 브라우저는 이 호출을 gesture 컨텍스트 안에서
    // 시작된 것으로 간주한다. (await buildRichPayload() 후 write 하면 Chrome에서
    // gesture가 만료돼 plain text 폴백으로 빠지는 사례가 있다.)
    try {
      if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
        const built = await buildRichPayload();
        if (!built) throw new Error("렌더된 콘텐츠를 찾을 수 없습니다");
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(built.text);
          flash("copied");
        } else {
          flash(legacyCopy(built.text) ? "copied" : "failed");
        }
        return;
      }

      const buildPromise = buildRichPayload();
      const item = new ClipboardItem({
        "text/html": buildPromise.then((b) => {
          if (!b) throw new Error("렌더된 콘텐츠를 찾을 수 없습니다");
          return new Blob([b.html], { type: "text/html" });
        }),
        "text/plain": buildPromise.then((b) => {
          if (!b) throw new Error("렌더된 콘텐츠를 찾을 수 없습니다");
          return new Blob([b.text], { type: "text/plain" });
        }),
      });
      await navigator.clipboard.write([item]);
      flash("copied");
    } catch (err) {
      console.error("[copy] 서식 복사 실패", err);
      flash("failed");
    }
  }

  async function handleMarkdown() {
    if (!markdown) {
      flash("failed");
      return;
    }
    let ok = false;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(markdown);
        ok = true;
      } catch (err) {
        console.warn("[copy] writeText 실패, 폴백 시도", err);
      }
    }
    if (!ok) ok = legacyCopy(markdown);
    flash(ok ? "copied" : "failed");
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="복사"
          disabled={status === "working"}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-60"
        >
          {status === "working" ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              복사 중
            </>
          ) : status === "copied" ? (
            <>
              <Check className="w-3.5 h-3.5" />
              복사됨
            </>
          ) : status === "failed" ? (
            <>
              <X className="w-3.5 h-3.5" />
              실패
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              복사
              <ChevronDown className="w-3 h-3 opacity-60" />
            </>
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="bottom"
          align="end"
          sideOffset={4}
          className="z-50 bg-card border border-border rounded-md py-1 min-w-52"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DropdownMenu.Item
            onSelect={handleRich}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-muted cursor-pointer outline-none"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span className="flex-1">서식 그대로 복사</span>
            <span className="text-[10px] text-muted-foreground">Docs용</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={handleMarkdown}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-muted cursor-pointer outline-none"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="flex-1">마크다운으로 복사</span>
            <span className="text-[10px] text-muted-foreground">raw</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

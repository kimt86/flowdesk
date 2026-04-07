"use client";

import { useState, useEffect, useRef } from "react";
import { useDebounce } from "@/lib/hooks/use-debounce";

interface Props {
  content: string;
  relPath: string;
}

export function EditorPreview({ content, relPath }: Props) {
  const debouncedContent = useDebounce(content, 400);
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    fetch("/api/docs/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: debouncedContent, relPath }),
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.html === "string") setHtml(data.html);
      })
      .catch((err) => {
        if (err.name !== "AbortError") console.error("[EditorPreview]", err);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [debouncedContent, relPath]);

  return (
    <div className="relative flex-1 overflow-y-auto border border-border rounded-b-lg md:rounded-none md:border-l-0 md:rounded-br-lg bg-background">
      {loading && (
        <div className="absolute top-2 right-3 text-[10px] text-muted-foreground animate-pulse select-none">
          렌더링 중…
        </div>
      )}
      <div
        className="prose p-4"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

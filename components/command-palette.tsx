"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui";

/*
 * CommandPalette — ⌘K / Ctrl+K
 * 네비게이션 전용 경량 버전. 한지/먹 문법.
 */
type PaletteItem = {
  href: string;
  label: string;
  short: string;
};

const items: PaletteItem[] = [
  { href: "/",               label: "작업 현황",   short: "현황" },
  { href: "/today",          label: "오늘 할 일",  short: "오늘" },
  { href: "/todos",          label: "모든 할 일",  short: "할 일" },
  { href: "/archive",        label: "보관함",      short: "보관" },
  { href: "/projects",       label: "프로젝트",    short: "project" },
  { href: "/work",           label: "작업",        short: "work" },
  { href: "/ideas",          label: "아이디어",    short: "idea" },
  { href: "/meetings",       label: "회의록",      short: "meeting" },
  { href: "/presentations",  label: "발표자료",    short: "present" },
  { href: "/docs",           label: "문서",        short: "docs" },
  { href: "/weekly",         label: "주간 보고서", short: "weekly" },
  { href: "/design",         label: "디자인 시스템", short: "design" },
];

function matches(item: PaletteItem, q: string): boolean {
  const needle = q.toLowerCase();
  return (
    item.label.toLowerCase().includes(needle) ||
    item.short.toLowerCase().includes(needle) ||
    item.href.toLowerCase().includes(needle)
  );
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ⌘K / Ctrl+K 글로벌 단축키
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 열릴 때 초기화 + 포커스
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return items;
    return items.filter((i) => matches(i, q));
  }, [query]);

  // 필터 변경 시 activeIndex 재조정
  useEffect(() => {
    if (activeIndex >= filtered.length) setActiveIndex(0);
  }, [filtered.length, activeIndex]);

  // active item 스크롤 동기
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector<HTMLElement>(
      `[data-palette-index="${activeIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function go(item: PaletteItem) {
    router.push(item.href);
    setOpen(false);
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) =>
        filtered.length === 0 ? 0 : Math.min(i + 1, filtered.length - 1),
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[activeIndex];
      if (item) go(item);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-foreground/30 backdrop-blur-[2px] z-50 animate-in fade-in duration-micro" />
        <Dialog.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed top-[18vh] left-1/2 -translate-x-1/2 w-[min(600px,calc(100vw-32px))] max-h-[64vh] bg-surface border border-border-strong rounded-sm z-50 flex flex-col overflow-hidden shadow-[0_8px_24px_rgba(20,18,16,0.10)]"
        >
          <Dialog.Title className="sr-only">커맨드 팔레트</Dialog.Title>
          <Dialog.Description className="sr-only">
            이동할 페이지를 검색하세요
          </Dialog.Description>

          {/* Search row */}
          <div className="flex items-center gap-sm px-md h-12 border-b border-border">
            <Search
              className="w-4 h-4 text-muted-foreground shrink-0"
              strokeWidth={1.5}
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="이동할 페이지를 검색…"
              className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
              aria-label="명령어 입력"
              autoComplete="off"
              spellCheck={false}
            />
            <span className="mono-meta shrink-0">⌘K</span>
          </div>

          {/* Results */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto py-1"
            role="listbox"
          >
            {filtered.length === 0 ? (
              <div className="px-md py-lg mono-meta !normal-case !tracking-snug text-center text-muted-foreground">
                일치하는 항목이 없습니다
              </div>
            ) : (
              filtered.map((item, i) => {
                const isActive = i === activeIndex;
                return (
                  <button
                    key={item.href}
                    type="button"
                    data-palette-index={i}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => go(item)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={cn(
                      "relative w-full flex items-center gap-md text-left px-md py-2.5 transition-colors duration-short ease-out-flow",
                      isActive
                        ? "bg-surface-2 text-foreground"
                        : "text-ink-soft hover:bg-surface-2/60",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-0 top-0 bottom-0 w-[2px]",
                        isActive ? "bg-accent" : "bg-transparent",
                      )}
                      aria-hidden
                    />
                    <span className="flex-1 text-sm">{item.label}</span>
                    <span className="mono-meta !normal-case !tracking-snug shrink-0">
                      {item.href}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer with key hints */}
          <div className="border-t border-border px-md h-10 flex items-center gap-md mono-meta !normal-case !tracking-snug">
            <span className="inline-flex items-center gap-1.5">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              <span>이동</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Kbd>⏎</Kbd>
              <span>선택</span>
            </span>
            <span className="inline-flex items-center gap-1.5 ml-auto">
              <Kbd>Esc</Kbd>
              <span>닫기</span>
            </span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

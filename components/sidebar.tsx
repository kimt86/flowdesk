"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tooltip from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  LayoutDashboard,
  CheckSquare,
  CalendarCheck,
  FileText,
  CalendarRange,
  Calendar,
  Presentation,
  Lightbulb,
  FolderKanban,
  Briefcase,
  Archive,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

const navItems = [
  { href: "/",               label: "작업 현황",   short: "현황",   icon: LayoutDashboard },
  { href: "/today",          label: "오늘 할 일",  short: "오늘",   icon: CalendarCheck   },
  { href: "/todos",          label: "모든 할 일",  short: "할 일",   icon: CheckSquare     },
  { href: "/archive",        label: "보관함",      short: "보관",   icon: Archive         },
  { href: "/projects",       label: "프로젝트",    short: "PJT",    icon: FolderKanban    },
  { href: "/work",           label: "작업",        short: "작업",   icon: Briefcase       },
  { href: "/ideas",          label: "아이디어",    short: "IDEA",   icon: Lightbulb       },
  { href: "/meetings",       label: "회의록",      short: "회의",   icon: Calendar        },
  { href: "/presentations",  label: "발표자료",    short: "발표",   icon: Presentation    },
  { href: "/docs",           label: "문서",        short: "문서",   icon: FileText        },
  { href: "/weekly",         label: "주간 보고서", short: "주간",   icon: CalendarRange   },
];

const STORAGE_KEY = "flowdesk-sidebar-collapsed";

function NavLinks({
  collapsed,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 py-sm">
      <ul className="flex flex-col">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          const link = (
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "relative flex items-center h-9 text-sm transition-colors duration-short ease-out-flow rounded-none",
                collapsed ? "justify-center px-2" : "gap-2.5 pl-4 pr-3",
                isActive
                  ? "text-foreground font-medium bg-surface-2"
                  : "text-ink-soft hover:text-foreground hover:bg-surface-2/60",
              )}
            >
              {/* 단청 레드 좌측 보더 — 활성 상태 표식 */}
              <span
                className={cn(
                  "absolute left-0 top-0 bottom-0 w-[2px] transition-colors duration-short",
                  isActive ? "bg-accent" : "bg-transparent",
                )}
                aria-hidden
              />
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
                strokeWidth={1.5}
              />
              {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <li key={item.href}>
                <Tooltip.Root delayDuration={0}>
                  <Tooltip.Trigger asChild>{link}</Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      side="right"
                      sideOffset={6}
                      className="border border-border-strong bg-foreground text-background font-mono text-2xs uppercase tracking-meta px-2 py-1 z-50"
                    >
                      {item.label}
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </li>
            );
          }

          return <li key={item.href}>{link}</li>;
        })}
      </ul>
    </nav>
  );
}

function Brand({ collapsed }: { collapsed?: boolean }) {
  if (collapsed) {
    return <span className="seal" aria-label="FlowDesk" />;
  }
  return (
    <div className="flex items-center gap-2">
      <span className="seal" aria-hidden />
      <span className="font-display text-md tracking-tight text-foreground">
        FlowDesk
      </span>
    </div>
  );
}

function Footer({ collapsed }: { collapsed?: boolean }) {
  if (collapsed) {
    return (
      <div className="border-t border-border py-md flex justify-center">
        <span
          className="w-1.5 h-1.5 rounded-full bg-success"
          aria-label="연동됨"
        />
      </div>
    );
  }
  return (
    <div className="border-t border-border px-md py-sm space-y-sm">
      <div className="flex items-center justify-between">
        <span className="mono-meta">CLT · master</span>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-success" aria-hidden />
          <span className="mono-meta !normal-case !tracking-snug">연동됨</span>
        </div>
      </div>
      <ThemeToggle className="w-full justify-center" />
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  };

  return (
    <Tooltip.Provider>
      {/* 모바일 헤더 바 */}
      <header className="md:hidden flex items-center justify-between px-md h-14 border-b border-border bg-background sticky top-0 z-30 shrink-0">
        <Brand />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="p-2 text-ink-soft hover:bg-surface-2 transition-colors duration-short ease-out-flow"
          aria-label="메뉴 열기"
        >
          <Menu className="w-5 h-5" strokeWidth={1.5} />
        </button>
      </header>

      {/* 모바일 드로어 */}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-foreground/40 z-40 md:hidden" />
          <Dialog.Content
            className="fixed left-0 top-0 bottom-0 w-64 bg-surface border-r border-border z-50 flex flex-col md:hidden"
            aria-describedby={undefined}
          >
            <Dialog.Title className="sr-only">네비게이션 메뉴</Dialog.Title>
            <div className="flex items-center justify-between px-md h-14 border-b border-border">
              <Brand />
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="p-2 text-ink-soft hover:bg-surface-2 transition-colors duration-short ease-out-flow"
                  aria-label="메뉴 닫기"
                >
                  <X className="w-5 h-5" strokeWidth={1.5} />
                </button>
              </Dialog.Close>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
            <Footer />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* 데스크탑 사이드바 */}
      <aside
        className={cn(
          "hidden md:flex sticky top-0 h-screen overflow-y-auto bg-surface border-r border-border flex-col shrink-0 transition-[width] duration-medium ease-in-out-flow",
          collapsed ? "w-14" : "w-56",
        )}
      >
        <div
          className={cn(
            "h-14 flex items-center border-b border-border",
            collapsed ? "justify-center px-2" : "justify-between px-md",
          )}
        >
          <Brand collapsed={collapsed} />
          {!collapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              className="p-1.5 text-ink-soft hover:bg-surface-2 transition-colors duration-short ease-out-flow"
              aria-label="사이드바 접기"
            >
              <PanelLeftClose className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}
        </div>
        {collapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="h-9 flex items-center justify-center text-ink-soft hover:bg-surface-2 transition-colors duration-short ease-out-flow border-b border-border"
            aria-label="사이드바 펼치기"
          >
            <PanelLeftOpen className="w-4 h-4" strokeWidth={1.5} />
          </button>
        )}
        <NavLinks collapsed={collapsed} />
        <Footer collapsed={collapsed} />
      </aside>
    </Tooltip.Provider>
  );
}

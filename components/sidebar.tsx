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
  { href: "/",               label: "작업 현황",   icon: LayoutDashboard },
  { href: "/today",          label: "오늘 할 일",  icon: CalendarCheck   },
  { href: "/todos",          label: "모든 할 일",  icon: CheckSquare     },
  { href: "/archive",        label: "보관함",      icon: Archive         },
  { href: "/projects",       label: "프로젝트",    icon: FolderKanban    },
  { href: "/work",           label: "작업",   icon: Briefcase       },
  { href: "/ideas",          label: "아이디어",    icon: Lightbulb       },
  { href: "/meetings",       label: "회의록",      icon: Calendar        },
  { href: "/presentations",  label: "발표자료",    icon: Presentation    },
  { href: "/docs",           label: "문서",        icon: FileText        },
  { href: "/weekly",         label: "주간 보고서", icon: CalendarRange   },
];

const STORAGE_KEY = "flowdesk-sidebar-collapsed";

function NavLinks({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 px-2 py-3 space-y-0.5">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        const link = (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center rounded-lg text-sm transition-colors relative",
              collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2.5",
              isActive
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && item.label}
          </Link>
        );

        if (collapsed) {
          return (
            <Tooltip.Root key={item.href} delayDuration={0}>
              <Tooltip.Trigger asChild>{link}</Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  side="right"
                  sideOffset={8}
                  className="bg-foreground text-background text-xs px-2 py-1 rounded shadow-md z-50"
                >
                  {item.label}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          );
        }

        return link;
      })}
    </nav>
  );
}

function Logo({ collapsed }: { collapsed?: boolean }) {
  if (collapsed) return null;
  return (
    <div className="flex items-center">
      <span className="text-sm font-bold text-foreground tracking-tight">FlowDesk</span>
    </div>
  );
}

function StatusDot({ collapsed }: { collapsed?: boolean }) {
  if (collapsed) return null;
  return (
    <div className="px-4 py-3 border-t border-border space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-success" />
        <p className="text-xs text-muted-foreground">연동됨</p>
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
      {/* 모바일 헤더 바 (md 미만에서만 표시) */}
      <header className="md:hidden flex items-center justify-between px-4 h-14 border-b border-border bg-background sticky top-0 z-30 shrink-0">
        <Logo />
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="메뉴 열기"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* 모바일 드로어 */}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40 md:hidden" />
          <Dialog.Content
            className="fixed left-0 top-0 bottom-0 w-64 bg-background z-50 flex flex-col shadow-xl md:hidden"
            aria-describedby={undefined}
          >
            <Dialog.Title className="sr-only">네비게이션 메뉴</Dialog.Title>
            <div className="flex items-center justify-between px-4 h-14 border-b border-border">
              <Logo />
              <Dialog.Close asChild>
                <button
                  className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label="메뉴 닫기"
                >
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
            <StatusDot />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* 데스크탑 사이드바 (md 이상에서만 표시) */}
      <aside
        className={cn(
          "hidden md:flex sticky top-0 h-screen overflow-y-auto bg-background border-r border-border flex-col shrink-0 transition-all duration-200",
          collapsed ? "w-14" : "w-52"
        )}
      >
        <div className={cn(
          "h-14 flex items-center border-b border-border",
          collapsed ? "justify-center px-2" : "justify-between px-4"
        )}>
          <Logo collapsed={collapsed} />
          <button
            onClick={toggleCollapsed}
            className={cn(
              "p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
              collapsed && "mt-0"
            )}
            aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
          >
            {collapsed
              ? <PanelLeftOpen className="w-4 h-4" />
              : <PanelLeftClose className="w-4 h-4" />
            }
          </button>
        </div>
        <NavLinks collapsed={collapsed} />
        <StatusDot collapsed={collapsed} />
      </aside>
    </Tooltip.Provider>
  );
}

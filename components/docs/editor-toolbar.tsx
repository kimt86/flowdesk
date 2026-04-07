"use client";

import {
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, Heading4,
  List, ListOrdered, ListChecks, Quote, Code, Code2, Link, Minus,
  Table, Eye, EyeOff, Columns2, ChevronDown,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as Separator from "@radix-ui/react-separator";
import { cn } from "@/lib/utils";

export type ViewMode = "edit" | "split" | "preview";

interface ToolbarActions {
  bold: () => void;
  italic: () => void;
  strikethrough: () => void;
  inlineCode: () => void;
  heading: (level: 1 | 2 | 3 | 4) => void;
  bulletList: () => void;
  orderedList: () => void;
  checklist: () => void;
  blockquote: () => void;
  insertCodeBlock: () => void;
  insertLink: () => void;
  insertTable: () => void;
  insertHorizontalRule: () => void;
}

interface Props {
  actions: ToolbarActions;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

function ToolbarButton({
  label,
  shortcut,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip.Provider delayDuration={400}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault(); // keep textarea focus
              onClick();
            }}
            className="flex items-center justify-center w-8 h-8 md:w-7 md:h-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {children}
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="bottom"
            className="z-50 px-2 py-1 text-xs bg-foreground text-background rounded shadow"
          >
            {label}{shortcut && <span className="ml-1 opacity-60">{shortcut}</span>}
            <Tooltip.Arrow className="fill-foreground" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

function TSep() {
  return (
    <Separator.Root
      orientation="vertical"
      className="w-px h-5 bg-border mx-0.5 self-center shrink-0"
    />
  );
}

export function EditorToolbar({ actions, viewMode, onViewModeChange }: Props) {
  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border border-border rounded-t-lg bg-muted/30 flex-wrap">
      {/* 텍스트 포맷 */}
      <ToolbarButton label="굵게" shortcut="Ctrl+B" onClick={actions.bold}>
        <Bold className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton label="기울임" shortcut="Ctrl+I" onClick={actions.italic}>
        <Italic className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton label="취소선" onClick={actions.strikethrough}>
        <Strikethrough className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton label="인라인 코드" onClick={actions.inlineCode}>
        <Code className="w-3.5 h-3.5" />
      </ToolbarButton>

      <TSep />

      {/* 헤딩 드롭다운 */}
      <DropdownMenu.Root>
        <Tooltip.Provider delayDuration={400}>
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-0.5 h-7 px-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-xs font-semibold"
                >
                  H
                  <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenu.Trigger>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content side="bottom" className="z-50 px-2 py-1 text-xs bg-foreground text-background rounded shadow">
                헤딩
                <Tooltip.Arrow className="fill-foreground" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </Tooltip.Provider>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            side="bottom"
            align="start"
            className="z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-28"
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            {([1, 2, 3, 4] as const).map((level) => {
              const icons = { 1: Heading1, 2: Heading2, 3: Heading3, 4: Heading4 };
              const Icon = icons[level];
              return (
                <DropdownMenu.Item
                  key={level}
                  onSelect={() => actions.heading(level)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted cursor-pointer outline-none"
                >
                  <Icon className="w-4 h-4" />
                  제목 {level}
                </DropdownMenu.Item>
              );
            })}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <TSep />

      {/* 리스트 */}
      <ToolbarButton label="글머리 기호" onClick={actions.bulletList}>
        <List className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton label="번호 목록" onClick={actions.orderedList}>
        <ListOrdered className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton label="체크리스트" onClick={actions.checklist}>
        <ListChecks className="w-3.5 h-3.5" />
      </ToolbarButton>

      <TSep />

      {/* 블록 */}
      <ToolbarButton label="인용" onClick={actions.blockquote}>
        <Quote className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton label="코드 블록" onClick={actions.insertCodeBlock}>
        <Code2 className="w-3.5 h-3.5" />
      </ToolbarButton>

      <TSep />

      {/* 삽입 */}
      <ToolbarButton label="링크" shortcut="Ctrl+K" onClick={actions.insertLink}>
        <Link className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton label="구분선" onClick={actions.insertHorizontalRule}>
        <Minus className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton label="표" onClick={actions.insertTable}>
        <Table className="w-3.5 h-3.5" />
      </ToolbarButton>

      {/* 뷰 모드 토글 (오른쪽 끝) */}
      <div className="ml-auto flex items-center gap-0.5 border border-border rounded-md overflow-hidden">
        {(
          [
            { mode: "edit" as const, icon: EyeOff, label: "편집만" },
            { mode: "split" as const, icon: Columns2, label: "분할" },
            { mode: "preview" as const, icon: Eye, label: "미리보기만" },
          ] as const
        ).map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onViewModeChange(mode);
            }}
            className={cn(
              "flex items-center justify-center w-8 h-8 md:w-7 md:h-7 text-xs transition-colors",
              viewMode === mode
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            title={label}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
      </div>
    </div>
  );
}

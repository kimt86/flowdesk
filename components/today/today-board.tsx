"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { TodayFile, TodayTask } from "@/lib/types";
import {
  RefreshCw,
  CalendarClock,
  FileText,
  Pencil,
  Trash2,
  CalendarMinus,
  Check,
} from "lucide-react";
import {
  Button,
  Card,
  Input,
  InputGroup,
  InputLabel,
  Tag,
  Textarea,
} from "@/components/ui";

const PRIORITY_TAG_TONE: Record<
  TodayTask["priority"],
  "danger" | "warn" | "default"
> = {
  high: "danger",
  medium: "warn",
  low: "default",
};

const PRIORITY_LABEL: Record<TodayTask["priority"], string> = {
  high: "긴급",
  medium: "보통",
  low: "낮음",
};

const CATEGORY_OPTIONS = [
  "@개발",
  "@회의",
  "@문서",
  "@보고",
  "@팀운영",
  "@기타",
];

type EditFields = {
  content: string;
  priority: TodayTask["priority"];
  category: string;
  dueDate: string;
  tags: string;
  memo: string;
};

function toEditFields(task: TodayTask): EditFields {
  return {
    content: task.content,
    priority: task.priority,
    category: task.category,
    dueDate: task.dueDate ?? "",
    tags: task.tags.join(" "),
    memo: task.memo ?? "",
  };
}

export function TodayBoard({
  initialToday,
}: {
  initialToday: TodayFile | null;
}) {
  const router = useRouter();
  const [todayData, setTodayData] = useState<TodayFile | null>(initialToday);
  const [refreshing, setRefreshing] = useState(false);
  const [editingLine, setEditingLine] = useState<number | null>(null);
  const [confirmDeleteLine, setConfirmDeleteLine] = useState<number | null>(
    null,
  );
  const [confirmExcludeLine, setConfirmExcludeLine] = useState<number | null>(
    null,
  );

  useEffect(() => {
    fetch("/api/today")
      .then((res) => res.json())
      .then((data) => setTodayData(data.today ?? null))
      .catch(() => {});
  }, []);

  const now = new Date();
  const todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const isToday = todayData?.date === todayDate;

  async function handleToggle(task: TodayTask) {
    if (!todayData) return;

    setTodayData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.lineIndex === task.lineIndex ? { ...t, done: !t.done } : t,
        ),
      };
    });

    try {
      const res = await fetch("/api/today", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineIndex: task.lineIndex }),
      });
      if (res.ok) {
        const data = await res.json();
        setTodayData(data.today);
        router.refresh();
      } else {
        setTodayData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            tasks: prev.tasks.map((t) =>
              t.lineIndex === task.lineIndex ? { ...t, done: !t.done } : t,
            ),
          };
        });
      }
    } catch {
      setTodayData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tasks: prev.tasks.map((t) =>
            t.lineIndex === task.lineIndex ? { ...t, done: !t.done } : t,
          ),
        };
      });
    }
  }

  async function handleEditSave(task: TodayTask, fields: EditFields) {
    const res = await fetch("/api/today", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lineIndex: task.lineIndex,
        content: fields.content,
        priority: fields.priority,
        category: fields.category,
        dueDate: fields.dueDate ? fields.dueDate : null,
        tags: fields.tags ? fields.tags.split(/\s+/).filter(Boolean) : [],
        memo: fields.memo || null,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setTodayData(data.today);
      setEditingLine(null);
      router.refresh();
    }
  }

  async function handleDelete(task: TodayTask) {
    setConfirmDeleteLine(null);
    setTodayData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: prev.tasks.filter((t) => t.lineIndex !== task.lineIndex),
      };
    });
    const res = await fetch(`/api/today?lineIndex=${task.lineIndex}`, {
      method: "DELETE",
    });
    if (res.ok) {
      const data = await res.json();
      setTodayData(data.today);
      router.refresh();
    }
  }

  async function handleExclude(task: TodayTask) {
    setConfirmExcludeLine(null);
    setTodayData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: prev.tasks.filter((t) => t.lineIndex !== task.lineIndex),
      };
    });
    const newTags = task.tags.filter((t) => t !== "today");
    const res = await fetch(`/api/todos/todo-${task.lineIndex}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: newTags }),
    });
    if (res.ok) {
      const todayRes = await fetch("/api/today");
      if (todayRes.ok) {
        const data = await todayRes.json();
        setTodayData(data.today);
      }
      router.refresh();
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/today");
      if (res.ok) {
        const data = await res.json();
        setTodayData(data.today);
      }
    } finally {
      setRefreshing(false);
    }
  }

  // ============================================================
  // Empty state — masthead 있는 상태로 빈 페이지 표시
  // ============================================================
  if (!todayData || !isToday || todayData.tasks.length === 0) {
    return (
      <div className="h-full flex flex-col p-lg md:p-2xl">
        <UtilityBar onRefresh={handleRefresh} refreshing={refreshing} />
        <Masthead
          dateLabel={todayData?.date ?? todayDate}
          dayLabel={todayData?.dayLabel}
          weekInfo={todayData?.weekInfo}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-[460px] text-center border border-border bg-surface p-xl rounded-sm">
            <p className="font-display text-lg mb-xs">오늘 할 일이 없습니다</p>
            <p className="text-sm text-ink-soft leading-relaxed">
              "모든 할 일" 페이지에서{" "}
              <span className="mono-meta !normal-case !tracking-snug">
                오늘 할 일로 보내기
              </span>{" "}
              버튼을 눌러 추가하세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalTasks = todayData.tasks.length;
  const doneTasks = todayData.tasks.filter((t) => t.done).length;
  const remainingTasks = totalTasks - doneTasks;
  const progressPercent =
    totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="h-full flex flex-col p-lg md:p-2xl">
      <UtilityBar onRefresh={handleRefresh} refreshing={refreshing} />
      {/* Masthead */}
      <Masthead
        dateLabel={todayData.date}
        dayLabel={todayData.dayLabel}
        weekInfo={todayData.weekInfo}
        rightSlot={
          <div className="text-right">
            <div className="font-display text-2xl leading-none tabular-nums">
              {progressPercent}%
            </div>
            <div className="mono-meta mt-1">
              {doneTasks} / {totalTasks} done
            </div>
          </div>
        }
      />
      {/* Progress + counts */}
      <div className="mt-md mb-lg">
        <div className="flex items-center gap-lg text-sm mb-xs">
          <CountPair label="전체" value={totalTasks} />
          <CountPair label="완료" value={doneTasks} tone="success" />
          <CountPair label="남음" value={remainingTasks} tone="accent" />
        </div>
        <div className="h-[3px] bg-border-strong/40 w-full">
          <div
            className="h-[3px] bg-accent transition-all duration-long ease-in-out-flow"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto space-y-xs pb-md">
        {todayData.tasks.map((task) => (
          <TodayCard
            key={task.lineIndex}
            task={task}
            isEditing={editingLine === task.lineIndex}
            isConfirmingDelete={confirmDeleteLine === task.lineIndex}
            isConfirmingExclude={confirmExcludeLine === task.lineIndex}
            onToggle={() => handleToggle(task)}
            onEditStart={() => setEditingLine(task.lineIndex)}
            onEditCancel={() => setEditingLine(null)}
            onEditSave={(fields) => handleEditSave(task, fields)}
            onDeleteStart={() => setConfirmDeleteLine(task.lineIndex)}
            onDeleteCancel={() => setConfirmDeleteLine(null)}
            onDeleteConfirm={() => handleDelete(task)}
            onExcludeStart={() => setConfirmExcludeLine(task.lineIndex)}
            onExcludeCancel={() => setConfirmExcludeLine(null)}
            onExcludeConfirm={() => handleExclude(task)}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// UtilityBar — masthead 위 얇은 유틸리티 라인 (새로고침 등)
// ============================================================
function UtilityBar({
  onRefresh,
  refreshing,
}: {
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div className="flex justify-end mb-xs">
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        aria-label="새로고침"
        title="새로고침"
        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors duration-short ease-out-flow rounded-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <RefreshCw
          className={cn("w-3.5 h-3.5", refreshing && "animate-spin")}
          strokeWidth={1.5}
        />
      </button>
    </div>
  );
}

// ============================================================
// Masthead — broadsheet 스타일 페이지 헤더
// ============================================================
function Masthead({
  dateLabel,
  dayLabel,
  weekInfo,
  rightSlot,
}: {
  dateLabel: string;
  dayLabel?: string;
  weekInfo?: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-md flex-wrap border-b-[3px] border-foreground pb-sm">
      <div>
        <h1 className="font-display text-display-sm md:text-3xl leading-none tracking-display">
          {dateLabel}
          {dayLabel && (
            <span className="text-muted-foreground font-normal ml-3 text-2xl md:text-xl tracking-tight">
              {dayLabel}
            </span>
          )}
        </h1>
        {weekInfo && <p className="mono-meta mt-2">{weekInfo}</p>}
      </div>
      {rightSlot}
    </header>
  );
}

function CountPair({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "accent";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "accent"
        ? "text-accent"
        : "text-foreground";
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="mono-meta">{label}</span>
      <span className={cn("font-semibold tabular-nums", toneClass)}>
        {value}
      </span>
      <span className="text-muted-foreground text-xs">개</span>
    </span>
  );
}

// ============================================================
// TodayCard — single task row
// ============================================================
function TodayCard({
  task,
  isEditing,
  isConfirmingDelete,
  isConfirmingExclude,
  onToggle,
  onEditStart,
  onEditCancel,
  onEditSave,
  onDeleteStart,
  onDeleteCancel,
  onDeleteConfirm,
  onExcludeStart,
  onExcludeCancel,
  onExcludeConfirm,
}: {
  task: TodayTask;
  isEditing: boolean;
  isConfirmingDelete: boolean;
  isConfirmingExclude: boolean;
  onToggle: () => void;
  onEditStart: () => void;
  onEditCancel: () => void;
  onEditSave: (fields: EditFields) => void;
  onDeleteStart: () => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
  onExcludeStart: () => void;
  onExcludeCancel: () => void;
  onExcludeConfirm: () => void;
}) {
  const [editForm, setEditForm] = useState<EditFields>(toEditFields(task));

  useEffect(() => {
    setEditForm(toEditFields(task));
  }, [
    task.lineIndex,
    task.content,
    task.priority,
    task.category,
    task.dueDate,
    task.tags,
    task.memo,
  ]);

  const urgent = task.priority === "high";

  // ==================== Edit mode ====================
  if (isEditing) {
    return (
      <Card urgent={urgent} className="space-y-md">
        <InputGroup>
          <InputLabel>할 일</InputLabel>
          <Input
            value={editForm.content}
            onChange={(e) =>
              setEditForm({ ...editForm, content: e.target.value })
            }
            autoFocus
          />
        </InputGroup>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          <InputGroup>
            <InputLabel>우선순위</InputLabel>
            <NativeSelect
              value={editForm.priority}
              onChange={(v) =>
                setEditForm({
                  ...editForm,
                  priority: v as TodayTask["priority"],
                })
              }
              options={[
                { value: "high", label: "긴급" },
                { value: "medium", label: "보통" },
                { value: "low", label: "낮음" },
              ]}
            />
          </InputGroup>

          <InputGroup>
            <InputLabel>카테고리</InputLabel>
            <NativeSelect
              value={editForm.category}
              onChange={(v) => setEditForm({ ...editForm, category: v })}
              options={(CATEGORY_OPTIONS.includes(editForm.category)
                ? CATEGORY_OPTIONS
                : [editForm.category, ...CATEGORY_OPTIONS]
              ).map((c) => ({ value: c, label: c }))}
            />
          </InputGroup>

          <InputGroup>
            <InputLabel>마감</InputLabel>
            <Input
              placeholder="예: 2026-04-15"
              value={editForm.dueDate}
              onChange={(e) =>
                setEditForm({ ...editForm, dueDate: e.target.value })
              }
            />
          </InputGroup>

          <InputGroup>
            <InputLabel>태그</InputLabel>
            <Input
              placeholder="공백으로 구분"
              value={editForm.tags}
              onChange={(e) =>
                setEditForm({ ...editForm, tags: e.target.value })
              }
            />
          </InputGroup>

          <InputGroup className="md:col-span-2">
            <InputLabel>메모</InputLabel>
            <Textarea
              placeholder="선택사항"
              rows={2}
              value={editForm.memo}
              onChange={(e) =>
                setEditForm({ ...editForm, memo: e.target.value })
              }
            />
          </InputGroup>
        </div>

        <div className="flex gap-xs justify-end pt-xs">
          <Button size="sm" variant="secondary" onClick={onEditCancel}>
            취소
          </Button>
          <Button size="sm" onClick={() => onEditSave(editForm)}>
            저장
          </Button>
        </div>
      </Card>
    );
  }

  // ==================== Confirm delete ====================
  if (isConfirmingDelete) {
    return (
      <Card
        urgent={urgent}
        className="border-danger"
      >
        <p className="text-sm font-medium leading-snug truncate mb-1">
          {task.content}
        </p>
        <p className="text-xs text-muted-foreground mb-sm">
          이 항목을 삭제할까요?
        </p>
        <div className="flex gap-xs justify-end">
          <Button size="sm" variant="secondary" onClick={onDeleteCancel}>
            취소
          </Button>
          <Button size="sm" variant="danger" onClick={onDeleteConfirm}>
            삭제
          </Button>
        </div>
      </Card>
    );
  }

  // ==================== Confirm exclude ====================
  if (isConfirmingExclude) {
    return (
      <Card urgent={urgent} className="border-warn">
        <p className="text-sm font-medium leading-snug truncate mb-1">
          {task.content}
        </p>
        <p className="text-xs text-muted-foreground mb-sm">
          오늘 할 일 섹션에서 제외할까요?
        </p>
        <div className="flex gap-xs justify-end">
          <Button size="sm" variant="secondary" onClick={onExcludeCancel}>
            취소
          </Button>
          <Button size="sm" variant="secondary" onClick={onExcludeConfirm}>
            제외
          </Button>
        </div>
      </Card>
    );
  }

  // ==================== Default view ====================
  return (
    <Card urgent={urgent} className="group">
      <div className="flex items-start gap-sm">
        {/* 체크박스 — 2px square, 완료 시 ink */}
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "mt-0.5 w-[18px] h-[18px] border-[1.5px] flex items-center justify-center shrink-0 transition-colors duration-short ease-out-flow rounded-none",
            task.done
              ? "bg-foreground border-foreground text-background"
              : "border-border-strong hover:border-foreground",
          )}
          aria-label={task.done ? "완료 해제" : "완료 처리"}
        >
          {task.done && <Check className="w-3 h-3" strokeWidth={2.5} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-sm">
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              <Tag tone={PRIORITY_TAG_TONE[task.priority]}>
                {PRIORITY_LABEL[task.priority]}
              </Tag>
              <span
                className={cn(
                  "text-sm font-medium leading-snug ink-bleed",
                  task.done && "text-muted-foreground",
                )}
                data-done={task.done}
              >
                {task.content}
              </span>
            </div>
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-short ease-out-flow shrink-0">
              <IconButton
                label="오늘에서 제외"
                onClick={onExcludeStart}
                hoverTone="warn"
              >
                <CalendarMinus className="w-3.5 h-3.5" strokeWidth={1.5} />
              </IconButton>
              <IconButton label="편집" onClick={onEditStart}>
                <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
              </IconButton>
              <IconButton
                label="삭제"
                onClick={onDeleteStart}
                hoverTone="danger"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
              </IconButton>
            </div>
          </div>

          {/* meta row */}
          <div className="mono-meta flex items-center gap-lg gap-y-1 flex-wrap mt-2">
            <span className="!normal-case !tracking-snug text-xs text-ink-soft">
              {task.category}
            </span>
            {task.dueDate && (
              <span className="inline-flex items-center gap-1 !normal-case !tracking-snug text-xs">
                <CalendarClock className="w-3 h-3" strokeWidth={1.5} />
                마감 {task.dueDate}
              </span>
            )}
            {task.tags.map((tag) => (
              <span key={tag} className="text-accent !normal-case !tracking-snug text-xs">
                #{tag}
              </span>
            ))}
          </div>

          {task.memo && (
            <div className="text-sm text-ink-soft bg-surface-2 border-l-2 border-border-strong px-sm py-2 mt-sm whitespace-pre-wrap leading-relaxed">
              {task.memo}
            </div>
          )}

          {task.docRefs.length > 0 && (
            <div className="flex flex-col gap-1 mt-sm">
              {task.docRefs.map((ref, i) => (
                <Link
                  key={i}
                  href={`/docs/view?path=${encodeURIComponent(ref.path)}`}
                  className="inline-flex items-center gap-1.5 text-xs text-foreground hover:text-accent transition-colors duration-short ease-out-flow truncate"
                >
                  <FileText className="w-3 h-3 flex-shrink-0" strokeWidth={1.5} />
                  {ref.issueId && (
                    <span className="font-mono text-accent">{ref.issueId}</span>
                  )}
                  <span className="truncate text-muted-foreground">
                    {ref.path.split(/[\\/]/).pop()}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function IconButton({
  label,
  onClick,
  children,
  hoverTone,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  hoverTone?: "warn" | "danger";
}) {
  const hoverClass =
    hoverTone === "danger"
      ? "hover:text-danger hover:bg-surface-2"
      : hoverTone === "warn"
        ? "hover:text-warn hover:bg-surface-2"
        : "hover:text-foreground hover:bg-surface-2";
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "p-1.5 text-muted-foreground transition-colors duration-short ease-out-flow rounded-sm",
        hoverClass,
      )}
    >
      {children}
    </button>
  );
}

function NativeSelect<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full bg-transparent border-0 border-b border-border-strong px-0 py-2 text-base text-foreground focus-visible:outline-none focus:border-accent transition-colors duration-short ease-out-flow appearance-none cursor-pointer"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

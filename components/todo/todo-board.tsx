"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Todo, TodoStatus, ArchivedTodo } from "@/lib/types";
import { ArchiveBoard } from "@/components/archive/archive-board";
import {
  Plus,
  RefreshCw,
  ArrowRight,
  ChevronDown,
  FileText,
  Pencil,
  Trash2,
  Search,
  Tag as TagIcon,
  CalendarPlus,
  CalendarMinus,
  Archive,
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

const COLUMNS: { id: TodoStatus; label: string }[] = [
  { id: "todo",        label: "할 일"  },
  { id: "in-progress", label: "진행중" },
  { id: "blocked",     label: "보류"   },
  { id: "done",        label: "완료"   },
];

const PRIORITY_TAG_TONE: Record<
  Todo["priority"],
  "danger" | "warn" | "default"
> = {
  high: "danger",
  medium: "warn",
  low: "default",
};

const PRIORITY_LABEL: Record<Todo["priority"], string> = {
  high: "긴급",
  medium: "보통",
  low: "낮음",
};

const NEXT_STATUS: Record<TodoStatus, TodoStatus | null> = {
  todo: "in-progress",
  "in-progress": "done",
  blocked: "in-progress",
  done: null,
};

const NEXT_STATUS_LABEL: Record<string, string> = {
  "in-progress": "시작",
  done: "완료",
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
  priority: Todo["priority"];
  category: string;
  dueDate: string;
  tags: string;
  memo: string;
};

type TodoView = "active" | "archive";

export function TodoBoard({
  initialTodos,
  initialArchived = [],
}: {
  initialTodos: Todo[];
  initialArchived?: ArchivedTodo[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");
  const [view, setView] = useState<TodoView>(
    viewParam === "archive" ? "archive" : "active",
  );

  useEffect(() => {
    const next: TodoView = viewParam === "archive" ? "archive" : "active";
    setView(next);
  }, [viewParam]);

  function switchView(next: TodoView) {
    if (next === view) return;
    setView(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "archive") params.set("view", "archive");
    else params.delete("view");
    const qs = params.toString();
    router.replace(qs ? `/todos?${qs}` : "/todos", { scroll: false });
  }

  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<EditFields>({
    content: "",
    priority: "medium",
    category: "@개발",
    dueDate: "",
    tags: "",
    memo: "",
  });
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  async function handleStatusChange(todo: Todo, newStatus: TodoStatus) {
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, status: newStatus } : t)),
    );
    const res = await fetch(`/api/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const data = await res.json();
      setTodos(data.todos);
      router.refresh();
    } else {
      setTodos(initialTodos);
    }
  }

  async function handleEdit(todo: Todo, fields: EditFields) {
    const res = await fetch(`/api/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: fields.content,
        priority: fields.priority,
        category: fields.category,
        dueDate: fields.dueDate || null,
        tags: fields.tags ? fields.tags.split(/\s+/).filter(Boolean) : [],
        memo: fields.memo || null,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setTodos(data.todos);
      setEditingId(null);
      router.refresh();
    }
  }

  async function handleSendToToday(todo: Todo) {
    if (todo.tags.includes("today")) return;
    const newTags = [...todo.tags, "today"];
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, tags: newTags } : t)),
    );
    const res = await fetch(`/api/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: newTags }),
    });
    if (res.ok) {
      const data = await res.json();
      setTodos(data.todos);
      router.refresh();
    } else {
      setTodos(initialTodos);
    }
  }

  async function handleRemoveFromToday(todo: Todo) {
    if (!todo.tags.includes("today")) return;
    const newTags = todo.tags.filter((t) => t !== "today");
    setTodos((prev) =>
      prev.map((t) => (t.id === todo.id ? { ...t, tags: newTags } : t)),
    );
    const res = await fetch(`/api/todos/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: newTags }),
    });
    if (res.ok) {
      const data = await res.json();
      setTodos(data.todos);
      router.refresh();
    } else {
      setTodos(initialTodos);
    }
  }

  async function handleArchive(todo: Todo) {
    setConfirmArchiveId(null);
    setTodos((prev) => prev.filter((t) => t.id !== todo.id));
    const res = await fetch("/api/archive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineIndex: todo.lineIndex }),
    });
    if (res.ok) {
      const todosRes = await fetch("/api/todos");
      if (todosRes.ok) {
        const data = await todosRes.json();
        setTodos(data.todos);
      }
      router.refresh();
    }
  }

  async function handleDelete(todo: Todo) {
    setConfirmDeleteId(null);
    setTodos((prev) => prev.filter((t) => t.id !== todo.id));
    const res = await fetch(`/api/todos/${todo.id}`, { method: "DELETE" });
    if (res.ok) {
      const data = await res.json();
      setTodos(data.todos);
      router.refresh();
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    const res = await fetch("/api/todos");
    if (res.ok) {
      const data = await res.json();
      setTodos(data.todos);
    }
    setRefreshing(false);
  }

  async function handleAddTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.content.trim()) return;
    const res = await fetch("/api/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: addForm.content,
        priority: addForm.priority,
        category: addForm.category,
        dueDate: addForm.dueDate || undefined,
        tags: addForm.tags
          ? addForm.tags.split(/\s+/).filter(Boolean)
          : undefined,
        memo: addForm.memo || undefined,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setTodos(data.todos);
      setAddForm({
        content: "",
        priority: "medium",
        category: "@개발",
        dueDate: "",
        tags: "",
        memo: "",
      });
      setShowAddForm(false);
      router.refresh();
    }
  }

  const tagCounts: Record<string, number> = {};
  for (const t of todos) {
    for (const tag of t.tags) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }
  const allTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);

  const filteredTodos = todos.filter((t) => {
    if (
      selectedTags.length > 0 &&
      !t.tags.some((tag) => selectedTags.includes(tag))
    )
      return false;
    if (query) {
      const q = query.toLowerCase();
      if (
        !t.content.toLowerCase().includes(q) &&
        !t.tags.some((tag) => tag.toLowerCase().includes(q)) &&
        !t.category.toLowerCase().includes(q) &&
        !(t.memo ?? "").toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  const activeTodos = filteredTodos.filter((t) => t.status !== "done").length;
  const doneTodos = filteredTodos.filter((t) => t.status === "done").length;

  return (
    <div className="p-lg md:p-2xl h-full flex flex-col">
      {/* Utility line */}
      <div className="flex justify-end mb-xs">
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          aria-label="새로고침"
          title="새로고침"
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors duration-short ease-out-flow rounded-sm disabled:opacity-40"
        >
          <RefreshCw
            className={cn("w-3.5 h-3.5", refreshing && "animate-spin")}
            strokeWidth={1.5}
          />
        </button>
      </div>

      {/* Masthead */}
      <header className="border-b-[3px] border-foreground pb-sm flex items-end justify-between gap-md flex-wrap">
        <div>
          <h1 className="font-display text-3xl leading-none tracking-display">
            할 일
          </h1>
          <p className="mono-meta mt-2">
            진행중 <span className="text-foreground tabular-nums">{activeTodos}</span>
            {"  · "}
            완료 <span className="text-foreground tabular-nums">{doneTodos}</span>
            {"  · "}
            보관 <span className="text-foreground tabular-nums">{initialArchived.length}</span>
          </p>
        </div>
        {view === "active" && (
          <Button
            size="sm"
            onClick={() => setShowAddForm((v) => !v)}
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
            할 일 추가
          </Button>
        )}
      </header>

      {/* 탭 바 */}
      <div className="mt-md flex items-center gap-lg border-b border-border">
        <TabButton
          active={view === "active"}
          onClick={() => switchView("active")}
          label="활성"
          count={todos.length}
        />
        <TabButton
          active={view === "archive"}
          onClick={() => switchView("archive")}
          label="보관함"
          count={initialArchived.length}
        />
      </div>

      {view === "archive" ? (
        <div className="flex-1 min-h-0 mt-md">
          <ArchiveBoard initialItems={initialArchived} embedded />
        </div>
      ) : (
        <>

      {/* 검색 */}
      <div className="relative mt-md">
        <Search
          className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
          strokeWidth={1.5}
        />
        <Input
          type="text"
          placeholder="할 일 검색 (제목, 태그, 메모)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-6"
        />
      </div>

      {/* 태그 필터 */}
      {allTags.length > 0 && (
        <div className="mt-md flex items-start gap-sm">
          <TagIcon
            className="w-3.5 h-3.5 text-muted-foreground mt-1 shrink-0"
            strokeWidth={1.5}
          />
          <div className="flex flex-wrap gap-1.5">
            <FilterChip
              active={selectedTags.length === 0}
              onClick={() => setSelectedTags([])}
              label="전체"
            />
            {allTags.map((tag) => (
              <FilterChip
                key={tag}
                active={selectedTags.includes(tag)}
                onClick={() => toggleTag(tag)}
                label={tag}
                count={tagCounts[tag]}
              />
            ))}
          </div>
        </div>
      )}

      {/* 필터 결과 수 */}
      {(selectedTags.length > 0 || query) && (
        <p className="mono-meta mt-xs">
          <span className="tabular-nums">{filteredTodos.length}</span>{" "}
          개 표시 / 전체 <span className="tabular-nums">{todos.length}</span>
        </p>
      )}

      {/* 추가 폼 */}
      {showAddForm && (
        <Card className="mt-md">
          <form onSubmit={handleAddTodo} className="space-y-md">
            <InputGroup>
              <InputLabel>할 일</InputLabel>
              <Input
                placeholder="할 일 내용을 입력하세요…"
                value={addForm.content}
                onChange={(e) =>
                  setAddForm({ ...addForm, content: e.target.value })
                }
                autoFocus
              />
            </InputGroup>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
              <InputGroup>
                <InputLabel>우선순위</InputLabel>
                <NativeSelect
                  value={addForm.priority}
                  onChange={(v) =>
                    setAddForm({
                      ...addForm,
                      priority: v as Todo["priority"],
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
                  value={addForm.category}
                  onChange={(v) => setAddForm({ ...addForm, category: v })}
                  options={CATEGORY_OPTIONS.map((c) => ({
                    value: c,
                    label: c,
                  }))}
                />
              </InputGroup>
              <InputGroup>
                <InputLabel>마감</InputLabel>
                <Input
                  type="date"
                  value={addForm.dueDate}
                  onChange={(e) =>
                    setAddForm({ ...addForm, dueDate: e.target.value })
                  }
                />
              </InputGroup>
            </div>
            <InputGroup>
              <InputLabel>태그</InputLabel>
              <Input
                placeholder="공백으로 구분"
                value={addForm.tags}
                onChange={(e) =>
                  setAddForm({ ...addForm, tags: e.target.value })
                }
              />
            </InputGroup>
            <InputGroup>
              <InputLabel>메모</InputLabel>
              <Textarea
                placeholder="선택사항"
                rows={2}
                value={addForm.memo}
                onChange={(e) =>
                  setAddForm({ ...addForm, memo: e.target.value })
                }
              />
            </InputGroup>
            <div className="flex gap-xs justify-end">
              <Button
                size="sm"
                variant="secondary"
                type="button"
                onClick={() => setShowAddForm(false)}
              >
                취소
              </Button>
              <Button size="sm" type="submit">
                추가
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* 칸반 보드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-md flex-1 min-h-0 mt-lg">
        {COLUMNS.map((col) => {
          const colTodos = filteredTodos.filter((t) => t.status === col.id);
          return (
            <div key={col.id} className="flex flex-col gap-xs min-h-0">
              <div className="flex items-baseline justify-between pb-2 border-b-2 border-foreground">
                <h2 className="font-display text-md tracking-tight text-foreground">
                  {col.label}
                </h2>
                <span className="mono-meta tabular-nums">
                  {colTodos.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-xs pr-0.5 pb-sm">
                {colTodos.length === 0 && (
                  <div className="border border-dashed border-border py-xl flex items-center justify-center">
                    <p className="mono-meta !normal-case !tracking-snug">
                      항목 없음
                    </p>
                  </div>
                )}
                {colTodos.map((todo) => (
                  <TodoCard
                    key={todo.id}
                    todo={todo}
                    isEditing={editingId === todo.id}
                    isConfirmingDelete={confirmDeleteId === todo.id}
                    isConfirmingArchive={confirmArchiveId === todo.id}
                    onStatusChange={handleStatusChange}
                    onEditStart={() => setEditingId(todo.id)}
                    onEditCancel={() => setEditingId(null)}
                    onEditSave={(fields) => handleEdit(todo, fields)}
                    onDeleteStart={() => setConfirmDeleteId(todo.id)}
                    onDeleteCancel={() => setConfirmDeleteId(null)}
                    onDeleteConfirm={() => handleDelete(todo)}
                    onSendToToday={() => handleSendToToday(todo)}
                    onRemoveFromToday={() => handleRemoveFromToday(todo)}
                    onArchiveStart={() => setConfirmArchiveId(todo.id)}
                    onArchiveCancel={() => setConfirmArchiveId(null)}
                    onArchiveConfirm={() => handleArchive(todo)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// TabButton — 활성 / 보관함 전환
// ============================================================
function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative -mb-px flex items-center gap-1.5 px-0 py-2 text-sm transition-colors duration-short ease-out-flow",
        active
          ? "text-foreground font-medium"
          : "text-ink-soft hover:text-foreground",
      )}
      aria-pressed={active}
    >
      <span>{label}</span>
      <span className="mono-meta tabular-nums">{count}</span>
      <span
        className={cn(
          "absolute left-0 right-0 -bottom-px h-[2px] transition-colors duration-short",
          active ? "bg-accent" : "bg-transparent",
        )}
        aria-hidden
      />
    </button>
  );
}

// ============================================================
// FilterChip — 태그 필터 토글
// ============================================================
function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 font-mono text-2xs uppercase tracking-meta px-2 py-0.5 border rounded-none transition-colors duration-short ease-out-flow",
        active
          ? "bg-foreground text-background border-foreground"
          : "bg-transparent text-ink-soft border-border-strong hover:border-foreground hover:text-foreground",
      )}
    >
      {label}
      {count !== undefined && (
        <span className="opacity-60 tabular-nums">{count}</span>
      )}
    </button>
  );
}

// ============================================================
// NativeSelect — underline-only style select
// ============================================================
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

// ============================================================
// TodoCard — single task card
// ============================================================
function TodoCard({
  todo,
  isEditing,
  isConfirmingDelete,
  isConfirmingArchive,
  onStatusChange,
  onEditStart,
  onEditCancel,
  onEditSave,
  onDeleteStart,
  onDeleteCancel,
  onDeleteConfirm,
  onSendToToday,
  onRemoveFromToday,
  onArchiveStart,
  onArchiveCancel,
  onArchiveConfirm,
}: {
  todo: Todo;
  isEditing: boolean;
  isConfirmingDelete: boolean;
  isConfirmingArchive: boolean;
  onStatusChange: (todo: Todo, status: TodoStatus) => void;
  onEditStart: () => void;
  onEditCancel: () => void;
  onEditSave: (fields: EditFields) => void;
  onDeleteStart: () => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
  onSendToToday: () => void;
  onRemoveFromToday: () => void;
  onArchiveStart: () => void;
  onArchiveCancel: () => void;
  onArchiveConfirm: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const isOnToday = todo.tags.includes("today");
  const urgent = todo.priority === "high";
  const [editForm, setEditForm] = useState<EditFields>({
    content: todo.content,
    priority: todo.priority,
    category: todo.category,
    dueDate: todo.dueDate ?? "",
    tags: todo.tags.join(" "),
    memo: todo.memo ?? "",
  });

  useEffect(() => {
    setEditForm({
      content: todo.content,
      priority: todo.priority,
      category: todo.category,
      dueDate: todo.dueDate ?? "",
      tags: todo.tags.join(" "),
      memo: todo.memo ?? "",
    });
  }, [
    todo.id,
    todo.content,
    todo.priority,
    todo.category,
    todo.dueDate,
    todo.tags,
    todo.memo,
  ]);

  const nextStatus = NEXT_STATUS[todo.status];

  // ==================== Edit mode ====================
  if (isEditing) {
    return (
      <Card urgent={urgent} className="space-y-sm">
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
        <div className="grid grid-cols-1 gap-sm">
          <div className="grid grid-cols-2 gap-sm">
            <InputGroup>
              <InputLabel>우선순위</InputLabel>
              <NativeSelect
                value={editForm.priority}
                onChange={(v) =>
                  setEditForm({
                    ...editForm,
                    priority: v as Todo["priority"],
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
                options={CATEGORY_OPTIONS.map((c) => ({
                  value: c,
                  label: c,
                }))}
              />
            </InputGroup>
          </div>
          <InputGroup>
            <InputLabel>마감</InputLabel>
            <Input
              type="date"
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
          <InputGroup>
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
      <Card urgent={urgent} className="border-danger">
        <p className="text-sm font-medium leading-snug truncate mb-1">
          {todo.content}
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

  // ==================== Confirm archive ====================
  if (isConfirmingArchive) {
    return (
      <Card urgent={urgent}>
        <p className="text-sm font-medium leading-snug truncate mb-1">
          {todo.content}
        </p>
        <p className="text-xs text-muted-foreground mb-sm leading-relaxed">
          보관함으로 이동할까요? 언제든 복원할 수 있습니다.
        </p>
        <div className="flex gap-xs justify-end">
          <Button size="sm" variant="secondary" onClick={onArchiveCancel}>
            취소
          </Button>
          <Button size="sm" variant="secondary" onClick={onArchiveConfirm}>
            보관
          </Button>
        </div>
      </Card>
    );
  }

  // ==================== Default view ====================
  return (
    <Card urgent={urgent} className="group p-sm">
      {/* 제목 + 호버 액션 */}
      <div className="flex items-start gap-xs mb-sm">
        <p
          className={cn(
            "text-sm font-medium leading-snug flex-1 ink-bleed",
            todo.status === "done" && "text-muted-foreground",
          )}
          data-done={todo.status === "done"}
        >
          {todo.content}
        </p>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-short ease-out-flow shrink-0">
          {todo.status !== "done" && !isOnToday && (
            <IconButton label="오늘 할 일로 보내기" onClick={onSendToToday}>
              <CalendarPlus className="w-3.5 h-3.5" strokeWidth={1.5} />
            </IconButton>
          )}
          {todo.status !== "done" && isOnToday && (
            <IconButton
              label="오늘에서 제외"
              onClick={onRemoveFromToday}
              hoverTone="warn"
            >
              <CalendarMinus className="w-3.5 h-3.5" strokeWidth={1.5} />
            </IconButton>
          )}
          {todo.status === "done" && (
            <IconButton label="보관함으로" onClick={onArchiveStart}>
              <Archive className="w-3.5 h-3.5" strokeWidth={1.5} />
            </IconButton>
          )}
          <IconButton label="편집" onClick={onEditStart}>
            <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
          </IconButton>
          <IconButton label="삭제" onClick={onDeleteStart} hoverTone="danger">
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          </IconButton>
        </div>
      </div>

      {/* 메타: 우선순위 · 카테고리 · 마감 */}
      <div className="flex items-center gap-xs flex-wrap mb-xs">
        <Tag tone={PRIORITY_TAG_TONE[todo.priority]}>
          {PRIORITY_LABEL[todo.priority]}
        </Tag>
        <span className="mono-meta !normal-case !tracking-snug text-xs text-ink-soft">
          {todo.category}
        </span>
        {todo.dueDate && (
          <span className="mono-meta !normal-case !tracking-snug text-xs ml-auto">
            마감 {todo.dueDate}
          </span>
        )}
      </div>

      {/* 태그 라인 */}
      {todo.tags.length > 0 && (
        <div className="flex flex-wrap gap-x-sm gap-y-0.5 mb-xs">
          {todo.tags.map((tag) => (
            <span
              key={tag}
              className="mono-meta !normal-case !tracking-snug text-accent text-xs"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* 메모 */}
      {todo.memo && (
        <div className="text-xs text-ink-soft bg-surface-2 border-l-2 border-border-strong px-2.5 py-1.5 mb-xs leading-relaxed whitespace-pre-wrap">
          {todo.memo}
        </div>
      )}

      {/* 문서 참조 */}
      {todo.docRefs.length > 0 && (
        <div className="flex flex-col gap-1 mb-xs">
          {todo.docRefs.map((ref, i) => (
            <Link
              key={i}
              href={`/docs/view?path=${encodeURIComponent(ref.path)}`}
              className="inline-flex items-center gap-1.5 text-xs text-foreground hover:text-accent transition-colors duration-short ease-out-flow truncate"
            >
              <FileText className="w-3 h-3 shrink-0" strokeWidth={1.5} />
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

      {/* 액션 영역 */}
      <div className="flex items-center gap-xs pt-xs border-t border-border">
        {nextStatus && (
          <button
            type="button"
            onClick={() => onStatusChange(todo, nextStatus)}
            className="inline-flex items-center gap-1 mono-meta !normal-case !tracking-snug px-1.5 py-0.5 text-ink-soft hover:text-accent transition-colors duration-short ease-out-flow"
          >
            <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
            {NEXT_STATUS_LABEL[nextStatus] ?? nextStatus}
          </button>
        )}
        <div className="relative ml-auto">
          <button
            type="button"
            onClick={() => setShowMenu((v) => !v)}
            className="inline-flex items-center gap-1 mono-meta !normal-case !tracking-snug px-1.5 py-0.5 text-ink-soft hover:text-foreground hover:bg-surface-2 transition-colors duration-short ease-out-flow"
            aria-label="상태 변경"
          >
            이동
            <ChevronDown className="w-3 h-3" strokeWidth={1.5} />
          </button>
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
                aria-hidden
              />
              <div className="absolute right-0 bottom-full mb-1 z-20 bg-surface border border-border-strong min-w-36 py-1 rounded-sm shadow-[0_8px_24px_rgba(20,18,16,0.10)]">
                <p className="mono-meta px-sm py-1">이동할 상태</p>
                {COLUMNS.filter((c) => c.id !== todo.status).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      onStatusChange(todo, s.id);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-sm py-2 text-sm hover:bg-surface-2 transition-colors duration-short ease-out-flow text-foreground"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </>
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

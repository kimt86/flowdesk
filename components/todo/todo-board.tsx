"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Todo, TodoStatus } from "@/lib/types";
import { Plus, RefreshCw, ArrowRight, ChevronDown, FileText, Pencil, Trash2, Search, Tag, CalendarPlus, CalendarMinus, Archive } from "lucide-react";

const COLUMNS: { id: TodoStatus; label: string; headerClass: string; dotColor: string }[] = [
  { id: "todo",        label: "할 일",  headerClass: "border-gray-300",  dotColor: "bg-gray-400"  },
  { id: "in-progress", label: "진행중", headerClass: "border-blue-400",  dotColor: "bg-blue-500"  },
  { id: "blocked",     label: "보류",   headerClass: "border-red-400",   dotColor: "bg-red-500"   },
  { id: "done",        label: "완료",   headerClass: "border-green-400", dotColor: "bg-green-500" },
];

const PRIORITY_LEFT_BORDER: Record<string, string> = {
  high:   "border-l-red-500",
  medium: "border-l-yellow-400",
  low:    "border-l-gray-300",
};

const PRIORITY_BADGE: Record<string, string> = {
  high:   "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low:    "bg-gray-100 text-gray-500",
};

const PRIORITY_LABEL: Record<string, string> = {
  high: "긴급", medium: "보통", low: "낮음",
};

const NEXT_STATUS: Record<TodoStatus, TodoStatus | null> = {
  "todo": "in-progress", "in-progress": "done", "blocked": "in-progress", "done": null,
};

const NEXT_STATUS_LABEL: Record<string, string> = {
  "in-progress": "시작", "done": "완료",
};

type EditFields = { content: string; priority: Todo["priority"]; category: string; dueDate: string; tags: string; memo: string };

export function TodoBoard({ initialTodos }: { initialTodos: Todo[] }) {
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<EditFields>({
    content: "", priority: "medium", category: "@개발", dueDate: "", tags: "", memo: "",
  });
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  async function handleStatusChange(todo: Todo, newStatus: TodoStatus) {
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, status: newStatus } : t)));
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
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, tags: newTags } : t)));
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
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, tags: newTags } : t)));
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
      // 보관 후 todos 재동기화
      const todosRes = await fetch("/api/todos");
      if (todosRes.ok) {
        const data = await todosRes.json();
        setTodos(data.todos);
      }
      router.refresh();
    }
  }

  async function handleDelete(todo: Todo) {
    // 즉시 제거 (optimistic)
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
        tags: addForm.tags ? addForm.tags.split(/\s+/).filter(Boolean) : undefined,
        memo: addForm.memo || undefined,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setTodos(data.todos);
      setAddForm({ content: "", priority: "medium", category: "@개발", dueDate: "", tags: "", memo: "" });
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
    if (selectedTags.length > 0 && !t.tags.some((tag) => selectedTags.includes(tag))) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!t.content.toLowerCase().includes(q) && !t.tags.some((tag) => tag.toLowerCase().includes(q)) && !t.category.toLowerCase().includes(q) && !(t.memo ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  const activeTodos = filteredTodos.filter((t) => t.status !== "done").length;
  const doneTodos   = filteredTodos.filter((t) => t.status === "done").length;

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-2 mb-5 flex-wrap">
        <div>
          <h1 className="text-xl font-bold tracking-tight">할 일</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            진행 중 {activeTodos}개 &middot; 완료 {doneTodos}개
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
            새로고침
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-4 py-1.5 rounded-md hover:bg-primary/90 transition-colors font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            할 일 추가
          </button>
        </div>
      </div>

      {/* 검색 */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="할 일 검색 (제목, 태그, 메모)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
        />
      </div>

      {/* 태그 필터 */}
      {allTags.length > 0 && (
        <div className="mb-4 flex items-start gap-2">
          <Tag className="w-3.5 h-3.5 text-muted-foreground mt-1 flex-shrink-0" />
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedTags([])}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border transition-colors",
                selectedTags.length === 0
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/40"
              )}
            >
              전체
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full border transition-colors",
                  selectedTags.includes(tag)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/40"
                )}
              >
                {tag}
                <span className="ml-1 opacity-60">{tagCounts[tag]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 필터 결과 */}
      {(selectedTags.length > 0 || query) && (
        <p className="text-xs text-muted-foreground mb-3">
          {filteredTodos.length}개 표시 중 (전체 {todos.length}개)
        </p>
      )}

      {/* 추가 폼 */}
      {showAddForm && (
        <form onSubmit={handleAddTodo} className="bg-card border border-border rounded-lg p-4 mb-5 shadow-sm">
          <input
            type="text"
            placeholder="할 일 내용을 입력하세요..."
            value={addForm.content}
            onChange={(e) => setAddForm({ ...addForm, content: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 mb-3"
            autoFocus
          />
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:flex-wrap">
            <PrioritySelect value={addForm.priority} onChange={(v) => setAddForm({ ...addForm, priority: v })} />
            <CategorySelect value={addForm.category} onChange={(v) => setAddForm({ ...addForm, category: v })} />
            <input
              type="date"
              value={addForm.dueDate}
              onChange={(e) => setAddForm({ ...addForm, dueDate: e.target.value })}
              className="text-sm px-3 py-1.5 border border-border rounded-md bg-background w-full sm:w-auto"
            />
          </div>
          <div className="mt-2">
            <label className="text-[11px] text-muted-foreground font-medium mb-0.5 block">태그</label>
            <input
              type="text"
              placeholder="공백으로 구분 (예: 배차 설계)"
              value={addForm.tags}
              onChange={(e) => setAddForm({ ...addForm, tags: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="mt-2">
            <label className="text-[11px] text-muted-foreground font-medium mb-0.5 block">메모</label>
            <textarea
              placeholder="선택사항"
              rows={2}
              value={addForm.memo}
              onChange={(e) => setAddForm({ ...addForm, memo: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end mt-3">
            <button type="button" onClick={() => setShowAddForm(false)}
              className="text-sm px-4 py-1.5 border border-border rounded-md hover:bg-muted transition-colors">
              취소
            </button>
            <button type="submit"
              className="text-sm px-4 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium">
              추가
            </button>
          </div>
        </form>
      )}

      {/* 칸반 보드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 flex-1 min-h-0">
        {COLUMNS.map((col) => {
          const colTodos = filteredTodos.filter((t) => t.status === col.id);
          return (
            <div key={col.id} className="flex flex-col gap-2 min-h-0">
              <div className={cn("flex items-center gap-2 px-3 py-2 rounded-md border-l-4 bg-muted/50", col.headerClass)}>
                <span className="text-sm font-semibold">{col.label}</span>
                <span className="ml-auto text-xs font-medium text-muted-foreground bg-background px-2 py-0.5 rounded-full border border-border">
                  {colTodos.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 pb-2">
                {colTodos.length === 0 && (
                  <div className="border-2 border-dashed border-border rounded-lg py-8 flex items-center justify-center">
                    <p className="text-xs text-muted-foreground">항목 없음</p>
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
    </div>
  );
}

function PrioritySelect({ value, onChange }: { value: string; onChange: (v: Todo["priority"]) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as Todo["priority"])}
      className="text-sm px-3 py-1.5 border border-border rounded-md bg-background">
      <option value="high">🔴 긴급</option>
      <option value="medium">🟡 보통</option>
      <option value="low">🟢 낮음</option>
    </select>
  );
}

function CategorySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="text-sm px-3 py-1.5 border border-border rounded-md bg-background">
      {["@개발", "@회의", "@문서", "@보고", "@팀운영", "@기타"].map((c) => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  );
}

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
  }, [todo.id, todo.content, todo.priority, todo.category, todo.dueDate, todo.tags, todo.memo]);

  const nextStatus = NEXT_STATUS[todo.status];

  // 편집 폼 모드
  if (isEditing) {
    return (
      <div className={cn("bg-card border border-primary/50 rounded-lg p-3 shadow-sm border-l-4", PRIORITY_LEFT_BORDER[todo.priority])}>
        <input
          type="text"
          value={editForm.content}
          onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
          className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 mb-2"
          autoFocus
        />
        <div className="flex flex-col gap-1.5 mb-2">
          <div className="flex gap-1.5 flex-wrap">
            <PrioritySelect value={editForm.priority} onChange={(v) => setEditForm({ ...editForm, priority: v })} />
            <CategorySelect value={editForm.category} onChange={(v) => setEditForm({ ...editForm, category: v })} />
          </div>
          <input
            type="date"
            value={editForm.dueDate}
            onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
            className="text-sm px-2 py-1.5 border border-border rounded-md bg-background w-full"
          />
          <div>
            <label className="text-[11px] text-muted-foreground font-medium mb-0.5 block">태그</label>
            <input
              type="text"
              placeholder="공백으로 구분 (예: 배차 설계)"
              value={editForm.tags}
              onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
              className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground font-medium mb-0.5 block">메모</label>
            <textarea
              placeholder="선택사항"
              rows={2}
              value={editForm.memo}
              onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })}
              className="w-full px-2 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>
        </div>
        <div className="flex gap-1.5 justify-end">
          <button onClick={onEditCancel}
            className="text-xs px-3 py-2 border border-border rounded-md hover:bg-muted transition-colors">
            취소
          </button>
          <button onClick={() => onEditSave(editForm)}
            className="text-xs px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium">
            저장
          </button>
        </div>
      </div>
    );
  }

  // 삭제 확인 모드
  if (isConfirmingDelete) {
    return (
      <div className={cn("bg-card border border-red-300 rounded-lg p-3 shadow-sm border-l-4", PRIORITY_LEFT_BORDER[todo.priority])}>
        <p className="text-sm font-medium leading-snug mb-1 truncate">{todo.content}</p>
        <p className="text-xs text-muted-foreground mb-3">이 항목을 삭제할까요?</p>
        <div className="flex gap-1.5 justify-end">
          <button onClick={onDeleteCancel}
            className="text-xs px-3 py-1 border border-border rounded-md hover:bg-muted transition-colors">
            취소
          </button>
          <button onClick={onDeleteConfirm}
            className="text-xs px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors font-medium">
            삭제
          </button>
        </div>
      </div>
    );
  }

  // 보관 확인 모드
  if (isConfirmingArchive) {
    return (
      <div className={cn("bg-card border border-purple-300 rounded-lg p-3 shadow-sm border-l-4", PRIORITY_LEFT_BORDER[todo.priority])}>
        <p className="text-sm font-medium leading-snug mb-1 truncate">{todo.content}</p>
        <p className="text-xs text-muted-foreground mb-3">보관함으로 이동할까요? 보관함에서 언제든 복원할 수 있습니다.</p>
        <div className="flex gap-1.5 justify-end">
          <button onClick={onArchiveCancel}
            className="text-xs px-3 py-1 border border-border rounded-md hover:bg-muted transition-colors">
            취소
          </button>
          <button onClick={onArchiveConfirm}
            className="text-xs px-3 py-1 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors font-medium">
            보관
          </button>
        </div>
      </div>
    );
  }

  // 일반 카드 모드
  return (
    <div className={cn(
      "group bg-card border border-border rounded-lg p-3 shadow-sm border-l-4 transition-shadow hover:shadow-md",
      PRIORITY_LEFT_BORDER[todo.priority]
    )}>
      {/* 내용 + 편집/삭제 버튼 */}
      <div className="flex items-start gap-1.5 mb-2.5">
        <p className="text-sm font-medium leading-snug flex-1">{todo.content}</p>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {todo.status !== "done" && !isOnToday && (
            <button onClick={onSendToToday} title="오늘 할 일로 보내기"
              className="p-2 rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors">
              <CalendarPlus className="w-3.5 h-3.5" />
            </button>
          )}
          {todo.status !== "done" && isOnToday && (
            <button onClick={onRemoveFromToday} title="오늘에서 제외하기"
              className="p-2 rounded hover:bg-amber-50 text-amber-600 transition-colors">
              <CalendarMinus className="w-3.5 h-3.5" />
            </button>
          )}
          {todo.status === "done" && (
            <button onClick={onArchiveStart} title="보관함으로 이동"
              className="p-2 rounded hover:bg-purple-50 text-muted-foreground hover:text-purple-600 transition-colors">
              <Archive className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onEditStart} title="편집"
            className="p-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDeleteStart} title="삭제"
            className="p-2 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 메타 정보 */}
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", PRIORITY_BADGE[todo.priority])}>
          {PRIORITY_LABEL[todo.priority]}
        </span>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {todo.category}
        </span>
        {todo.dueDate && (
          <span className="text-xs text-muted-foreground ml-auto">마감 {todo.dueDate}</span>
        )}
        {todo.tags.length > 0 && (
          <>
            {todo.tags.map((tag) => (
              <span key={tag} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                #{tag}
              </span>
            ))}
          </>
        )}
      </div>

      {/* 메모 */}
      {todo.memo && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2.5 py-1.5 mb-2.5 border-l-2 border-muted-foreground/30">
          {todo.memo}
        </div>
      )}

      {/* 관련 문서 참조 */}
      {todo.docRefs.length > 0 && (
        <div className="flex flex-col gap-1 mb-2.5">
          {todo.docRefs.map((ref, i) => (
            <Link key={i} href={`/docs/view?path=${encodeURIComponent(ref.path)}`}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline truncate">
              <FileText className="w-3 h-3 flex-shrink-0" />
              {ref.issueId && (
                <span className="font-mono bg-primary/10 text-primary px-1 rounded flex-shrink-0">{ref.issueId}</span>
              )}
              <span className="truncate text-muted-foreground">{ref.path.split(/[\\/]/).pop()}</span>
            </Link>
          ))}
        </div>
      )}

      {/* 액션 영역 */}
      <div className="flex items-center gap-1.5 pt-2 border-t border-border/50">
        {nextStatus && (
          <button onClick={() => onStatusChange(todo, nextStatus)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted px-2 py-1 rounded transition-colors font-medium">
            <ArrowRight className="w-3 h-3" />
            {NEXT_STATUS_LABEL[nextStatus] ?? nextStatus}
          </button>
        )}

        <div className="relative ml-auto">
          <button onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted px-2 py-1 rounded transition-colors"
            aria-label="상태 변경">
            이동
            <ChevronDown className="w-3 h-3" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 bottom-full mb-1 z-20 bg-card border border-border rounded-lg shadow-lg py-1 min-w-36">
                <p className="text-[10px] text-muted-foreground px-3 py-1 font-medium uppercase tracking-wide">이동할 상태</p>
                {COLUMNS.filter((c) => c.id !== todo.status).map((s) => (
                  <button key={s.id} onClick={() => { onStatusChange(todo, s.id); setShowMenu(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full flex-shrink-0", s.dotColor)} />
                    {s.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

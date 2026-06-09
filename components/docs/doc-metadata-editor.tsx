"use client";

import {
  KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Clock, Plus, Tag, User, X } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/docs-shared";

const STATUS_KEYS = ["draft", "review", "final"] as const;
type StatusKey = (typeof STATUS_KEYS)[number];

export interface DocMetadataInitial {
  title: string;
  status: string;
  author: string;
  tags: string[];
  created: string;
  updated: string;
}

interface Props {
  relPath: string;
  initial: DocMetadataInitial;
}

type SaveField = "title" | "status" | "author" | "tags";

export function DocMetadataEditor({ relPath, initial }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [status, setStatus] = useState(initial.status);
  const [author, setAuthor] = useState(initial.author);
  const [tags, setTags] = useState<string[]>(initial.tags);
  const [updated, setUpdated] = useState(initial.updated);
  const [saving, setSaving] = useState<SaveField | null>(null);
  const [error, setError] = useState<string | null>(null);

  // initial 변경(server 재페치 등) 시 동기화
  useEffect(() => {
    setTitle(initial.title);
    setStatus(initial.status);
    setAuthor(initial.author);
    setTags(initial.tags);
    setUpdated(initial.updated);
  }, [initial]);

  async function save(field: SaveField, patch: Record<string, unknown>) {
    setSaving(field);
    setError(null);
    try {
      const res = await fetch(
        `/api/docs/meta?path=${encodeURIComponent(relPath)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        },
      );
      if (!res.ok) throw new Error("save failed");
      // 수정일 자동 갱신 (서버가 today로 set) — 화면에 즉시 반영
      setUpdated(new Date().toISOString().split("T")[0]);
      router.refresh();
    } catch (err) {
      console.error("[meta] save failed", err);
      setError("저장 실패");
      // 사용자에게 알림 후 잠시 뒤 정리
      setTimeout(() => setError(null), 3000);
    } finally {
      setSaving(null);
    }
  }

  function commitTitle(next: string) {
    const trimmed = next.trim();
    if (!trimmed || trimmed === title) return;
    setTitle(trimmed);
    save("title", { title: trimmed });
  }

  function commitAuthor(next: string) {
    const trimmed = next.trim();
    if (trimmed === author) return;
    setAuthor(trimmed);
    save("author", { author: trimmed });
  }

  function commitStatus(next: StatusKey) {
    if (next === status) return;
    setStatus(next);
    save("status", { status: next });
  }

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    const next = [...tags, trimmed];
    setTags(next);
    save("tags", { tags: next });
  }

  function removeTag(tag: string) {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    save("tags", { tags: next });
  }

  return (
    <div className="mb-6 pb-4 border-b border-border">
      {/* 제목 + 상태 */}
      <div className="flex items-start gap-3 mb-3">
        <InlineText
          value={title}
          onCommit={commitTitle}
          ariaLabel="제목"
          className="text-xl font-bold flex-1 leading-snug"
          placeholder="제목 없음"
        />
        <StatusDropdown
          value={status}
          onChange={commitStatus}
          saving={saving === "status"}
        />
      </div>

      {/* 메타 라인 */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <User className="w-3 h-3" />
          <InlineText
            value={author}
            onCommit={commitAuthor}
            ariaLabel="작성자"
            className="text-xs"
            placeholder="작성자 없음"
          />
        </span>
        {updated && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            수정 {updated}
          </span>
        )}
        {initial.created && initial.created !== updated && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            작성 {initial.created}
          </span>
        )}
        <span className="font-mono opacity-60">{relPath}</span>
        {error && <span className="text-[var(--danger)]">{error}</span>}
      </div>

      {/* 태그 */}
      <TagEditor
        tags={tags}
        onAdd={addTag}
        onRemove={removeTag}
        saving={saving === "tags"}
      />
    </div>
  );
}

/* -----------------------------  서브 컴포넌트들  ----------------------------- */

interface InlineTextProps {
  value: string;
  onCommit: (next: string) => void;
  ariaLabel: string;
  className?: string;
  placeholder?: string;
}

function InlineText({
  value,
  onCommit,
  ariaLabel,
  className,
  placeholder,
}: InlineTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        aria-label={ariaLabel}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          onCommit(draft);
        }}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === "Enter") {
            e.preventDefault();
            setEditing(false);
            onCommit(draft);
          } else if (e.key === "Escape") {
            e.preventDefault();
            setDraft(value);
            setEditing(false);
          }
        }}
        className={`bg-transparent border-b border-border-strong focus:outline-none focus:border-accent ${className ?? ""}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label={`${ariaLabel} 편집`}
      className={`text-left hover:underline decoration-dotted decoration-muted-foreground underline-offset-4 ${className ?? ""}`}
    >
      {value || (
        <span className="text-muted-foreground italic">{placeholder}</span>
      )}
    </button>
  );
}

interface StatusDropdownProps {
  value: string;
  onChange: (next: StatusKey) => void;
  saving: boolean;
}

function StatusDropdown({ value, onChange, saving }: StatusDropdownProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          disabled={saving}
          className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 hover:opacity-80 transition-opacity disabled:opacity-50 ${
            STATUS_COLORS[value] ?? "bg-muted text-muted-foreground"
          }`}
        >
          {STATUS_LABELS[value] ?? value}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="bottom"
          align="end"
          sideOffset={4}
          className="z-50 bg-card border border-border rounded-md py-1 min-w-28"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {STATUS_KEYS.map((s) => (
            <DropdownMenu.Item
              key={s}
              onSelect={() => onChange(s)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-muted cursor-pointer outline-none"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  STATUS_COLORS[s]?.split(" ")[0] ?? ""
                }`}
              />
              {STATUS_LABELS[s]}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

interface TagEditorProps {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  saving: boolean;
}

function TagEditor({ tags, onAdd, onRemove, saving }: TagEditorProps) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  function commit() {
    const t = draft.trim();
    if (t) onAdd(t);
    setDraft("");
    setAdding(false);
  }

  return (
    <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
      <Tag className="w-3 h-3 text-muted-foreground" />
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground pl-2 pr-1 py-0.5 rounded"
        >
          {tag}
          <button
            type="button"
            onClick={() => onRemove(tag)}
            disabled={saving}
            aria-label={`${tag} 태그 삭제`}
            className="inline-flex items-center justify-center w-3.5 h-3.5 rounded hover:bg-foreground/10 disabled:opacity-50"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
      {adding ? (
        <input
          ref={inputRef}
          id={inputId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setDraft("");
              setAdding(false);
            }
          }}
          placeholder="태그 입력"
          className="text-xs bg-transparent border-b border-border-strong focus:outline-none focus:border-accent w-24 px-1"
          aria-label="새 태그"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          disabled={saving}
          aria-label="태그 추가"
          className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-border-strong disabled:opacity-50"
        >
          <Plus className="w-2.5 h-2.5" />
          태그
        </button>
      )}
    </div>
  );
}

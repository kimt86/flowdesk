"use client";

import { useState, useEffect, useMemo, useCallback, memo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ArchivedTodo, MonthSummary } from "@/lib/types";
import {
  RefreshCw,
  Undo2,
  Trash2,
  FileText,
  Search,
  Tag as TagIcon,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
import {
  Button,
  Card,
  Input,
  Seal,
  Tag,
} from "@/components/ui";

const PRIORITY_TAG_TONE: Record<
  ArchivedTodo["priority"],
  "danger" | "warn" | "default"
> = {
  high: "danger",
  medium: "warn",
  low: "default",
};

const PRIORITY_LABEL: Record<ArchivedTodo["priority"], string> = {
  high: "긴급",
  medium: "보통",
  low: "낮음",
};

function currentMonthKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function ArchiveBoard({
  initialItems,
  embedded = false,
}: {
  initialItems: ArchivedTodo[];
  embedded?: boolean;
}) {
  const router = useRouter();

  // ── 월별 그룹 모드 상태 ──
  const [summaries, setSummaries] = useState<MonthSummary[]>([]);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(
    () => new Set([currentMonthKey()]),
  );
  const [monthItems, setMonthItems] = useState<Record<string, ArchivedTodo[]>>(
    {},
  );
  const [summaryLoaded, setSummaryLoaded] = useState(false);

  // ── 검색 모드 상태 ──
  const [searchItems, setSearchItems] = useState<ArchivedTodo[]>(initialItems);
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const searchMode = query.length > 0 || selectedTags.length > 0;

  // ── 공통 ──
  const [refreshing, setRefreshing] = useState(false);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ── 초기 로드: 월별 요약 fetch ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/archive?summary=true");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setSummaries(data.months ?? []);
        setSummaryLoaded(true);

        // 현재 월 자동 펼침
        const curKey = currentMonthKey();
        if ((data.months ?? []).some((m: MonthSummary) => m.key === curKey)) {
          fetchMonthItems(curKey);
        }
      } catch {
        // fallback: initialItems 사용
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 월별 항목 fetch ──
  const fetchMonthItems = useCallback(async (key: string) => {
    const [year, month] = key.split("-");
    try {
      const res = await fetch(
        `/api/archive?year=${year}&month=${month}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      setMonthItems((prev) => ({ ...prev, [key]: data.items ?? [] }));
    } catch {
      // 실패 시 빈 배열
      setMonthItems((prev) => ({ ...prev, [key]: [] }));
    }
  }, []);

  function toggleMonth(key: string) {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
        // 아직 fetch 안 됐으면 가져오기
        if (!monthItems[key]) {
          fetchMonthItems(key);
        }
      }
      return next;
    });
  }

  // ── 전체 새로고침 ──
  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/archive?summary=true");
      if (res.ok) {
        const data = await res.json();
        setSummaries(data.months ?? []);
      }
      // 펼쳐진 월들 다시 fetch
      const expanded = Array.from(expandedMonths);
      await Promise.all(expanded.map((k) => fetchMonthItems(k)));
    } catch {
      // ignore
    }
    setRefreshing(false);
  }

  // ── 복원 ──
  async function handleRestore(item: ArchivedTodo) {
    setConfirmRestoreId(null);
    const res = await fetch("/api/archive", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file: item.archiveFile,
        lineIndex: item.lineIndex,
      }),
    });
    if (res.ok) {
      // 해당 월 re-fetch + 요약 갱신
      const monthKey = item.doneDate
        ? item.doneDate.slice(0, 7)
        : null;
      if (monthKey) fetchMonthItems(monthKey);
      // 요약 갱신
      const sumRes = await fetch("/api/archive?summary=true");
      if (sumRes.ok) {
        const d = await sumRes.json();
        setSummaries(d.months ?? []);
      }
      // 검색 모드면 전체도 갱신
      if (searchMode) {
        const allRes = await fetch("/api/archive");
        if (allRes.ok) {
          const d = await allRes.json();
          setSearchItems(d.items ?? []);
        }
      }
      router.refresh();
    }
  }

  // ── 삭제 ──
  async function handleDelete(item: ArchivedTodo) {
    setConfirmDeleteId(null);
    const res = await fetch(
      `/api/archive?file=${encodeURIComponent(item.archiveFile)}&lineIndex=${item.lineIndex}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      const monthKey = item.doneDate
        ? item.doneDate.slice(0, 7)
        : null;
      if (monthKey) fetchMonthItems(monthKey);
      const sumRes = await fetch("/api/archive?summary=true");
      if (sumRes.ok) {
        const d = await sumRes.json();
        setSummaries(d.months ?? []);
      }
      if (searchMode) {
        const allRes = await fetch("/api/archive");
        if (allRes.ok) {
          const d = await allRes.json();
          setSearchItems(d.items ?? []);
        }
      }
      router.refresh();
    }
  }

  // ── 검색 모드: 전체 fetch ──
  useEffect(() => {
    if (!searchMode) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/archive");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setSearchItems(data.items ?? []);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
    // 검색 모드 진입 시 1회만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchMode]);

  // ── 검색 필터링 (memoized) ──
  const filtered = useMemo(() => {
    if (!searchMode) return [];
    return searchItems.filter((i) => {
      if (
        selectedTags.length > 0 &&
        !i.tags.some((t) => selectedTags.includes(t))
      )
        return false;
      if (query) {
        const q = query.toLowerCase();
        if (
          !i.content.toLowerCase().includes(q) &&
          !i.tags.some((t) => t.toLowerCase().includes(q)) &&
          !i.category.toLowerCase().includes(q) &&
          !(i.memo ?? "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [searchItems, query, selectedTags, searchMode]);

  const tagCounts = useMemo(() => {
    const source = searchMode ? searchItems : [];
    const counts: Record<string, number> = {};
    for (const i of source) {
      for (const tag of i.tags) counts[tag] = (counts[tag] ?? 0) + 1;
    }
    return counts;
  }, [searchItems, searchMode]);

  const allTags = useMemo(
    () =>
      Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([tag]) => tag),
    [tagCounts],
  );

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function clearSearch() {
    setQuery("");
    setSelectedTags([]);
  }

  // ── 전체 항목 수 (요약 기준) ──
  const totalCount = useMemo(
    () => summaries.reduce((s, m) => s + m.count, 0),
    [summaries],
  );

  // ── 렌더 ──
  return (
    <div
      className={cn(
        "flex flex-col",
        embedded ? "h-full" : "p-lg md:p-2xl h-full",
      )}
    >
      {!embedded && (
        <>
          {/* UtilityBar */}
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
                보관함
              </h1>
              <p className="mono-meta mt-2">
                총{" "}
                <span className="text-foreground tabular-nums">
                  {totalCount}
                </span>
                {" · "}
                <span className="text-foreground tabular-nums">
                  {summaries.length}
                </span>{" "}
                개월
              </p>
            </div>
            <Seal size="lg" glyph="存" className="-mr-1" />
          </header>
        </>
      )}

      {/* 검색 */}
      <div className="relative mt-md">
        <Search
          className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
          strokeWidth={1.5}
        />
        <Input
          type="text"
          placeholder="보관 항목 검색 (제목, 태그, 메모)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-6"
        />
        {searchMode && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors duration-short ease-out-flow"
            aria-label="검색 해제"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* 태그 필터 (검색 모드에서만) */}
      {searchMode && allTags.length > 0 && (
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

      {searchMode && (
        <p className="mono-meta mt-xs">
          <span className="tabular-nums">{filtered.length}</span> 개 표시 / 전체{" "}
          <span className="tabular-nums">{searchItems.length}</span>
        </p>
      )}

      {/* 메인 콘텐츠 */}
      <div className="flex-1 overflow-y-auto pb-md mt-md">
        {searchMode ? (
          /* ── 검색 모드: 플랫 리스트 ── */
          <div className="space-y-xs">
            {filtered.length === 0 && (
              <EmptyState
                message={
                  searchItems.length === 0
                    ? "보관된 항목이 없습니다"
                    : "조건에 맞는 항목이 없습니다"
                }
              />
            )}
            {filtered.map((item) => (
              <ArchiveCard
                key={item.id}
                item={item}
                isConfirmingRestore={confirmRestoreId === item.id}
                isConfirmingDelete={confirmDeleteId === item.id}
                onRestoreStart={() => setConfirmRestoreId(item.id)}
                onRestoreCancel={() => setConfirmRestoreId(null)}
                onRestoreConfirm={() => handleRestore(item)}
                onDeleteStart={() => setConfirmDeleteId(item.id)}
                onDeleteCancel={() => setConfirmDeleteId(null)}
                onDeleteConfirm={() => handleDelete(item)}
              />
            ))}
          </div>
        ) : (
          /* ── 월별 그룹 모드 ── */
          <div className="space-y-0">
            {!summaryLoaded && (
              <EmptyState message="불러오는 중…" />
            )}
            {summaryLoaded && summaries.length === 0 && (
              <EmptyState message="보관된 항목이 없습니다" />
            )}
            {summaries.map((month) => (
              <MonthSection
                key={month.key}
                month={month}
                expanded={expandedMonths.has(month.key)}
                items={monthItems[month.key]}
                isCurrent={month.key === currentMonthKey()}
                onToggle={() => toggleMonth(month.key)}
                confirmRestoreId={confirmRestoreId}
                confirmDeleteId={confirmDeleteId}
                onRestoreStart={setConfirmRestoreId}
                onRestoreCancel={() => setConfirmRestoreId(null)}
                onRestore={handleRestore}
                onDeleteStart={setConfirmDeleteId}
                onDeleteCancel={() => setConfirmDeleteId(null)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MonthSection
// ============================================================
function MonthSection({
  month,
  expanded,
  items,
  isCurrent,
  onToggle,
  confirmRestoreId,
  confirmDeleteId,
  onRestoreStart,
  onRestoreCancel,
  onRestore,
  onDeleteStart,
  onDeleteCancel,
  onDelete,
}: {
  month: MonthSummary;
  expanded: boolean;
  items: ArchivedTodo[] | undefined;
  isCurrent: boolean;
  onToggle: () => void;
  confirmRestoreId: string | null;
  confirmDeleteId: string | null;
  onRestoreStart: (id: string) => void;
  onRestoreCancel: () => void;
  onRestore: (item: ArchivedTodo) => void;
  onDeleteStart: (id: string) => void;
  onDeleteCancel: () => void;
  onDelete: (item: ArchivedTodo) => void;
}) {
  const Chevron = expanded ? ChevronDown : ChevronRight;

  return (
    <div
      className={cn(
        isCurrent
          ? "border-t-[2px] border-foreground"
          : "border-t border-border",
      )}
    >
      {/* 월 헤더 */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-sm py-sm px-xs hover:bg-surface-2 transition-colors duration-short ease-out-flow"
      >
        <Chevron
          className="w-4 h-4 text-muted-foreground shrink-0"
          strokeWidth={1.5}
        />
        <span className="font-display text-lg leading-none tracking-display">
          {month.label}
        </span>
        <span className="mono-meta tabular-nums ml-auto">
          {month.count}
        </span>
      </button>

      {/* 펼쳐진 항목 */}
      {expanded && (
        <div className="space-y-xs pb-sm px-xs">
          {!items && (
            <p className="mono-meta py-sm text-center">불러오는 중…</p>
          )}
          {items && items.length === 0 && (
            <p className="mono-meta py-sm text-center">항목 없음</p>
          )}
          {items?.map((item) => (
            <ArchiveCard
              key={item.id}
              item={item}
              isConfirmingRestore={confirmRestoreId === item.id}
              isConfirmingDelete={confirmDeleteId === item.id}
              onRestoreStart={() => onRestoreStart(item.id)}
              onRestoreCancel={onRestoreCancel}
              onRestoreConfirm={() => onRestore(item)}
              onDeleteStart={() => onDeleteStart(item.id)}
              onDeleteCancel={onDeleteCancel}
              onDeleteConfirm={() => onDelete(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// EmptyState
// ============================================================
function EmptyState({ message }: { message: string }) {
  return (
    <div className="border border-dashed border-border py-xl flex flex-col items-center justify-center gap-2">
      <Seal size="md" glyph="存" rotate={0} className="opacity-30" />
      <p className="mono-meta !normal-case !tracking-snug">{message}</p>
    </div>
  );
}

// ============================================================
// FilterChip
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
// ArchiveCard (memoized)
// ============================================================
const ArchiveCard = memo(function ArchiveCard({
  item,
  isConfirmingRestore,
  isConfirmingDelete,
  onRestoreStart,
  onRestoreCancel,
  onRestoreConfirm,
  onDeleteStart,
  onDeleteCancel,
  onDeleteConfirm,
}: {
  item: ArchivedTodo;
  isConfirmingRestore: boolean;
  isConfirmingDelete: boolean;
  onRestoreStart: () => void;
  onRestoreCancel: () => void;
  onRestoreConfirm: () => void;
  onDeleteStart: () => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
}) {
  const urgent = item.priority === "high";

  if (isConfirmingRestore) {
    return (
      <Card urgent={urgent}>
        <p className="text-sm font-medium leading-snug truncate mb-1">
          {item.content}
        </p>
        <p className="text-xs text-muted-foreground mb-sm leading-relaxed">
          이 항목을 TODO.md 완료 섹션으로 복원할까요?
        </p>
        <div className="flex gap-xs justify-end">
          <Button size="sm" variant="secondary" onClick={onRestoreCancel}>
            취소
          </Button>
          <Button size="sm" onClick={onRestoreConfirm}>
            복원
          </Button>
        </div>
      </Card>
    );
  }

  if (isConfirmingDelete) {
    return (
      <Card urgent={urgent} className="border-danger">
        <p className="text-sm font-medium leading-snug truncate mb-1">
          {item.content}
        </p>
        <p className="text-xs text-muted-foreground mb-sm leading-relaxed">
          영구 삭제할까요? 되돌릴 수 없습니다.
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

  return (
    <Card urgent={urgent} className="group relative p-sm">
      {/* 시그니처 Seal — 보관된 항목의 완결 표식 */}
      <span className="absolute top-2.5 right-2.5 opacity-80 group-hover:opacity-100 transition-opacity duration-short ease-out-flow">
        <Seal size="sm" glyph="存" />
      </span>

      <div className="flex items-start gap-xs mb-xs pr-lg">
        <p className="text-sm font-medium leading-snug flex-1 text-ink-soft">
          {item.content}
        </p>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-short ease-out-flow shrink-0">
          <IconButton label="복원" onClick={onRestoreStart}>
            <Undo2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          </IconButton>
          <IconButton
            label="영구 삭제"
            onClick={onDeleteStart}
            hoverTone="danger"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          </IconButton>
        </div>
      </div>

      <div className="flex items-center gap-xs flex-wrap mb-xs">
        <Tag tone={PRIORITY_TAG_TONE[item.priority]}>
          {PRIORITY_LABEL[item.priority]}
        </Tag>
        <span className="mono-meta !normal-case !tracking-snug text-xs text-ink-soft">
          {item.category}
        </span>
        {item.doneDate && (
          <span className="mono-meta !normal-case !tracking-snug text-xs ml-auto">
            완료 {item.doneDate}
          </span>
        )}
      </div>

      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-x-sm gap-y-0.5 mb-xs">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="mono-meta !normal-case !tracking-snug text-accent text-xs"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {item.memo && (
        <div className="text-xs text-ink-soft bg-surface-2 border-l-2 border-border-strong px-2.5 py-1.5 mb-xs leading-relaxed whitespace-pre-wrap">
          {item.memo}
        </div>
      )}

      {item.docRefs.length > 0 && (
        <div className="flex flex-col gap-1 mb-xs">
          {item.docRefs.map((ref, idx) => (
            <Link
              key={idx}
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

      <div className="mono-meta inline-flex items-center gap-1 pt-xs border-t border-border">
        <FolderOpen className="w-3 h-3" strokeWidth={1.5} />
        <span className="!normal-case !tracking-snug truncate">
          {item.archiveFile}
        </span>
      </div>
    </Card>
  );
});

function IconButton({
  label,
  onClick,
  children,
  hoverTone,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  hoverTone?: "danger";
}) {
  const hoverClass =
    hoverTone === "danger"
      ? "hover:text-danger hover:bg-surface-2"
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

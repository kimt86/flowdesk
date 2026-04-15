export const dynamic = "force-dynamic";

import Link from "next/link";
import { readTodos } from "@/lib/parsers/todo-parser";
import { ArrowRight, Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, Tag } from "@/components/ui";

export default function HomePage() {
  const todos = readTodos();

  const stats = {
    total: todos.length,
    inProgress: todos.filter((t) => t.status === "in-progress").length,
    blocked: todos.filter((t) => t.status === "blocked").length,
    done: todos.filter((t) => t.status === "done").length,
  };

  const completionRate =
    stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  const todayDate = new Date();
  const dateLabel = todayDate.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const weekday = todayDate.toLocaleDateString("ko-KR", { weekday: "long" });

  const inProgressItems = todos.filter((t) => t.status === "in-progress");
  const urgentItems = todos.filter(
    (t) => t.priority === "high" && t.status !== "done",
  );

  // 카테고리별 집계
  const categoryMap = new Map<string, { total: number; done: number }>();
  for (const todo of todos) {
    const cat = todo.category;
    if (!categoryMap.has(cat)) categoryMap.set(cat, { total: 0, done: 0 });
    const entry = categoryMap.get(cat)!;
    entry.total++;
    if (todo.status === "done") entry.done++;
  }
  const categories = Array.from(categoryMap.entries()).sort(
    (a, b) => b[1].total - a[1].total,
  );

  // 최근 완료 항목
  const recentDone = todos
    .filter((t) => t.status === "done" && t.doneDate)
    .sort((a, b) => (b.doneDate ?? "").localeCompare(a.doneDate ?? ""))
    .slice(0, 8);

  return (
    <div className="p-lg md:p-2xl max-w-5xl space-y-xl">
      {/* Masthead */}
      <header className="border-b-[3px] border-foreground pb-sm flex items-end justify-between flex-wrap gap-md">
        <div>
          <h1 className="font-display text-3xl leading-none tracking-display">
            {dateLabel}
            <span className="text-muted-foreground font-normal ml-3 text-xl tracking-tight">
              {weekday}
            </span>
          </h1>
          <p className="mono-meta mt-2">작업 현황 · Dashboard</p>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl leading-none tabular-nums">
            {completionRate}%
          </div>
          <div className="mono-meta mt-1">
            {stats.done} / {stats.total} done
          </div>
        </div>
      </header>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-xs">
        <StatTile
          label="전체"
          value={stats.total}
          href="/todos"
        />
        <StatTile
          label="진행중"
          value={stats.inProgress}
          href="/todos?filter=in-progress"
          tone="accent"
        />
        <StatTile
          label="보류"
          value={stats.blocked}
          href="/todos?filter=blocked"
          tone="danger"
        />
        <StatTile
          label="완료"
          value={stats.done}
          href="/todos?filter=done"
          tone="success"
        />
      </div>

      {/* 진척도 바 — 별도 영역 */}
      <div>
        <div className="h-[3px] bg-border-strong/40 w-full">
          <div
            className="h-[3px] bg-accent transition-all duration-long ease-in-out-flow"
            style={{ width: `${completionRate}%` }}
          />
        </div>
        <div className="mono-meta mt-2 flex gap-md">
          <span className="inline-flex items-center gap-1.5">
            <Check className="w-3 h-3 text-success" strokeWidth={2.5} />
            완료 <span className="text-foreground tabular-nums">{stats.done}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Circle className="w-3 h-3 text-muted-foreground" strokeWidth={1.5} />
            미완료{" "}
            <span className="text-foreground tabular-nums">
              {stats.total - stats.done}
            </span>
          </span>
        </div>
      </div>

      {/* 진행중 + 긴급 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        <Section
          title="진행중인 작업"
          href="/todos"
          seeAllLabel="전체 보기"
        >
          {inProgressItems.length === 0 ? (
            <EmptyRow>진행중인 항목이 없습니다.</EmptyRow>
          ) : (
            <ul className="space-y-2">
              {inProgressItems.slice(0, 5).map((todo) => (
                <li
                  key={todo.id}
                  className="flex items-start gap-sm py-1.5 border-b border-border last:border-b-0"
                >
                  <span className="text-sm leading-snug flex-1 min-w-0 text-foreground">
                    {todo.content}
                  </span>
                  <Tag className="shrink-0">{todo.category}</Tag>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="긴급 항목"
          href="/todos?filter=high"
          seeAllLabel="전체 보기"
          urgent
        >
          {urgentItems.length === 0 ? (
            <EmptyRow>긴급 항목이 없습니다.</EmptyRow>
          ) : (
            <ul className="space-y-2">
              {urgentItems.slice(0, 5).map((todo) => (
                <li
                  key={todo.id}
                  className="flex items-start gap-sm py-1.5 border-b border-border last:border-b-0"
                >
                  <Tag tone="danger" className="shrink-0 mt-0.5">
                    긴급
                  </Tag>
                  <span className="text-sm leading-snug flex-1 min-w-0 text-foreground">
                    {todo.content}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {/* 카테고리 + 최근 완료 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        <Section title="카테고리별 현황">
          {categories.length === 0 ? (
            <EmptyRow>카테고리가 없습니다.</EmptyRow>
          ) : (
            <div className="space-y-sm">
              {categories.map(([cat, { total, done }]) => {
                const rate =
                  total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-foreground">
                        {cat}
                      </span>
                      <span className="mono-meta !normal-case !tracking-snug tabular-nums">
                        {done} / {total}
                      </span>
                    </div>
                    <div className="h-[2px] bg-border-strong/40 w-full">
                      <div
                        className="h-[2px] bg-foreground transition-all duration-long ease-in-out-flow"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="최근 완료">
          {recentDone.length === 0 ? (
            <EmptyRow>완료된 항목이 없습니다.</EmptyRow>
          ) : (
            <ul className="space-y-1.5">
              {recentDone.map((todo) => (
                <li
                  key={todo.id}
                  className="flex items-start gap-sm text-sm leading-snug"
                >
                  <span className="text-muted-foreground text-sm shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-success" strokeWidth={2.5} />
                  </span>
                  <div className="flex-1 min-w-0 flex items-baseline justify-between gap-sm">
                    <span className="truncate text-ink-soft ink-bleed" data-done="true">
                      {todo.content}
                    </span>
                    {todo.doneDate && (
                      <span className="mono-meta !normal-case !tracking-snug text-2xs shrink-0">
                        {todo.doneDate}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}

// ============================================================
// StatTile — 메인 대시보드 전용 큰 수치 타일
// ============================================================
type Tone = "default" | "accent" | "danger" | "success";

function StatTile({
  label,
  value,
  href,
  tone = "default",
}: {
  label: string;
  value: number;
  href: string;
  tone?: Tone;
}) {
  const borderTone =
    tone === "accent"
      ? "border-l-[3px] border-l-accent"
      : tone === "danger"
        ? "border-l-[3px] border-l-danger"
        : tone === "success"
          ? "border-l-[3px] border-l-success"
          : "";

  const valueTone =
    tone === "accent"
      ? "text-accent"
      : tone === "danger"
        ? "text-danger"
        : tone === "success"
          ? "text-success"
          : "text-foreground";

  return (
    <Link
      href={href}
      className={cn(
        "block border border-border bg-surface p-md rounded-sm transition-colors duration-short ease-out-flow hover:border-border-strong",
        borderTone,
        tone !== "default" && "pl-[calc(theme(spacing.md)-2px)]",
      )}
    >
      <p
        className={cn(
          "font-display text-3xl leading-none tabular-nums",
          valueTone,
        )}
      >
        {value}
      </p>
      <p className="mono-meta mt-sm">{label}</p>
    </Link>
  );
}

// ============================================================
// Section — 대시보드 섹션 래퍼
// ============================================================
function Section({
  title,
  children,
  href,
  seeAllLabel,
  urgent,
}: {
  title: string;
  children: React.ReactNode;
  href?: string;
  seeAllLabel?: string;
  urgent?: boolean;
}) {
  return (
    <Card urgent={urgent}>
      <div className="flex items-center justify-between mb-sm pb-2 border-b border-border">
        <h2 className="font-display text-md tracking-tight text-foreground">
          {title}
        </h2>
        {href && seeAllLabel && (
          <Link
            href={href}
            className="mono-meta inline-flex items-center gap-1 hover:text-foreground transition-colors duration-short ease-out-flow"
          >
            {seeAllLabel}
            <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
          </Link>
        )}
      </div>
      {children}
    </Card>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-muted-foreground py-2 leading-relaxed">
      {children}
    </p>
  );
}

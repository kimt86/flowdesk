import Link from "next/link";
import { readTodos } from "@/lib/parsers/todo-parser";
import {
  Circle,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Tag,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  const todos = readTodos();

  const stats = {
    total:      todos.length,
    inProgress: todos.filter((t) => t.status === "in-progress").length,
    blocked:    todos.filter((t) => t.status === "blocked").length,
    done:       todos.filter((t) => t.status === "done").length,
  };

  const completionRate = stats.total > 0
    ? Math.round((stats.done / stats.total) * 100)
    : 0;

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric", weekday: "short",
  });

  const inProgressItems = todos.filter((t) => t.status === "in-progress");
  const urgentItems     = todos.filter((t) => t.priority === "high" && t.status !== "done");

  // 카테고리별 집계
  const categoryMap = new Map<string, { total: number; done: number }>();
  for (const todo of todos) {
    const cat = todo.category;
    if (!categoryMap.has(cat)) categoryMap.set(cat, { total: 0, done: 0 });
    const entry = categoryMap.get(cat)!;
    entry.total++;
    if (todo.status === "done") entry.done++;
  }
  const categories = Array.from(categoryMap.entries())
    .sort((a, b) => b[1].total - a[1].total);

  // 최근 완료 항목
  const recentDone = todos
    .filter((t) => t.status === "done" && t.doneDate)
    .sort((a, b) => (b.doneDate ?? "").localeCompare(a.doneDate ?? ""))
    .slice(0, 8);

  return (
    <div className="p-4 md:p-6 max-w-4xl space-y-6">

      {/* 날짜 */}
      <p className="text-sm text-muted-foreground">{today}</p>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="전체"
          value={stats.total}
          icon={<Circle className="w-4 h-4" />}
          colorClass="text-foreground"
          bgClass="bg-muted"
          href="/todos"
        />
        <StatCard
          label="진행중"
          value={stats.inProgress}
          icon={<Clock className="w-4 h-4" />}
          colorClass="text-blue-600"
          bgClass="bg-blue-50"
          href="/todos?filter=in-progress"
        />
        <StatCard
          label="보류"
          value={stats.blocked}
          icon={<AlertTriangle className="w-4 h-4" />}
          colorClass="text-red-600"
          bgClass="bg-red-50"
          href="/todos?filter=blocked"
        />
        <StatCard
          label="완료"
          value={stats.done}
          icon={<CheckCircle2 className="w-4 h-4" />}
          colorClass="text-green-600"
          bgClass="bg-green-50"
          href="/todos?filter=done"
        />
      </div>

      {/* 완료율 프로그레스 바 */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">전체 완료율</span>
          </div>
          <span className="text-lg font-bold">{completionRate}%</span>
        </div>
        <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${completionRate}%` }}
          />
        </div>
        <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
          <span>&#10003; 완료 {stats.done}</span>
          <span>&#9675; 미완료 {stats.total - stats.done}</span>
        </div>
      </div>

      {/* 진행중 + 긴급 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">진행중인 작업</h2>
            <Link
              href="/todos"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              전체 보기 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {inProgressItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">진행중인 항목이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {inProgressItems.slice(0, 5).map((todo) => (
                <li key={todo.id} className="flex items-start gap-2.5">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <span className="text-sm leading-snug flex-1 min-w-0">{todo.content}</span>
                  <span className="text-xs text-muted-foreground shrink-0 bg-muted px-1.5 py-0.5 rounded">
                    {todo.category}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              긴급 항목
            </h2>
            <Link
              href="/todos?filter=high"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              전체 보기 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {urgentItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">긴급 항목이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {urgentItems.slice(0, 5).map((todo) => (
                <li key={todo.id} className="flex items-start gap-2.5">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  <span className="text-sm leading-snug">{todo.content}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 카테고리별 현황 + 최근 완료 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">카테고리별 현황</h2>
          </div>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">카테고리가 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {categories.map(([cat, { total, done }]) => {
                const rate = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{cat}</span>
                      <span className="text-xs text-muted-foreground">{done}/{total}</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <h2 className="text-sm font-semibold">최근 완료</h2>
          </div>
          {recentDone.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">완료된 항목이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {recentDone.map((todo) => (
                <li key={todo.id} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-snug truncate">{todo.content}</p>
                    {todo.doneDate && (
                      <p className="text-[10px] text-muted-foreground">{todo.doneDate}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon, colorClass, bgClass, href,
}: {
  label: string; value: number; icon: React.ReactNode;
  colorClass: string; bgClass: string; href: string;
}) {
  return (
    <Link href={href} className="bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className={`w-8 h-8 rounded-lg ${bgClass} flex items-center justify-center mb-3 ${colorClass}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </Link>
  );
}

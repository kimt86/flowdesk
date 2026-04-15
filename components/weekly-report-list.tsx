"use client";

import Link from "next/link";
import { User } from "lucide-react";
import type { WorklogMeta } from "@/lib/worklogs";
import { Seal } from "@/components/ui";

export function WeeklyReportList({ reports }: { reports: WorklogMeta[] }) {
  if (reports.length === 0) {
    return (
      <div className="border border-border bg-surface p-xl rounded-sm text-center">
        <p className="font-display text-lg mb-xs">
          작성된 주간 보고서가 없습니다
        </p>
        <p className="mono-meta !normal-case !tracking-snug text-xs text-muted-foreground leading-relaxed">
          work-logs/ 디렉토리에{" "}
          <span className="mono-meta">week-*.md</span> 파일을 추가하면 자동으로
          표시됩니다.
        </p>
      </div>
    );
  }

  // 연도별 그룹핑
  const byYear = new Map<number, WorklogMeta[]>();
  for (const r of reports) {
    if (!byYear.has(r.year)) byYear.set(r.year, []);
    byYear.get(r.year)!.push(r);
  }
  const years = Array.from(byYear.keys()).sort((a, b) => b - a);

  return (
    <div className="space-y-xl">
      {years.map((year) => (
        <section key={year}>
          <h2 className="flex items-baseline justify-between pb-2 border-b border-border mb-sm">
            <span className="font-display text-xl tracking-tight text-foreground">
              {year}
              <span className="text-muted-foreground font-normal text-md ml-2">
                년
              </span>
            </span>
            <span className="mono-meta tabular-nums">
              {byYear.get(year)!.length} 건
            </span>
          </h2>
          <div className="space-y-xs">
            {byYear.get(year)!.map((report) => (
              <Link
                key={report.relPath}
                href={`/weekly/view?path=${encodeURIComponent(report.relPath)}`}
                className="group relative block border border-border bg-surface rounded-sm p-md transition-colors duration-short ease-out-flow hover:border-border-strong"
              >
                {/* 시그니처 Seal — 제출된 보고서의 완결 표식 */}
                <span className="absolute top-3 right-3">
                  <Seal size="md" glyph="週" />
                </span>

                <div className="flex items-start gap-md pr-lg">
                  {/* 주차 넘버 — display font */}
                  <div className="shrink-0 w-12 text-center">
                    <div className="font-display text-2xl leading-none tabular-nums text-foreground">
                      {report.weekNumber}
                    </div>
                    <div className="mono-meta mt-1">WK</div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-snug mb-1">
                      {report.dateRange ||
                        `${report.year}년 ${report.month}월 ${report.weekNumber}주차`}
                    </p>
                    {report.summary && (
                      <p className="text-sm text-ink-soft line-clamp-2 mb-xs leading-relaxed">
                        {report.summary}
                      </p>
                    )}
                    <div className="mono-meta flex flex-wrap items-center gap-md">
                      {report.author && (
                        <span className="inline-flex items-center gap-1">
                          <User className="w-3 h-3" strokeWidth={1.5} />
                          {report.author}
                        </span>
                      )}
                      {report.tags.length > 0 && (
                        <span className="inline-flex flex-wrap items-center gap-1.5 !normal-case !tracking-snug text-xs">
                          {report.tags.slice(0, 4).map((t) => (
                            <span key={t} className="text-accent">
                              #{t}
                            </span>
                          ))}
                          {report.tags.length > 4 && (
                            <span className="text-muted-foreground tabular-nums">
                              +{report.tags.length - 4}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

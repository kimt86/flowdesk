"use client";

import Link from "next/link";
import { CalendarRange, User, Tag, FileText } from "lucide-react";
import type { WorklogMeta } from "@/lib/worklogs";

export function WeeklyReportList({ reports }: { reports: WorklogMeta[] }) {
  if (reports.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <CalendarRange className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">작성된 주간 보고서가 없습니다.</p>
        <p className="text-xs mt-1 text-muted-foreground/60">
          work-logs/ 디렉토리에 week-*.md 파일을 추가하면 자동으로 표시됩니다.
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
    <div className="space-y-8">
      {years.map((year) => (
        <section key={year}>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
            {year}년 <span className="font-normal">· {byYear.get(year)!.length}건</span>
          </h2>
          <div className="space-y-2">
            {byYear.get(year)!.map((report) => (
              <Link
                key={report.relPath}
                href={`/weekly/view?path=${encodeURIComponent(report.relPath)}`}
                className="block bg-card border border-border rounded-lg p-4 hover:border-primary/40 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">W{report.weekNumber}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{report.dateRange || `${report.year}년 ${report.month}월 ${report.weekNumber}주차`}</span>
                    </div>
                    {report.summary && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {report.summary}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                      {report.author && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {report.author}
                        </span>
                      )}
                      {report.tags.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {report.tags.slice(0, 4).join(", ")}
                          {report.tags.length > 4 && ` +${report.tags.length - 4}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <FileText className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Tag, FileText, Calendar, Search } from "lucide-react";
import type { MeetingMeta } from "@/lib/meetings";

export function MeetingList({ meetings }: { meetings: MeetingMeta[] }) {
  const [query, setQuery] = useState("");

  const filtered = query
    ? meetings.filter(
        (m) =>
          m.title.toLowerCase().includes(query.toLowerCase()) ||
          m.attendees.some((a) => a.toLowerCase().includes(query.toLowerCase())) ||
          m.date.includes(query)
      )
    : meetings;

  // 연도별 그룹핑
  const byYear = new Map<number, MeetingMeta[]>();
  for (const m of filtered) {
    if (!byYear.has(m.year)) byYear.set(m.year, []);
    byYear.get(m.year)!.push(m);
  }
  const years = Array.from(byYear.keys()).sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="제목, 참석자 또는 날짜로 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">
            {query ? "검색 결과가 없습니다." : "작성된 회의록이 없습니다."}
          </p>
          {!query && (
            <p className="text-xs mt-1 text-muted-foreground/60">
              meetings/ 디렉토리에 .md 파일을 추가하면 자동으로 표시됩니다.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {years.map((year) => (
            <section key={year}>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
                {year}년 <span className="font-normal">· {byYear.get(year)!.length}건</span>
              </h2>
              <div className="space-y-2">
                {byYear.get(year)!.map((meeting) => (
                  <Link
                    key={meeting.relPath}
                    href={`/meetings/view?path=${encodeURIComponent(meeting.relPath)}`}
                    className="block bg-card border border-border rounded-lg p-4 hover:border-primary/40 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{meeting.title}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            meeting.status === "finalized"
                              ? "bg-green-50 text-green-700"
                              : "bg-yellow-50 text-yellow-700"
                          }`}>
                            {meeting.status === "finalized" ? "완료" : "초안"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{meeting.date}</p>
                        <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                          {meeting.attendees.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {meeting.attendees.slice(0, 3).join(", ")}
                              {meeting.attendees.length > 3 && ` +${meeting.attendees.length - 3}`}
                            </span>
                          )}
                          {meeting.tags.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              {meeting.tags.slice(0, 4).join(", ")}
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
      )}
    </div>
  );
}

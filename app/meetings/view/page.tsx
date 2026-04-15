export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Users, Tag, Pencil } from "lucide-react";
import matter from "gray-matter";
import { readMeetingSafe } from "@/lib/meetings";
import { renderMarkdown } from "@/lib/markdown";

interface PageProps {
  searchParams: { path?: string | string[] };
}

/** 마크다운 테이블 행에서 값 추출 */
function parseTableRow(content: string, key: string): string {
  const regex = new RegExp(`\\|\\s*\\*\\*${key}\\*\\*\\s*\\|\\s*(.+?)\\s*\\|`);
  const match = content.match(regex);
  return match ? match[1].trim() : "";
}

function parseTags(raw: string): string[] {
  const matches = raw.match(/`([^`]+)`/g);
  if (!matches) return [];
  return matches.map((t) => t.replace(/`/g, "").trim());
}

function hasFrontmatter(content: string): boolean {
  return content.trimStart().startsWith("---");
}

export default async function MeetingViewPage({ searchParams }: PageProps) {
  const rawPath = searchParams.path;
  const relPath = Array.isArray(rawPath) ? rawPath[0] : rawPath;

  if (!relPath) {
    redirect("/meetings");
  }

  const raw = readMeetingSafe(relPath);

  if (!raw) {
    return (
      <div className="p-6 max-w-3xl">
        <Link
          href="/meetings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          회의록
        </Link>
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">회의록을 찾을 수 없습니다.</p>
          <p className="text-xs mt-1 font-mono text-muted-foreground/60">{relPath}</p>
        </div>
      </div>
    );
  }

  let title: string;
  let date: string;
  let attendees: string[];
  let tags: string[];
  let markdownContent: string;

  if (hasFrontmatter(raw)) {
    const { data, content } = matter(raw);
    title = String(data.title ?? relPath);
    date = data.date
      ? (data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date))
      : "";
    attendees = Array.isArray(data.attendees) ? data.attendees.map(String) : [];
    tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
    markdownContent = content;
  } else {
    // 마크다운 테이블 형식
    const h1Match = raw.match(/^#\s+회의록\s*[—\-]\s*(.+)/m);
    title = h1Match ? h1Match[1].trim() : (raw.match(/^#\s+(.+)/m)?.[1]?.trim() ?? relPath);
    const dateRaw = parseTableRow(raw, "일시");
    const dateMatch = dateRaw.match(/(\d{4}-\d{2}-\d{2})/);
    date = dateMatch ? dateMatch[1] : dateRaw;
    const attendeesRaw = parseTableRow(raw, "참석자");
    attendees = attendeesRaw ? attendeesRaw.split(/[,、]/).map((s) => s.trim()).filter(Boolean) : [];
    tags = parseTags(parseTableRow(raw, "태그"));
    markdownContent = raw;
  }

  let html = "";
  try {
    html = await renderMarkdown(markdownContent);
  } catch {
    html = `<p class="text-red-500">마크다운 렌더링 중 오류가 발생했습니다.</p>`;
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/meetings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          회의록
        </Link>
        <Link
          href={`/meetings/edit?path=${encodeURIComponent(relPath)}`}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          편집
        </Link>
      </div>

      <div className="mb-6 pb-4 border-b border-border">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <h1 className="text-xl font-bold leading-snug flex-1">{title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {date && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {date}
            </span>
          )}
          {attendees.length > 0 && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {attendees.join(", ")}
            </span>
          )}
        </div>
        {tags.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            <Tag className="w-3 h-3 text-muted-foreground" />
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

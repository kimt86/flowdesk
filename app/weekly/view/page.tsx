import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarRange, User, Tag } from "lucide-react";
import { readWorklogSafe } from "@/lib/worklogs";
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

export default async function WeeklyViewPage({ searchParams }: PageProps) {
  const rawPath = searchParams.path;
  const relPath = Array.isArray(rawPath) ? rawPath[0] : rawPath;

  if (!relPath) {
    redirect("/weekly");
  }

  const raw = readWorklogSafe(relPath);

  if (!raw) {
    return (
      <div className="p-6 max-w-3xl">
        <Link
          href="/weekly"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          주간 보고서
        </Link>
        <div className="text-center py-16 text-muted-foreground">
          <CalendarRange className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">보고서를 찾을 수 없습니다.</p>
          <p className="text-xs mt-1 font-mono text-muted-foreground/60">{relPath}</p>
        </div>
      </div>
    );
  }

  const weekRaw = parseTableRow(raw, "주차");
  const dateRange = parseTableRow(raw, "기간");
  const author = parseTableRow(raw, "작성자");
  const tagsRaw = parseTableRow(raw, "태그");
  const tags = parseTags(tagsRaw);

  let html = "";
  try {
    html = await renderMarkdown(raw);
  } catch {
    html = `<p class="text-red-500">마크다운 렌더링 중 오류가 발생했습니다.</p>`;
  }

  return (
    <div className="p-6 max-w-3xl">
      {/* 뒤로가기 */}
      <Link
        href="/weekly"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        주간 보고서
      </Link>

      {/* 메타데이터 헤더 */}
      <div className="mb-6 pb-4 border-b border-border">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">
              {weekRaw.match(/W\d+/)?.[0] ?? "W?"}
            </span>
          </div>
          <h1 className="text-xl font-bold leading-snug flex-1">{weekRaw || relPath}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {dateRange && (
            <span className="flex items-center gap-1">
              <CalendarRange className="w-3 h-3" />
              {dateRange}
            </span>
          )}
          {author && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {author}
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

      {/* 마크다운 본문 */}
      <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

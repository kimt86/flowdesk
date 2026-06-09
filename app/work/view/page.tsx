export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import matter from "gray-matter";
import { ArrowLeft, Clock, User, FileText, Tag, Pencil, Presentation } from "lucide-react";
import { readWorkSafe } from "@/lib/work";
import { renderMarkdown } from "@/lib/markdown";
import { WorkDeleteButton } from "@/components/work/work-delete-button";
import { MarkdownCopyButton } from "@/components/markdown-copy-button";
import { MarkdownMermaidView } from "@/components/markdown-mermaid-view";

interface PageProps {
  searchParams: { path?: string | string[] };
}

export default async function WorkViewPage({ searchParams }: PageProps) {
  const rawPath = searchParams.path;
  const relPath = Array.isArray(rawPath) ? rawPath[0] : rawPath;

  if (!relPath) {
    redirect("/work");
  }

  const raw = readWorkSafe(relPath);

  if (!raw) {
    return (
      <div className="p-4 md:p-6 max-w-3xl">
        <Link
          href="/work"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          작업
        </Link>
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">파일을 찾을 수 없습니다.</p>
          <p className="text-xs mt-1 font-mono text-muted-foreground/60">{relPath}</p>
        </div>
      </div>
    );
  }

  const { data, content } = matter(raw);
  const toStr = (v: unknown) =>
    v instanceof Date ? v.toISOString().split("T")[0] : String(v ?? "");

  const fileName = relPath.split(/[\\/]/).pop()?.replace(".md", "") ?? "";
  const title = typeof data.title === "string" ? data.title : fileName;
  const author = typeof data.author === "string" ? data.author : "";
  const created = toStr(data.created);
  const updated = toStr(data.updated);
  const tags: string[] = Array.isArray(data.tags) ? data.tags.map(String) : [];

  let html = "";
  try {
    html = await renderMarkdown(content, relPath);
  } catch {
    html = `<p class="text-red-500">마크다운 렌더링 중 오류가 발생했습니다.</p>`;
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/work"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          작업
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/work/present?path=${encodeURIComponent(relPath)}`}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Presentation className="w-3.5 h-3.5" />
            발표
          </Link>
          <Link
            href={`/work/edit?path=${encodeURIComponent(relPath)}`}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            편집
          </Link>
          <MarkdownCopyButton markdown={content} />
          <WorkDeleteButton relPath={relPath} />
        </div>
      </div>

      <div className="mb-6 pb-4 border-b border-border">
        <h1 className="text-xl font-bold leading-snug mb-3">{title}</h1>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {author && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {author}
            </span>
          )}
          {updated && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              수정 {updated}
            </span>
          )}
          {created && created !== updated && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              작성 {created}
            </span>
          )}
          <span className="font-mono opacity-60">{relPath}</span>
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

      <MarkdownMermaidView html={html} />
    </div>
  );
}

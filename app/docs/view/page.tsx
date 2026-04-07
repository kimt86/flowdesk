import { redirect } from "next/navigation";
import Link from "next/link";
import matter from "gray-matter";
import { ArrowLeft, Clock, User, FileText, Tag, Pencil } from "lucide-react";
import { readDocSafe, STATUS_LABELS, STATUS_COLORS } from "@/lib/docs";
import { renderMarkdown } from "@/lib/markdown";
import { DocDeleteButton } from "@/components/docs/doc-delete-button";

interface PageProps {
  searchParams: { path?: string | string[] };
}

export default async function DocViewPage({ searchParams }: PageProps) {
  const rawPath = searchParams.path;
  const relPath = Array.isArray(rawPath) ? rawPath[0] : rawPath;

  if (!relPath) {
    redirect("/docs");
  }

  const raw = readDocSafe(relPath);

  if (!raw) {
    return (
      <div className="p-4 md:p-6 max-w-3xl">
        <Link
          href="/docs"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          문서
        </Link>
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">문서를 찾을 수 없습니다.</p>
          <p className="text-xs mt-1 font-mono text-muted-foreground/60">{relPath}</p>
        </div>
      </div>
    );
  }

  const { data, content } = matter(raw);
  const toStr = (v: unknown) =>
    v instanceof Date ? v.toISOString().split("T")[0] : String(v ?? "");

  const title = typeof data.title === "string" ? data.title : relPath.split("/").pop()?.replace(".md", "") ?? "";
  const status = typeof data.status === "string" ? data.status : "draft";
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
      {/* 뒤로가기 + 액션 버튼 */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/docs"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          문서
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/docs/edit?path=${encodeURIComponent(relPath)}`}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            편집
          </Link>
          <DocDeleteButton relPath={relPath} />
        </div>
      </div>

      {/* 메타데이터 헤더 */}
      <div className="mb-6 pb-4 border-b border-border">
        <div className="flex items-start gap-3 mb-3">
          <h1 className="text-xl font-bold flex-1 leading-snug">{title}</h1>
          <span
            className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${
              STATUS_COLORS[status] ?? "bg-muted text-muted-foreground"
            }`}
          >
            {STATUS_LABELS[status] ?? status}
          </span>
        </div>
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

      {/* 마크다운 본문 */}
      <div
        className="prose"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import matter from "gray-matter";
import { ArrowLeft, FileText, Pencil, Presentation } from "lucide-react";
import { readDocSafe } from "@/lib/docs";
import { renderMarkdown } from "@/lib/markdown";
import { DocDeleteButton } from "@/components/docs/doc-delete-button";
import { MarkdownCopyButton } from "@/components/markdown-copy-button";
import { MarkdownMermaidView } from "@/components/markdown-mermaid-view";
import { DocMetadataEditor } from "@/components/docs/doc-metadata-editor";

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
            href={`/docs/present?path=${encodeURIComponent(relPath)}`}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Presentation className="w-3.5 h-3.5" />
            발표
          </Link>
          <Link
            href={`/docs/edit?path=${encodeURIComponent(relPath)}`}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            편집
          </Link>
          <MarkdownCopyButton markdown={content} />
          <DocDeleteButton relPath={relPath} />
        </div>
      </div>

      <DocMetadataEditor
        relPath={relPath}
        initial={{ title, status, author, tags, created, updated }}
      />

      {/* 마크다운 본문 */}
      <MarkdownMermaidView html={html} />
    </div>
  );
}

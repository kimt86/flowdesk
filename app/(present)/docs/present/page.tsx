export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import matter from "gray-matter";
import { readDocSafe } from "@/lib/docs";
import { renderMarkdown } from "@/lib/markdown";
import { MarkdownPresenter } from "@/components/markdown-presenter";

interface PageProps {
  searchParams: { path?: string | string[] };
}

export default async function DocPresentPage({ searchParams }: PageProps) {
  const rawPath = searchParams.path;
  const relPath = Array.isArray(rawPath) ? rawPath[0] : rawPath;

  if (!relPath) {
    redirect("/docs");
  }

  const raw = readDocSafe(relPath);

  if (!raw) {
    redirect("/docs");
  }

  const { data, content } = matter(raw);
  const toStr = (v: unknown) =>
    v instanceof Date ? v.toISOString().split("T")[0] : String(v ?? "");

  const fileName = relPath.split(/[\\/]/).pop()?.replace(".md", "") ?? "";
  const title = typeof data.title === "string" ? data.title : fileName;

  let html = "";
  try {
    html = await renderMarkdown(content, relPath);
  } catch {
    html = `<p class="text-red-500">마크다운 렌더링 중 오류가 발생했습니다.</p>`;
  }

  return (
    <MarkdownPresenter
      html={html}
      title={title}
      backHref={`/docs/view?path=${encodeURIComponent(relPath)}`}
    />
  );
}

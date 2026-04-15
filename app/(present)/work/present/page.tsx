export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import matter from "gray-matter";
import { readWorkSafe } from "@/lib/work";
import { renderMarkdown } from "@/lib/markdown";
import { MarkdownPresenter } from "@/components/markdown-presenter";

interface PageProps {
  searchParams: { path?: string | string[] };
}

export default async function WorkPresentPage({ searchParams }: PageProps) {
  const rawPath = searchParams.path;
  const relPath = Array.isArray(rawPath) ? rawPath[0] : rawPath;

  if (!relPath) {
    redirect("/work");
  }

  const raw = readWorkSafe(relPath);

  if (!raw) {
    redirect("/work");
  }

  const { data, content } = matter(raw);
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
      backHref={`/work/view?path=${encodeURIComponent(relPath)}`}
    />
  );
}

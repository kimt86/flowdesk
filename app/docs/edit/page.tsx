import { redirect } from "next/navigation";
import matter from "gray-matter";
import { readDocSafe } from "@/lib/docs";
import { DocEditorMilkdownLazy } from "@/components/docs/doc-editor-milkdown-lazy";
import type { DocMetadataInitial } from "@/components/docs/doc-metadata-editor";

interface PageProps {
  searchParams: { path?: string | string[] };
}

export default function DocEditPage({ searchParams }: PageProps) {
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

  const initialMeta: DocMetadataInitial = {
    title:
      typeof data.title === "string"
        ? data.title
        : relPath.split(/[\\/]/).pop()?.replace(".md", "") ?? "",
    status: typeof data.status === "string" ? data.status : "draft",
    author: typeof data.author === "string" ? data.author : "",
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    created: toStr(data.created),
    updated: toStr(data.updated),
  };

  return (
    <DocEditorMilkdownLazy
      relPath={relPath}
      initialBody={content}
      initialMeta={initialMeta}
    />
  );
}

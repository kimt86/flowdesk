import { redirect } from "next/navigation";
import { readDocSafe } from "@/lib/docs";
import { DocEditor } from "@/components/docs/doc-editor";

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

  return <DocEditor relPath={relPath} initialContent={raw} />;
}

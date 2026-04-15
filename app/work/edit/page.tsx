import { redirect } from "next/navigation";
import { readWorkSafe } from "@/lib/work";
import { DocEditor } from "@/components/docs/doc-editor";

interface PageProps {
  searchParams: { path?: string | string[] };
}

export default function WorkEditPage({ searchParams }: PageProps) {
  const rawPath = searchParams.path;
  const relPath = Array.isArray(rawPath) ? rawPath[0] : rawPath;

  if (!relPath) {
    redirect("/work");
  }

  const raw = readWorkSafe(relPath);

  if (!raw) {
    redirect("/work");
  }

  return (
    <DocEditor
      relPath={relPath}
      initialContent={raw}
      saveApiBase="/api/work"
      viewBase="/work/view"
    />
  );
}

import { redirect } from "next/navigation";
import { readMeetingSafe } from "@/lib/meetings";
import { DocEditor } from "@/components/docs/doc-editor";

interface PageProps {
  searchParams: { path?: string | string[] };
}

export default function MeetingEditPage({ searchParams }: PageProps) {
  const rawPath = searchParams.path;
  const relPath = Array.isArray(rawPath) ? rawPath[0] : rawPath;

  if (!relPath) {
    redirect("/meetings");
  }

  const raw = readMeetingSafe(relPath);

  if (!raw) {
    redirect("/meetings");
  }

  return (
    <DocEditor
      relPath={relPath}
      initialContent={raw}
      saveApiBase="/api/meetings/docs"
      viewBase="/meetings/view"
    />
  );
}

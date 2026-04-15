import { listArchivedTodos } from "@/lib/archive";
import { ArchiveBoard } from "@/components/archive/archive-board";

export const dynamic = "force-dynamic";

export default function ArchivePage() {
  const items = listArchivedTodos();
  return <ArchiveBoard initialItems={items} />;
}

export const dynamic = "force-dynamic";

import { getCachedWork } from "@/lib/work";
import { WorkBoard } from "@/components/work/work-board";

export default function WorkPage() {
  const items = getCachedWork();
  return <WorkBoard items={items} />;
}

export const dynamic = "force-dynamic";

import { scanWork } from "@/lib/work";
import { WorkBoard } from "@/components/work/work-board";

export default function WorkPage() {
  const items = scanWork();
  return <WorkBoard items={items} />;
}

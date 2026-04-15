export const dynamic = "force-dynamic";

import { DOCS_ROOT, scanDocs } from "@/lib/docs";
import { WORKSPACE_ROOT } from "@/lib/paths";
import { DocsTracker } from "@/components/docs/docs-tracker";

export default function DocsPage() {
  const docs = scanDocs(DOCS_ROOT, WORKSPACE_ROOT);

  // 전체 고유 태그 목록 (문서 수 내림차순)
  const tagCounts = new Map<string, number>();
  for (const doc of docs) {
    for (const tag of doc.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const allTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);

  return <DocsTracker docs={docs} allTags={allTags} />;
}

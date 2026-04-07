import { Presentation } from "lucide-react";
import { scanPresentations } from "@/lib/presentations";
import { PresentationList } from "@/components/presentation-list";

export default function PresentationsPage() {
  const presentations = scanPresentations();

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Presentation className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">발표자료</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {presentations.length > 0
            ? `총 ${presentations.length}건의 발표자료`
            : "저장된 발표자료"}
        </p>
      </div>
      <PresentationList presentations={presentations} />
    </div>
  );
}

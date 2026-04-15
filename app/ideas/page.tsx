export const dynamic = "force-dynamic";

import { Lightbulb } from "lucide-react";
import { parseIdeas } from "@/lib/ideas";
import { IdeaBoard } from "@/components/idea-board";

export default function IdeasPage() {
  const ideas = parseIdeas();

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Lightbulb className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">아이디어</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {ideas.length > 0
            ? `총 ${ideas.length}건의 아이디어`
            : "아이디어 보드"}
        </p>
      </div>
      <IdeaBoard ideas={ideas} />
    </div>
  );
}

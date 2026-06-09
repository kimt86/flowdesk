export const dynamic = "force-dynamic";

import { Calendar } from "lucide-react";
import { getCachedMeetings } from "@/lib/meetings";
import { MeetingList } from "@/components/meeting-list";

export default function MeetingsPage() {
  const meetings = getCachedMeetings();

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">회의록</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {meetings.length > 0
            ? `총 ${meetings.length}건의 회의록`
            : "저장된 회의록"}
        </p>
      </div>
      <MeetingList meetings={meetings} />
    </div>
  );
}

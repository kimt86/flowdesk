import { CalendarRange } from "lucide-react";
import { getCachedWorklogs } from "@/lib/worklogs";
import { WeeklyReportList } from "@/components/weekly-report-list";

export default function WeeklyPage() {
  const reports = getCachedWorklogs();

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <CalendarRange className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">주간 보고서</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {reports.length > 0
            ? `총 ${reports.length}건의 주간 보고서`
            : "저장된 주간 보고서"}
        </p>
      </div>
      <WeeklyReportList reports={reports} />
    </div>
  );
}

import { readToday } from "@/lib/today";
import { TodayBoard } from "@/components/today/today-board";

export const dynamic = "force-dynamic";

export default function TodayPage() {
  const today = readToday();
  return <TodayBoard initialToday={today} />;
}

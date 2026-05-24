import ScheduleClient from "@/components/ScheduleClient";

export const viewport = { themeColor: "#07060b" };

export const metadata = {
  title: "Schedule — Fly Anime",
  description: "Weekly anime airing schedule and upcoming releases",
};

export default function SchedulePage() {
  return <ScheduleClient />;
}

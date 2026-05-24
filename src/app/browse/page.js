export const dynamic = "force-dynamic";
import BrowseClient from "@/components/BrowseClient";

export const viewport = { themeColor: "#07060b" };
export const metadata = { title: "Browse Anime — Fly Anime" };

export default function BrowsePage() {
  return <BrowseClient />;
}

import WatchClient from "@/components/WatchClient";

export const dynamic = "force-dynamic";
export const viewport = { themeColor: "#07060b" };

export function generateMetadata() {
  return { title: "Watch — Fly Anime" };
}

export default async function WatchPage({ params }) {
  const { id, ep } = await params;
  return <WatchClient animeId={id} epSlug={ep} />;
}

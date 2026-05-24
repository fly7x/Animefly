import AnimeDetailClient from "@/components/AnimeDetailClient";

export const dynamic = "force-dynamic";
export const viewport  = { themeColor: "#07060b" };

export function generateMetadata({ params }) {
  return { title: `Anime — Fly Anime` };
}

export default function AnimeDetailPage({ params }) {
  return <AnimeDetailClient animeId={params.id} />;
}

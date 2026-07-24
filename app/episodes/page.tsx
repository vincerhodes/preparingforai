import type { Metadata } from "next";
import EpisodeCard from "@/components/EpisodeCard";
import PlaceholderNotice from "@/components/PlaceholderNotice";
import { getEpisodes } from "@/lib/episodes";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Episodes",
  description: "Every episode of the show, straight from the podcast feed.",
};

export default async function EpisodesPage() {
  const episodes = await getEpisodes();

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Episodes
      </h1>
      <p className="mt-2 text-muted">
        Every episode, newest first. Press play right here or follow the show
        in your favourite podcast app.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        {episodes.length > 0 ? (
          episodes.map((episode) => (
            <EpisodeCard key={episode.id} episode={episode} />
          ))
        ) : (
          <PlaceholderNotice title="Episodes coming soon">
            The episode feed is not connected yet. Once the Buzzsprout RSS
            URL is added to{" "}
            <code className="rounded bg-background px-1 py-0.5">site.config.ts</code>,
            all episodes will be listed here automatically.
          </PlaceholderNotice>
        )}
      </div>
    </div>
  );
}

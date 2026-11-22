import Image from "next/image";
import Link from "next/link";
import BuzzsproutPlayer from "@/components/BuzzsproutPlayer";
import EpisodeCard from "@/components/EpisodeCard";
import PlaceholderNotice from "@/components/PlaceholderNotice";
import { getAllArticles } from "@/lib/articles";
import { getCatalog, getPredictions } from "@/lib/catalog";
import type { Episode } from "@/lib/episodes";
import { getEpisodes } from "@/lib/episodes";
import type { EpisodeMeta } from "@/lib/types";
import { getListenLinks, site } from "@/site.config";

export const revalidate = 3600;

type HomeEpisode = EpisodeMeta | Episode;

function episodeUrl(episode: HomeEpisode): string {
  if ("slug" in episode && episode.slug) {
    return `${site.url}/episodes/${episode.slug}`;
  }
  return "link" in episode ? episode.link : site.url;
}

function episodeKey(episode: HomeEpisode): string {
  if ("slug" in episode && episode.slug) return episode.slug;
  return "id" in episode ? episode.id : episode.title;
}

export default async function Home() {
  const catalog = getCatalog();
  const [episodes, articles, predictions] = await Promise.all([
    catalog.length > 0 ? Promise.resolve(catalog) : getEpisodes(),
    Promise.resolve(getAllArticles()),
    Promise.resolve(getPredictions()),
  ]);
  const latestEpisodes: HomeEpisode[] = episodes.slice(0, 5);
  const latestArticles = articles.slice(0, 3);
  const listenLinks = getListenLinks();

  const podcastSeriesJsonLd = {
    "@context": "https://schema.org",
    "@type": "PodcastSeries",
    name: site.name,
    description: site.description,
    url: site.url,
    ...(site.rssFeedUrl ? { webFeed: site.rssFeedUrl } : {}),
    author: site.hosts.map((host) => ({
      "@type": "Person",
      name: host.name,
    })),
  };

  const episodesJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: episodes.map((episode, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "PodcastEpisode",
        name: episode.title,
        ...(episode.description ? { description: episode.description } : {}),
        ...(episode.date ? { datePublished: episode.date } : {}),
        url: episodeUrl(episode),
        ...(episode.audioUrl
          ? {
              associatedMedia: {
                "@type": "MediaObject",
                contentUrl: episode.audioUrl,
              },
            }
          : {}),
        partOfSeries: {
          "@type": "PodcastSeries",
          name: site.name,
          url: site.url,
        },
      },
    })),
  };

  return (
    <div className="flex flex-col gap-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(podcastSeriesJsonLd) }}
      />
      {episodes.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(episodesJsonLd) }}
        />
      )}

      <section className="text-center">
        <Image
          src="/cover.jpg"
          alt={`${site.name} cover art`}
          width={160}
          height={160}
          priority
          className="mx-auto mb-6 rounded-2xl border border-border"
        />
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {site.name}
        </h1>
        <p className="mt-3 text-xl text-accent">{site.tagline}</p>
        <p className="mx-auto mt-5 max-w-xl leading-relaxed text-muted">
          {site.description}
        </p>
        {listenLinks.length > 0 && (
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            {listenLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-border bg-surface px-5 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
              >
                Listen on {link.label}
              </a>
            ))}
          </div>
        )}
        <div className="mx-auto mt-8 max-w-xl">
          <BuzzsproutPlayer />
        </div>
      </section>

      <section aria-labelledby="latest-episodes">
        <div className="mb-5 flex items-baseline justify-between">
          <h2 id="latest-episodes" className="text-2xl font-bold text-foreground">
            Latest episodes
          </h2>
          <Link
            href="/episodes"
            className="text-sm text-accent transition-colors hover:text-accent-hover"
          >
            All episodes
          </Link>
        </div>
        {latestEpisodes.length > 0 ? (
          <div className="flex flex-col gap-4">
            {latestEpisodes.map((episode) => (
              <EpisodeCard key={episodeKey(episode)} episode={episode} />
            ))}
          </div>
        ) : (
          <PlaceholderNotice title="Episodes temporarily unavailable">
            The episode feed couldn&apos;t be loaded just now. Please check
            back soon — or listen in your favourite podcast app in the
            meantime.
          </PlaceholderNotice>
        )}
      </section>

      <section aria-labelledby="predictions-mcp">
        <div className="rounded-2xl border border-accent/30 bg-surface p-6 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
            Predictions &amp; MCP
          </p>
          <h2 id="predictions-mcp" className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            Track the forecasts. Wire up your AI.
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Link
              href="/predictions"
              className="rounded-xl border border-border bg-background/60 p-5 transition-colors hover:border-accent/60"
            >
              <p className="text-3xl font-bold tracking-tight text-accent">
                {predictions.length}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                Tracked predictions
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Every forecast Matt and Jimmy have made, with outcomes and
                receipts — updated as each one resolves.
              </p>
              <p className="mt-3 text-sm font-medium text-accent transition-colors hover:text-accent-hover">
                Browse predictions &rarr;
              </p>
            </Link>
            <Link
              href="/mcp"
              className="rounded-xl border border-border bg-background/60 p-5 transition-colors hover:border-accent/60"
            >
              <p className="text-3xl font-bold tracking-tight text-accent">MCP</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                Connect your AI client
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Plug Claude, ChatGPT, or Cursor into the show&apos;s full back
                catalog — episodes, transcripts, stances, and predictions.
              </p>
              <p className="mt-3 text-sm font-medium text-accent transition-colors hover:text-accent-hover">
                Set up the MCP server &rarr;
              </p>
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="latest-articles">
        <div className="mb-5 flex items-baseline justify-between">
          <h2 id="latest-articles" className="text-2xl font-bold text-foreground">
            Latest articles
          </h2>
          <Link
            href="/articles"
            className="text-sm text-accent transition-colors hover:text-accent-hover"
          >
            All articles
          </Link>
        </div>
        {latestArticles.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {latestArticles.map((article) => (
              <li
                key={article.slug}
                className="rounded-lg border border-border bg-surface p-5 transition-colors hover:border-accent/60"
              >
                <Link href={`/articles/${article.slug}`} className="block">
                  <h3 className="text-lg font-semibold text-foreground">
                    {article.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {article.date} · {article.author}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {article.description}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <PlaceholderNotice title="No articles yet">
            Drop a markdown file into{" "}
            <code className="rounded bg-background px-1 py-0.5">content/articles/</code>{" "}
            and it will show up here.
          </PlaceholderNotice>
        )}
      </section>
    </div>
  );
}

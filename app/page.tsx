import Link from "next/link";
import EpisodeCard from "@/components/EpisodeCard";
import PlaceholderNotice from "@/components/PlaceholderNotice";
import { getAllArticles } from "@/lib/articles";
import { getEpisodes } from "@/lib/episodes";
import { getListenLinks, site } from "@/site.config";

export const revalidate = 3600;

export default async function Home() {
  const [episodes, articles] = await Promise.all([
    getEpisodes(),
    Promise.resolve(getAllArticles()),
  ]);
  const latestEpisodes = episodes.slice(0, 5);
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

  return (
    <div className="flex flex-col gap-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(podcastSeriesJsonLd) }}
      />

      <section className="text-center">
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
              <EpisodeCard key={episode.id} episode={episode} />
            ))}
          </div>
        ) : (
          <PlaceholderNotice title="Episodes coming soon">
            The episode feed is not connected yet. Once the Buzzsprout RSS
            URL is added to{" "}
            <code className="rounded bg-background px-1 py-0.5">site.config.ts</code>,
            the latest episodes will appear here automatically.
          </PlaceholderNotice>
        )}
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

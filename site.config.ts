export interface ListenLink {
  label: string;
  href: string;
}

export interface Host {
  name: string;
}

export interface GiscusConfig {
  repo: string;
  repoId: string;
  category: string;
  categoryId: string;
}

export interface SiteConfig {
  name: string;
  tagline: string;
  description: string;
  url: string;
  /** Buzzsprout podcast ID (from the embed code / feed URL). */
  buzzsproutId: string;
  rssFeedUrl: string;
  listenLinks: ListenLink[];
  hosts: Host[];
  giscus: GiscusConfig;
}

export const site: SiteConfig = {
  name: "Preparing for AI",
  tagline: "The AI podcast for everybody",
  description:
    "Matt Cartwright and Jimmy Rhodes explore the human and social impacts of AI — from politics and religion to economics and health. Three seasons in, entering season four.",
  // TODO(podcast): replace with the production domain (drives metadataBase, sitemap, JSON-LD)
  url: "https://example.com",
  buzzsproutId: "2320704",
  rssFeedUrl: "https://feeds.buzzsprout.com/2320704.rss",
  listenLinks: [
    { label: "Buzzsprout", href: "https://www.buzzsprout.com/2320704" },
    // TODO(podcast): paste the Apple Podcasts show URL
    { label: "Apple Podcasts", href: "" },
    // TODO(podcast): paste the Spotify show URL
    { label: "Spotify", href: "" },
    // RSS links directly to the feed once rssFeedUrl is set
    { label: "RSS", href: "" },
  ],
  hosts: [{ name: "Jimmy Rhodes" }, { name: "Matt Cartwright" }],
  giscus: {
    // TODO(podcast): fill in from https://giscus.app after enabling GitHub Discussions
    repo: "",
    repoId: "",
    category: "",
    categoryId: "",
  },
};

/** Resolved listen links: drops empty placeholders, wires RSS to rssFeedUrl. */
export function getListenLinks(): ListenLink[] {
  return site.listenLinks
    .map((link) =>
      link.label === "RSS" && !link.href
        ? { ...link, href: site.rssFeedUrl }
        : link,
    )
    .filter((link) => link.href !== "");
}

/** True once the Buzzsprout feed URL has been filled in. */
export function hasRssFeed(): boolean {
  return site.rssFeedUrl !== "";
}

/** True once all giscus values have been filled in. */
export function hasGiscus(): boolean {
  const { repo, repoId, category, categoryId } = site.giscus;
  return repo !== "" && repoId !== "" && category !== "" && categoryId !== "";
}

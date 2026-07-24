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
  rssFeedUrl: string;
  listenLinks: ListenLink[];
  hosts: Host[];
  giscus: GiscusConfig;
}

export const site: SiteConfig = {
  // TODO(podcast): replace with the real podcast name
  name: "The Podcast",
  // TODO(podcast): replace with the real tagline
  tagline: "Conversations worth your commute",
  // TODO(podcast): replace with the real show description (used for SEO metadata)
  description:
    "A podcast by Jimmy & Matt. Three years in, entering season four — new episodes, articles, and a community forum.",
  // TODO(podcast): replace with the production domain (drives metadataBase, sitemap, JSON-LD)
  url: "https://example.com",
  // TODO(podcast): paste the Buzzsprout RSS feed URL here to enable episodes
  rssFeedUrl: "",
  listenLinks: [
    // TODO(podcast): paste the Buzzsprout show page URL
    { label: "Buzzsprout", href: "" },
    // TODO(podcast): paste the Apple Podcasts show URL
    { label: "Apple Podcasts", href: "" },
    // TODO(podcast): paste the Spotify show URL
    { label: "Spotify", href: "" },
    // RSS links directly to the feed once rssFeedUrl is set
    { label: "RSS", href: "" },
  ],
  hosts: [{ name: "Jimmy" }, { name: "Matt" }],
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

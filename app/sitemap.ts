import type { MetadataRoute } from "next";
import { getAllArticles } from "@/lib/articles";
import { getCatalog } from "@/lib/catalog";
import { site } from "@/site.config";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/episodes",
    "/predictions",
    "/mcp",
    "/articles",
    "/forum",
    "/about",
  ].map((route) => ({
    url: `${site.url}${route}`,
  }));

  const articleRoutes: MetadataRoute.Sitemap = getAllArticles().map(
    (article) => ({
      url: `${site.url}/articles/${article.slug}`,
      lastModified: article.date ? new Date(article.date) : new Date(),
    }),
  );

  const episodeRoutes: MetadataRoute.Sitemap = getCatalog().map((episode) => ({
    url: `${site.url}/episodes/${episode.slug}`,
    lastModified: new Date(episode.date),
  }));

  return [...staticRoutes, ...articleRoutes, ...episodeRoutes];
}

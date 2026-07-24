import type { MetadataRoute } from "next";
import { getAllArticles } from "@/lib/articles";
import { site } from "@/site.config";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/episodes",
    "/articles",
    "/forum",
  ].map((route) => ({
    url: `${site.url}${route}`,
    lastModified: new Date(),
  }));

  const articleRoutes: MetadataRoute.Sitemap = getAllArticles().map(
    (article) => ({
      url: `${site.url}/articles/${article.slug}`,
      lastModified: article.date ? new Date(article.date) : new Date(),
    }),
  );

  return [...staticRoutes, ...articleRoutes];
}

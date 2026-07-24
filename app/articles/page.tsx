import type { Metadata } from "next";
import Link from "next/link";
import PlaceholderNotice from "@/components/PlaceholderNotice";
import { getAllArticles } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Articles",
  description: "Articles and show notes from the hosts.",
};

export default function ArticlesPage() {
  const articles = getAllArticles();

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Articles
      </h1>
      <p className="mt-2 text-muted">
        Longer write-ups, show notes, and announcements from the hosts.
      </p>

      {articles.length > 0 ? (
        <ul className="mt-8 flex flex-col gap-4">
          {articles.map((article) => (
            <li
              key={article.slug}
              className="rounded-lg border border-border bg-surface p-5 transition-colors hover:border-accent/60"
            >
              <Link href={`/articles/${article.slug}`} className="block">
                <h2 className="text-lg font-semibold text-foreground">
                  {article.title}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  <time dateTime={article.date}>{article.date}</time> ·{" "}
                  {article.author}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {article.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8">
          <PlaceholderNotice title="No articles yet">
            Drop a markdown file into{" "}
            <code className="rounded bg-background px-1 py-0.5">content/articles/</code>{" "}
            and it will show up here.
          </PlaceholderNotice>
        </div>
      )}
    </div>
  );
}

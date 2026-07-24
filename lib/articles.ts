import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const articlesDir = path.join(process.cwd(), "content", "articles");

export interface ArticleMeta {
  slug: string;
  title: string;
  date: string;
  author: string;
  description: string;
  tags: string[];
}

export interface Article extends ArticleMeta {
  html: string;
}

function parseArticle(fileName: string): Article {
  const slug = fileName.replace(/\.md$/, "");
  const raw = fs.readFileSync(path.join(articlesDir, fileName), "utf8");
  const { data, content } = matter(raw);

  // gray-matter parses bare YAML dates into Date objects; normalise to YYYY-MM-DD.
  const date =
    data.date instanceof Date
      ? data.date.toISOString().slice(0, 10)
      : String(data.date ?? "");

  return {
    slug,
    title: data.title ?? slug,
    date,
    author: data.author ?? "",
    description: data.description ?? "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    html: marked.parse(content) as string,
  };
}

/** All articles, newest first. */
export function getAllArticles(): ArticleMeta[] {
  if (!fs.existsSync(articlesDir)) return [];

  return fs
    .readdirSync(articlesDir)
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => {
      const { slug, title, date, author, description, tags } =
        parseArticle(fileName);
      return { slug, title, date, author, description, tags };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** A single article with rendered HTML, or null when the slug is unknown. */
export function getArticle(slug: string): Article | null {
  const fileName = `${slug}.md`;
  if (!fs.existsSync(path.join(articlesDir, fileName))) return null;
  return parseArticle(fileName);
}

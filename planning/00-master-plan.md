# Podcast Website — Master Plan

## Context
Podcast running 3 years, entering season 4. Hosts: Jimmy & Matt. Hosted on Vercel.
Buzzsprout RSS feed URL and final branding/domain provided later — everything content-related
lives in ONE central config so gaps can be filled without touching code.

## Stack (already scaffolded)
- Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4, npm, ESLint.
- Extra deps to add: `rss-parser`, `gray-matter`, `marked`, `@giscus/react`.

## Central config
`site.config.ts` at repo root exports a typed `site` object:
- `name`, `tagline`, `description` (placeholders, marked TODO)
- `url` (production domain placeholder `https://example.com` — drives metadataBase/sitemap/JSON-LD)
- `rssFeedUrl` (empty string until Buzzsprout link is provided)
- `listenLinks`: array of { label, href } — Buzzsprout, Apple Podcasts, Spotify, RSS (placeholders)
- `hosts`: [{ name: "Jimmy" }, { name: "Matt" }]
- `giscus`: { repo, repoId, category, categoryId } — empty strings until enabled

## Routes / files
- `app/layout.tsx` — header nav (Home, Episodes, Articles, Forum), footer with listen links,
  full `metadata` export (title template, description, OG, twitter card), fonts.
- `app/page.tsx` — homepage: hero (name/tagline/description), Listen buttons, latest 5 episodes,
  latest 3 articles, JSON-LD `PodcastSeries` script.
- `app/episodes/page.tsx` — all episodes from RSS (`rss-parser`, `export const revalidate = 3600`),
  each with title, date, summary, native `<audio controls>` player. If `rssFeedUrl` empty →
  styled placeholder notice (site still builds/renders).
- `lib/episodes.ts` — feed fetching/parsing helper, typed Episode { id, title, date, description, audioUrl, link }.
- `content/articles/*.md` — markdown articles, frontmatter: `title`, `date` (YYYY-MM-DD),
  `author` (Jimmy | Matt), `description`, optional `tags`. One sample: `season-4-kickoff.md`.
- `lib/articles.ts` — read/parse with `gray-matter`, `getAllArticles()`, `getArticle(slug)`,
  body rendered via `marked`.
- `app/articles/page.tsx` — article index (title, date, author, description).
- `app/articles/[slug]/page.tsx` — `generateStaticParams`, rendered markdown, Article JSON-LD.
  Next 16: `params` is a Promise — `await` it.
- `app/forum/page.tsx` — community blurb + Giscus embed via `@giscus/react` client component
  (`components/Giscus.tsx`, mapping: pathname). Empty giscus config → placeholder notice box.
- `app/sitemap.ts` — static routes + article slugs. `app/robots.ts` — allow all + sitemap ref.
- `app/opengraph-image.tsx` — `ImageResponse` branded OG image (name + tagline, no external assets).
- `app/globals.css` — Tailwind v4 theme (dark slate bg, amber accent), prose-ish styles for
  article markdown (no @tailwindcss/typography dep — hand-style `article` element selectors).
- `components/` — Header, Footer, EpisodeCard, small shared bits.
- Delete default `public/*.svg` placeholders and template content in page/layout.

## Design
Simple, dark, readable. `max-w-3xl` content column, header with podcast name + nav,
amber accent. No images required (works with zero assets).

## SEO checklist
metadataBase, title template, per-page metadata, OG image, JSON-LD (PodcastSeries + Article),
sitemap.ts, robots.ts, semantic HTML (h1 per page), descriptive link text.

## README.md (rewrite)
Sections: (1) what this is; (2) fill-in-gaps checklist — edit `site.config.ts` (name, tagline,
description, url, rssFeedUrl, listen links, giscus); (3) adding an article (copy sample
frontmatter, drop .md in `content/articles/`, git push); (4) enabling the forum — make repo
public, enable GitHub Discussions, install giscus app, copy repo/category IDs into config;
(5) deploy to Vercel — import repo, zero config; (6) custom domain — Vercel dashboard →
Domains, DNS: CNAME `www`/apex to `cname.vercel-dns.com`, if using Cloudflare set
`proxied: false` (orange cloud breaks Vercel TLS); (7) local dev: `npm install && npm run dev`.

## Verification
- `npm run build` must pass. `npm run lint` clean.
- Spot-check: `/`, `/episodes` (placeholder state), `/articles`, `/articles/season-4-kickoff`,
  `/forum` all render.

## Constraints
- No new deps beyond the four listed. No auth, no database. No placeholder `// ...` code.
- All placeholder branding text marked with `TODO(podcast):` comments in site.config.ts.
- Commit on main (local-only repo, no remote yet), Conventional Commits, after green build.

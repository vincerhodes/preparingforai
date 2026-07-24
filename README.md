# Preparing for AI — Podcast Site

Website for **Preparing for AI: The AI Podcast for Everybody** by Matt Cartwright &
Jimmy Rhodes: episodes pulled from the Buzzsprout RSS feed, markdown articles,
and a community forum powered by Giscus (GitHub Discussions). Built with
Next.js 16 (App Router), React 19, TypeScript, and Tailwind CSS v4.

All content lives in ONE file: **`site.config.ts`** at the repo root.

## Fill-in-gaps checklist

Still to fill in `site.config.ts` (marked with `TODO(podcast):` comments):

- [ ] `listenLinks` — Apple Podcasts and Spotify show URLs (Buzzsprout and RSS
      are already wired up)
- [ ] `giscus` — see "Enabling the forum" below

## Adding an article

1. Create a `.md` file in `content/articles/` (the filename becomes the URL
   slug, e.g. `my-post.md` → `/articles/my-post`).
2. Add frontmatter (copy from `content/articles/season-4-kickoff.md`):

   ```yaml
   ---
   title: "My Post"
   date: 2026-07-24        # YYYY-MM-DD
   author: Jimmy           # Jimmy | Matt
   description: "One-sentence summary for SEO and the index page."
   tags:                   # optional
     - some-tag
   ---
   ```

3. Write markdown below the frontmatter.
4. Commit and push — the article appears at `/articles/<slug>` and in the
   sitemap on the next deploy.

## Enabling the forum

The forum uses [Giscus](https://giscus.app) (GitHub Discussions). Until
configured, `/forum` shows a placeholder notice.

1. Make the GitHub repo **public**.
2. Enable **Discussions** on the repo (Settings → Features).
3. Install the [giscus GitHub App](https://github.com/apps/giscus) on the repo.
4. Go to https://giscus.app, enter the repo, choose mapping
   **"Discussion title contains page pathname"**, and pick a category
   (e.g. "General").
5. Copy the `repo`, `repo-id`, `category`, and `category-id` values it
   generates into the `giscus` block of `site.config.ts`.
6. Commit and push — the comment widget replaces the placeholder.

## Deploy to Vercel

Zero configuration required:

1. Push this repo to GitHub.
2. In Vercel: **Add New → Project**, import the repo.
3. Vercel auto-detects Next.js — click **Deploy**.

Every push to `main` redeploys automatically.

## Custom domain

1. Vercel dashboard → your project → **Settings → Domains** → add the domain.
2. At your DNS provider, point the domain at Vercel:
   - `www` (or any subdomain): `CNAME` → `cname.vercel-dns.com`
   - apex/root: `A` → `76.76.21.21` (or `ALIAS`/`ANAME` → `cname.vercel-dns.com`
     if your provider supports it)
3. If you use **Cloudflare** for DNS, the record MUST be **DNS only**
   (`proxied: false` / grey cloud). The orange-cloud proxy breaks Vercel's TLS.
4. Once live, update `url` in `site.config.ts` to the production domain and
   redeploy (this fixes `metadataBase`, sitemap, and JSON-LD URLs).

## Local development

```bash
npm install
npm run dev
```

Then open http://localhost:3000. Useful checks before shipping:

```bash
npm run lint
npm run build
```

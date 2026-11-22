# Preparing for AI — Podcast Site

Website for **Preparing for AI: The AI Podcast for Everybody** by Matt Cartwright &
Jimmy Rhodes: episodes pulled from the Buzzsprout RSS feed, markdown articles,
and a community forum powered by Giscus (GitHub Discussions). Built with
Next.js 16 (App Router), React 19, TypeScript, and Tailwind CSS v4.

All site content lives in ONE file: **`site.config.ts`** at the repo root.

## Overview

- **Episodes** — synced from the Buzzsprout RSS feed, with 74+ transcripts,
  summaries, and tracked predictions (each with status: hit/miss/pending).
- **Articles** — markdown posts in `content/articles/`.
- **Hosted public MCP server** at `/api/mcp` (Model Context Protocol) so Matt
  and listeners can query episodes, predictions, and catalog data from their
  own AI tools. Setup guide for listeners lives at `/mcp`.
- **Forum** — Giscus (GitHub Discussions) on episode and article pages.

## Ongoing episode & predictions workflow

Run from the repo root:

```bash
npm run sync:episodes       # pull new episodes + transcripts from Buzzsprout
npm run prediction:add      # add a new prediction to data/predictions.json
npm run predictions:due     # list predictions due for verification
npm run match:polymarket    # match pending predictions to live Polymarket contracts
```

When a new episode lands via `sync:episodes`, distill it: transcript, summary,
and any predictions Jimmy or Matt make on-air. `match:polymarket` attaches
high-confidence live Polymarket contracts to pending predictions (supports
`--dry-run` for review and `--force` to re-match).

## Hosted MCP server

The site exposes a public MCP endpoint at `https://preparingforai.net/api/mcp`.
Point any MCP-capable client at that URL, or open `/mcp` on the site for a
step-by-step setup guide (for Matt and listeners).

## Local private studio

The `studio/` folder (gitignored) is Jimmy's private prep space: per-episode
cue sheets, voice/stance notes, and prep docs. See `studio/prep/README.md`.

## Adding an article & enabling the forum

**Article:**

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

**Forum (Giscus):**

1. Make the GitHub repo **public**.
2. Enable **Discussions** on the repo (Settings → Features).
3. Install the [giscus GitHub App](https://github.com/apps/giscus) on the repo.
4. Go to https://giscus.app, enter the repo, choose mapping
   **"Discussion title contains page pathname"**, and pick a category
   (e.g. "General").
5. Copy the `repo`, `repo-id`, `category`, and `category-id` values it
   generates into the `giscus` block of `site.config.ts`.
6. Commit and push — the comment widget replaces the placeholder.

## Deploying to Hetzner `apps-1`

The site runs as a standalone Next.js output on the Hetzner `apps-1` box,
served on port `3003` behind Caddy.

1. Build locally:

   ```bash
   npm run build
   ```

2. Assemble the standalone bundle (Next `output: "standalone"`):

   ```bash
   cp -r .next/static .next/standalone/.next/static
   cp -r public .next/standalone/public
   cp -r data .next/standalone/data
   ```

3. Rsync it to the server (the `apps-1` compose service mounts
   `./preparingforai:/app` and runs `node server.js` on port `3003`):

   ```bash
   rsync -az --delete .next/standalone/ apps-1:./preparingforai/
   ```

4. Restart the container on `apps-1`:

   ```bash
   ssh apps-1 'cd ~/server && docker compose up -d --force-recreate preparingforai'
   ```

Caddy routes `https://preparingforai.net` to the container on port `3003`.

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

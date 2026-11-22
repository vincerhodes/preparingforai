<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

## Status & Autonomy
- **Live status:** DEVELOPMENT (last confirmed with Jimmy: 2026-10-20)
- **Autonomy:** full — commit/push/PR/merge without asking when this repo's build/tests are green. If anything looks off → ask Jimmy.
- **Gates before merge:** repo's standard build/test.
- **Notes:** deploys/publishes only if explicitly documented in this file, else confirm with Jimmy first.


This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Podcast Prep & Catalog Workflows

- **Names:** Use `"Jimmy"` and `"Matt"` everywhere. Only `site.config.ts` keeps
  the full name `"Jimmy Rhodes"`.
- **Prepping an episode for Jimmy:**
  1. Read `studio/profile/jimmy-voice-and-stances.md`.
  2. Search `data/catalog.json`, `data/episodes/`, and `data/predictions.json`
     (or query the hosted MCP at `https://preparingforai.net/api/mcp`) for past
     stances, predictions, and episode callbacks.
  3. Do web research for fresh, attributed quotes — every quote needs a full
     name + role, a 1-line summary, the verbatim quote, and a source URL with
     publication/date.
  4. Output BOTH a Markdown cue sheet (`studio/prep/YYYY-MM-DD-<slug>.md` using
     `studio/prep/TEMPLATE_cue_sheet.md`) **and** a self-contained interactive
     local HTML prep webpage (`studio/prep/YYYY-MM-DD-<slug>.html` — always
     give Jimmy the plain-text `file:///...` URL to open in Chrome) with:
     - Clickable segment tabs + built-in 10-minute segment timer (Start/Pause/Reset)
     - Strong takes, 1-line bullet hooks, outcome-first plain-English explainers
       for complex topics, and past episode callbacks (episode title, date,
       `[MM:SS]` timestamp, hit/miss)
     - A Quotes & Research Deck + pinned Quick Name Cheat-Sheet with speaker
       names prominent
     - A dedicated **Show Notes Links** tab with 1-click Copy for Buzzsprout
     - A dedicated **Video Quotes** tab with full extracted quotes when Jimmy
       provides YouTube links (extract via `yt-dlp`)
     - **NEVER include an "Anticipated Matt Pushback" section** — keep on-air
       banter spontaneous.
- **Catalog commands:**
  - `npm run sync:episodes` — pull new episodes from the Buzzsprout RSS feed
  - `npm run predictions:due` — list predictions due for verification
  - `npm run prediction:add` — add a new prediction to `data/predictions.json`

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
  4. Output using `studio/prep/TEMPLATE_cue_sheet.md`: strong takes, 1-line
     bullet hooks, past episode callbacks (episode title, date, `[MM:SS]`
     timestamp, hit/miss), and a Quotes & Research Deck with speaker names
     prominent. **NEVER include an "Anticipated Matt Pushback" section** — keep
     on-air banter spontaneous.
- **Catalog commands:**
  - `npm run sync:episodes` — pull new episodes from the Buzzsprout RSS feed
  - `npm run predictions:due` — list predictions due for verification
  - `npm run prediction:add` — add a new prediction to `data/predictions.json`

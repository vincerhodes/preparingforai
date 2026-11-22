import dns from "node:dns";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

dns.setDefaultResultOrder("ipv4first");

const FEED_URL = "https://rss.buzzsprout.com/2320704.rss";
const DATA_DIR = path.join(process.cwd(), "data");
const EPISODES_DIR = path.join(DATA_DIR, "episodes");
const FORCE = process.argv.includes("--force");
const CONCURRENCY = 6;
const BACKOFF_MS = [1000, 3000, 6000];
const USER_AGENT = "Mozilla/5.0";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fileExists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function fetchText(url, optional = false) {
  let lastError;
  for (let attempt = 0; attempt <= BACKOFF_MS.length; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(45000),
      });
      if (optional && response.status === 404) return null;
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < BACKOFF_MS.length) {
        await sleep(BACKOFF_MS[attempt]);
      }
    }
  }
  throw new Error(`Failed to fetch ${url}: ${lastError?.message ?? lastError}`);
}

async function fetchJson(url) {
  const text = await fetchText(url, true);
  if (text === null || text.trim() === "") return {};
  return JSON.parse(text);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeXml(value = "") {
  return value
    .replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/g, "$1")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function tagContents(xml, tag) {
  const escaped = escapeRegExp(tag);
  return [
    ...xml.matchAll(
      new RegExp(
        `<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}\\s*>`,
        "gi",
      ),
    ),
  ].map((match) => decodeXml(match[1]));
}

function tagContent(xml, tag) {
  return tagContents(xml, tag)[0] ?? "";
}

function tags(xml, tag) {
  return xml.match(new RegExp(`<${escapeRegExp(tag)}\\b[^>]*>`, "gi")) ?? [];
}

function attributes(tag) {
  const result = {};
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(["'])(.*?)\2/g)) {
    result[match[1]] = decodeXml(match[3]);
  }
  return result;
}

function cleanDescription(value) {
  return decodeXml(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mediaUrl(item, tag) {
  for (const element of tags(item, tag)) {
    const attrs = attributes(element);
    if ((attrs.type ?? "").toLowerCase().startsWith("application/json")) {
      return attrs.url ?? "";
    }
  }
  return "";
}

function parseDuration(value) {
  const normalized = value.trim();
  if (!normalized) return 0;
  if (/^\d+(?:\.\d+)?$/.test(normalized)) return Math.round(Number(normalized));
  const parts = normalized.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return 0;
  return Math.round(parts.reduce((total, part) => total * 60 + part, 0));
}

function parseStartTime(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  return parseDuration(String(value ?? ""));
}

function normalizeSpeaker(value) {
  const speaker = String(value ?? "Unknown").trim() || "Unknown";
  if (/jimmy/i.test(speaker)) return "Jimmy";
  if (/matt/i.test(speaker)) return "Matt";
  return speaker;
}

function kebabCase(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueSlug(base, id, usedSlugs) {
  let slug = base.slice(0, 65).replace(/-+$/g, "");
  if (usedSlugs.has(slug)) {
    const suffix = `-${String(id).slice(-10)}`;
    slug = `${base.slice(0, 65 - suffix.length).replace(/-+$/g, "")}${suffix}`;
  }
  let counter = 2;
  const initial = slug;
  while (usedSlugs.has(slug)) {
    const suffix = `-${counter}`;
    slug = `${initial.slice(0, 65 - suffix.length).replace(/-+$/g, "")}${suffix}`;
    counter += 1;
  }
  usedSlugs.add(slug);
  return slug;
}

function extractBuzzsproutId(sources, fallback) {
  for (const source of sources) {
    const match = String(source).match(
      /buzzsprout\.com\/2320704\/(?:episodes\/)?(\d+)/i,
    );
    if (match) return match[1];
  }
  for (const source of sources) {
    const match = String(source).match(/Buzzsprout-(\d+)/i);
    if (match) return match[1];
  }
  return createHash("sha1").update(fallback).digest("hex").slice(0, 12);
}

function classifyFormat(title, description) {
  const text = `${title} ${description}`;
  if (/\bdebate\b|\bversus\b|\bvs\.?\b/i.test(text)) return "debate";
  if (/\bdeep[ -]dive\b/i.test(text)) return "deep-dive";
  if (/\bguest\b|\binterview\b|\bwith\s+[\w]/i.test(text)) return "guest";
  return "special";
}

function classifyEra(season, dateIso, format) {
  if (format === "debate") return "peak";
  const ymd = dateIso.slice(0, 10);
  if (ymd >= "2024-05-14" && ymd <= "2025-07-01") return "peak";
  if (ymd < "2024-05-14" || season === 1) return "early";
  return "recent";
}

function parseFeed(xml) {
  const items = tagContents(xml, "item");
  const usedSlugs = new Set();

  return items.map((item, index) => {
    const title = cleanDescription(tagContent(item, "title")) || "Untitled episode";
    const description = cleanDescription(
      tagContent(item, "description") || tagContent(item, "content:encoded"),
    );
    const published = new Date(tagContent(item, "pubDate"));
    if (Number.isNaN(published.getTime())) {
      throw new Error(`Invalid publication date for ${title}`);
    }
    const date = published.toISOString();
    const enclosure = attributes(tags(item, "enclosure")[0] ?? "");
    const guid = tagContent(item, "guid");
    const link = tagContent(item, "link");
    const transcriptUrl = mediaUrl(item, "podcast:transcript");
    const chaptersUrl = mediaUrl(item, "podcast:chapters");
    const audioUrl = enclosure.url ?? "";
    const id = extractBuzzsproutId(
      [transcriptUrl, chaptersUrl, audioUrl, guid, link],
      `${title}-${date}`,
    );
    const rawSeason = tagContent(item, "itunes:season");
    const season = /^\d+$/.test(rawSeason.trim()) ? Number(rawSeason) : null;
    const shortTitle = kebabCase(title).slice(0, 42).replace(/-+$/g, "");
    const base = `${season === null ? "" : `s${season}-`}${date.slice(0, 10)}-${shortTitle || id}`;

    return {
      slug: uniqueSlug(base, id, usedSlugs),
      buzzsproutId: id,
      title,
      date,
      season,
      durationSec: parseDuration(tagContent(item, "itunes:duration")),
      format: classifyFormat(title, description),
      era: classifyEra(season, date, classifyFormat(title, description)),
      audioUrl,
      buzzsproutUrl: link,
      description,
      transcriptUrl,
      chaptersUrl,
    };
  });
}

function parseChapters(value) {
  const list = Array.isArray(value) ? value : (value.chapters ?? []);
  if (!Array.isArray(list)) return [];
  return list
    .map((chapter, index) => ({
      title: String(chapter.title ?? chapter.name ?? `Chapter ${index + 1}`).trim(),
      startTime: parseStartTime(
        chapter.startTime ?? chapter.start_time ?? chapter.start ?? chapter.time,
      ),
    }))
    .filter((chapter) => Number.isFinite(chapter.startTime))
    .sort((a, b) => a.startTime - b.startTime);
}

function transcriptSegments(value) {
  const root = Array.isArray(value) ? { segments: value } : value;
  const segments =
    root.segments ?? root.words ?? root.transcription?.segments ?? root.transcript?.segments ?? [];
  if (!Array.isArray(segments)) return [];

  return segments.flatMap((segment) => {
    if (!Array.isArray(segment.words) || segment.words.length === 0) {
      return [segment];
    }
    return segment.words.map((word) => ({
      ...word,
      speaker: word.speaker ?? word.speaker_label ?? segment.speaker ?? segment.speaker_label,
    }));
  });
}

function smartJoin(current, next) {
  if (!current) return next;
  if (/^[,.?!;:'’)\]}%]/.test(next)) return `${current}${next}`;
  if (/\w['’]$/.test(current) || /[([{]$/.test(current)) return `${current}${next}`;
  return `${current} ${next}`;
}

function chapterIndexAt(chapters, startTime) {
  let chapterIndex = 0;
  for (let index = 0; index < chapters.length; index += 1) {
    if (chapters[index].startTime <= startTime) chapterIndex = index;
    else break;
  }
  return chapterIndex;
}

function buildTurns(transcript, chapters) {
  const segments = transcriptSegments(transcript)
    .map((segment) => {
      const startTime = Number(
        segment.start ?? segment.startTime ?? segment.start_time ?? segment.from ?? 0,
      );
      const rawEnd = Number(
        segment.end ?? segment.endTime ?? segment.end_time ?? segment.to ?? startTime + 0.4,
      );
      return {
        speaker: normalizeSpeaker(
          segment.speaker ?? segment.speakerName ?? segment.speaker_label ?? segment.name,
        ),
        startTime: Number.isFinite(startTime) ? startTime : 0,
        endTime: Number.isFinite(rawEnd) ? rawEnd : startTime + 0.4,
        text: String(segment.body ?? segment.text ?? segment.word ?? segment.transcript ?? "")
          .replace(/\s+/g, " ")
          .trim(),
      };
    })
    .filter((segment) => segment.text);

  const turns = [];
  let current = null;
  const flush = () => {
    if (!current) return;
    turns.push({
      speaker: current.speaker,
      startTime: current.startTime,
      endTime: current.endTime,
      text: current.text,
      chapterIndex: chapterIndexAt(chapters, current.startTime),
    });
    current = null;
  };

  for (const segment of segments) {
    if (
      current &&
      (current.speaker !== segment.speaker ||
        segment.startTime - current.endTime > 3 ||
        (current.text.length >= 600 && /[.!?]["'’)]?$/.test(current.text)))
    ) {
      flush();
    }

    if (!current) {
      current = { ...segment };
    } else {
      current.text = smartJoin(current.text, segment.text);
      current.endTime = Math.max(current.endTime, segment.endTime);
    }

    if (current.text.length >= 600 && /[.!?]["'’)]?$/.test(current.text)) {
      flush();
    }
  }
  flush();
  return turns;
}

function toMeta(detail) {
  const { chapters, turns, ...meta } = detail;
  return meta;
}

async function processEpisode(source) {
  const filePath = path.join(EPISODES_DIR, `${source.slug}.json`);
  if (!FORCE && (await fileExists(filePath))) {
    const existing = await readJson(filePath);
    if (existing) {
      console.log(`Skipping ${source.slug}`);
      return existing;
    }
  }

  const previous = await readJson(filePath, {});
  const [transcript, chapterData] = await Promise.all([
    source.transcriptUrl ? fetchJson(source.transcriptUrl) : {},
    source.chaptersUrl ? fetchJson(source.chaptersUrl) : {},
  ]);
  const chapters = parseChapters(chapterData);
  const turns = buildTurns(transcript, chapters);
  const { transcriptUrl, chaptersUrl, ...metadata } = source;
  const detail = {
    ...metadata,
    summary: previous.summary ?? source.description,
    keyTalkingPoints: previous.keyTalkingPoints ?? [],
    hostStances: previous.hostStances ?? { jimmy: [], matt: [] },
    format: previous.format ?? source.format,
    era: previous.era ?? source.era,
    predictionIds: previous.predictionIds ?? [],
    speakers: [...new Set(turns.map((turn) => turn.speaker))],
    chapterCount: chapters.length,
    turnCount: turns.length,
    chapters,
    turns,
  };
  await writeJson(filePath, detail);
  console.log(`Synced ${source.slug} (${turns.length} turns)`);
  return detail;
}

async function mapConcurrent(values, concurrency, mapper) {
  const results = new Array(values.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex++;
      results[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => worker()),
  );
  return results;
}

async function main() {
  await mkdir(EPISODES_DIR, { recursive: true });
  const feed = await fetchText(FEED_URL);
  const sources = parseFeed(feed);
  if (sources.length === 0) throw new Error("The Buzzsprout feed contained no episodes");
  console.log(`Found ${sources.length} episodes`);

  const details = await mapConcurrent(sources, CONCURRENCY, processEpisode);
  const rawIndex = details.map(toMeta).sort((a, b) => b.date.localeCompare(a.date));
  const catalogValue = await readJson(path.join(DATA_DIR, "catalog.json"), []);
  const catalog = Array.isArray(catalogValue) ? catalogValue : (catalogValue.episodes ?? []);
  const distilledSlugs = new Set(catalog.map((episode) => episode.slug));
  const pending = rawIndex.filter((episode) => !distilledSlugs.has(episode.slug));

  await writeJson(path.join(DATA_DIR, "raw-index.json"), rawIndex);
  await writeJson(path.join(DATA_DIR, "pending-distillation.json"), pending);
  console.log(`Synced ${rawIndex.length} episodes; ${pending.length} pending distillation`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

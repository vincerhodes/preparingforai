import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const EPISODES_DIR = path.join(DATA_DIR, "episodes");
const DISTILL_DIR = path.join(DATA_DIR, "distill");

async function readJson(filePath, fallback) {
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

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function distillationFiles() {
  try {
    return (await readdir(DISTILL_DIR))
      .filter((file) => /^batch_.*\.json$/.test(file))
      .sort()
      .map((file) => path.join(DISTILL_DIR, file));
  } catch {
    return [];
  }
}

function unpackDistillation(value) {
  const records = [];
  const predictions = [];
  if (Array.isArray(value)) {
    records.push(...value);
  } else if (Array.isArray(value.episodes)) {
    records.push(...value.episodes);
  } else if (value.slug || value.episodeSlug) {
    records.push(value);
  }
  if (!Array.isArray(value) && Array.isArray(value.predictions)) {
    predictions.push(...value.predictions);
  }
  for (const record of records) {
    const recSlug = record.slug ?? record.episodeSlug;
    if (Array.isArray(record.predictions)) {
      for (const p of record.predictions) {
        predictions.push({ episodeSlug: recSlug, ...p });
      }
    }
  }
  return { records, predictions };
}

async function applySpeakerFixes(slug, fixes, rawEpisode) {
  if (!fixes || typeof fixes !== "object") return;
  let fixMap = {};
  if (Array.isArray(fixes)) {
    for (const item of fixes) {
      if (item && typeof item.original === "string" && typeof item.resolved === "string") {
        fixMap[item.original] = item.resolved;
      }
    }
  } else {
    fixMap = fixes;
  }
  if (Object.keys(fixMap).length === 0) return;
  const filePath = path.join(EPISODES_DIR, `${slug}.json`);
  const detail = await readJson(filePath, null);
  if (!detail || !Array.isArray(detail.turns)) return;

  let changed = false;
  detail.turns = detail.turns.map((turn) => {
    const replacement = fixMap[turn.speaker];
    if (typeof replacement !== "string" || !replacement.trim()) return turn;
    changed = true;
    return { ...turn, speaker: replacement.trim() };
  });
  if (!changed) return;

  detail.speakers = [...new Set(detail.turns.map((turn) => turn.speaker))];
  rawEpisode.speakers = detail.speakers;
  await writeJson(filePath, detail);
}

async function main() {
  const rawValue = await readJson(path.join(DATA_DIR, "raw-index.json"), []);
  const rawIndex = Array.isArray(rawValue) ? rawValue : (rawValue.episodes ?? []);
  const rawBySlug = new Map(rawIndex.map((episode) => [episode.slug, episode]));
  const distilled = new Map();
  const generatedPredictions = [];

  for (const filePath of await distillationFiles()) {
    const value = await readJson(filePath, null);
    if (!value) continue;
    const { records, predictions } = unpackDistillation(value);
    generatedPredictions.push(...predictions);
    for (const record of records) {
      const slug = record.slug ?? record.episodeSlug;
      if (!slug || !rawBySlug.has(slug)) continue;
      distilled.set(slug, record);
      await applySpeakerFixes(slug, record.speakerFixes, rawBySlug.get(slug));
    }
  }

  const predictionIds = new Map();
  const existingValue = await readJson(path.join(DATA_DIR, "predictions.json"), []);
  const existing = Array.isArray(existingValue)
    ? existingValue
    : (existingValue.predictions ?? []);
  const existingById = new Map(existing.map((prediction) => [prediction.id, prediction]));
  const mergedPredictions = new Map(existing.map((prediction) => [prediction.id, prediction]));

  for (const prediction of generatedPredictions) {
    const episodeSlug = prediction.episodeSlug ?? prediction.slug;
    const episode = rawBySlug.get(episodeSlug);
    if (!episode) continue;
    const id =
      prediction.id ??
      `${episodeSlug}-${Number(prediction.timestampSec ?? 0)}-${slugify(prediction.claim)}`;
    const generated = {
      ...prediction,
      id,
      episodeSlug,
      episodeTitle: prediction.episodeTitle ?? episode.title,
      episodeDate: prediction.episodeDate ?? episode.date,
    };
    const previous = existingById.get(id);
    if (previous) {
      for (const field of [
        "status",
        "outcomeSummary",
        "evidenceUrl",
        "verifiedAt",
        "polymarket",
      ]) {
        if (Object.hasOwn(previous, field)) generated[field] = previous[field];
      }
    }
    mergedPredictions.set(id, generated);
  }

  for (const prediction of mergedPredictions.values()) {
    const ids = predictionIds.get(prediction.episodeSlug) ?? [];
    if (!ids.includes(prediction.id)) ids.push(prediction.id);
    predictionIds.set(prediction.episodeSlug, ids);
  }

  const catalog = rawIndex.map((raw) => {
    const record = distilled.get(raw.slug) ?? {};
    return {
      ...raw,
      ...(record.description === undefined ? {} : { description: record.description }),
      ...(record.summary === undefined ? {} : { summary: record.summary }),
      ...(record.keyTalkingPoints === undefined
        ? {}
        : { keyTalkingPoints: record.keyTalkingPoints }),
      ...(record.hostStances === undefined ? {} : { hostStances: record.hostStances }),
      ...(record.format === undefined ? {} : { format: record.format }),
      ...(record.era === undefined ? {} : { era: record.era }),
      speakers: raw.speakers,
      predictionIds: predictionIds.get(raw.slug) ?? [],
    };
  });

  catalog.sort((a, b) => b.date.localeCompare(a.date));
  const predictions = [...mergedPredictions.values()].sort(
    (a, b) => b.episodeDate.localeCompare(a.episodeDate) || a.timestampSec - b.timestampSec,
  );
  const pending = rawIndex.filter((episode) => !distilled.has(episode.slug));

  await writeJson(path.join(DATA_DIR, "catalog.json"), catalog);
  for (const meta of catalog) {
    const epPath = path.join(EPISODES_DIR, `${meta.slug}.json`);
    const detail = await readJson(epPath, null);
    if (detail) {
      await writeJson(epPath, { ...detail, ...meta });
    }
  }
  await writeJson(path.join(DATA_DIR, "predictions.json"), predictions);
  await writeJson(path.join(DATA_DIR, "pending-distillation.json"), pending);
  console.log(
    `Merged ${distilled.size} distilled episodes and ${predictions.length} predictions; ${pending.length} pending`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

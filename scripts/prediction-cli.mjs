import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const PREDICTIONS_FILE = path.join(DATA_DIR, "predictions.json");

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

function localToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
}

function parseFlags(args) {
  const flags = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) throw new Error(`Unexpected argument: ${arg}`);
    const equals = arg.indexOf("=");
    if (equals >= 0) {
      flags[arg.slice(2, equals)] = arg.slice(equals + 1);
    } else {
      const key = arg.slice(2);
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for --${key}`);
      flags[key] = value;
      index += 1;
    }
  }
  return flags;
}

function required(flags, name) {
  const value = flags[name];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing required flag --${name}`);
  }
  return value.trim();
}

async function loadPredictions() {
  const value = await readJson(PREDICTIONS_FILE, []);
  return Array.isArray(value) ? value : (value.predictions ?? []);
}

async function due() {
  const today = localToday();
  const predictions = (await loadPredictions())
    .filter(
      (prediction) =>
        prediction.status === "pending" &&
        prediction.targetDate &&
        prediction.targetDate <= today,
    )
    .sort(
      (a, b) =>
        a.targetDate.localeCompare(b.targetDate) ||
        a.episodeSlug.localeCompare(b.episodeSlug) ||
        a.timestampSec - b.timestampSec,
    );

  if (predictions.length === 0) {
    console.log("No predictions due.");
    return;
  }
  for (const prediction of predictions) {
    console.log(
      `${prediction.id}\t${prediction.targetDate}\t${prediction.episodeSlug}\t${prediction.host}\t${prediction.claim}`,
    );
  }
}

async function add(args) {
  const flags = parseFlags(args);
  const episodeSlug = required(flags, "episode");
  const rawValue = await readJson(path.join(DATA_DIR, "raw-index.json"), []);
  const rawIndex = Array.isArray(rawValue) ? rawValue : (rawValue.episodes ?? []);
  const episode = rawIndex.find((value) => value.slug === episodeSlug);
  if (!episode) throw new Error(`Unknown episode: ${episodeSlug}`);

  const timestampSec = Number(required(flags, "timestamp"));
  if (!Number.isFinite(timestampSec) || timestampSec < 0) {
    throw new Error("--timestamp must be a non-negative number");
  }
  const category = required(flags, "category");
  if (category !== "dated" && category !== "open-ended") {
    throw new Error("--category must be dated or open-ended");
  }
  const targetDate = flags["target-date"]?.trim();
  if (targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    throw new Error("--target-date must use YYYY-MM-DD");
  }

  const claim = required(flags, "claim");
  const claimSlug = slugify(claim);
  if (!claimSlug) throw new Error("--claim must contain letters or numbers");
  const id = `${episodeSlug}-${timestampSec}-${claimSlug}`;
  const predictions = await loadPredictions();
  if (predictions.some((prediction) => prediction.id === id)) {
    throw new Error(`Prediction already exists: ${id}`);
  }

  const topics = (flags.topics ?? "")
    .split(",")
    .map((topic) => topic.trim())
    .filter(Boolean);
  predictions.push({
    id,
    episodeSlug,
    episodeTitle: episode.title,
    episodeDate: episode.date,
    timestampSec,
    host: required(flags, "host"),
    claim,
    quote: required(flags, "quote"),
    category,
    ...(targetDate ? { targetDate } : {}),
    timeframeLabel: required(flags, "timeframe"),
    status: "pending",
    topics,
  });
  await writeJson(PREDICTIONS_FILE, predictions);
  console.log(`Added ${id}`);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === "due" && args.length === 0) {
    await due();
    return;
  }
  if (command === "add") {
    await add(args);
    return;
  }
  throw new Error("Usage: prediction-cli.mjs due | add --episode <slug> ...");
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exitCode = 1;
});

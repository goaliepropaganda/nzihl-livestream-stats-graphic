import axios from "axios";
import * as cheerio from "cheerio";
import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { BASE_URL, GOALIE_DATA_FILE, GOALIE_STATS_URL, OUTPUT_DIR, REQUEST_HEADERS } from "./config.js";
import { ensureDir, normalizeHeader } from "./utils.js";

const REQUIRED_COLUMNS = ["GOALIE", "TEAM", "GP", "W", "L", "GAA", "SV%"];

function cleanTeamName(rawTeam) {
  const cleaned = String(rawTeam)
    .replace(/[A-Z]{2,4}$/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (/^canterbury red devils$/i.test(cleaned)) {
    return "Red Devils";
  }

  return cleaned;
}

function toSentenceCaseIfLower(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) {
    return "";
  }

  if (text !== text.toLowerCase()) {
    return text;
  }

  return text
    .toLowerCase()
    .replace(/(^|\s|[-'])([a-z])/g, (_, prefix, char) => `${prefix}${char.toUpperCase()}`);
}

function parseBackgroundImageUrl(style) {
  const match = String(style || "").match(/background-image\s*:\s*url\(([^)]+)\)/i);
  if (!match) {
    return null;
  }

  const rawUrl = match[1].trim().replace(/^['\"]|['\"]$/g, "");
  if (!rawUrl) {
    return null;
  }

  return new URL(rawUrl, BASE_URL).toString();
}

async function fetchProfileImage(profileUrl) {
  const { data } = await axios.get(profileUrl, {
    headers: REQUEST_HEADERS,
    timeout: 20000
  });
  const $ = cheerio.load(data);
  const headshot = $("div.largeHeadshot.rounded-circle.m-3").first();
  return parseBackgroundImageUrl(headshot.attr("style"));
}

function getTableColumnMap($table) {
  const map = new Map();
  $table.find("thead tr th").each((index, element) => {
    const header = normalizeHeader(cheerio.load(element).text());
    if (header) {
      map.set(header, index);
    }
  });

  if (map.size === 0) {
    $table.find("tr").first().find("th,td").each((index, element) => {
      const header = normalizeHeader(cheerio.load(element).text());
      if (header) {
        map.set(header, index);
      }
    });
  }

  return map;
}

function findGoalieTable($) {
  const tables = $("table").toArray();

  for (const table of tables) {
    const $table = $(table);
    const map = getTableColumnMap($table);
    const hasColumns = REQUIRED_COLUMNS.every((col) => map.has(col));

    if (hasColumns) {
      return { $table, map };
    }
  }

  throw new Error("Could not find the goalie stats table with required columns.");
}

function getCellText(cells, index) {
  const cell = cells[index];
  if (!cell) {
    return "";
  }

  return cheerio.load(cell).text().replace(/\s+/g, " ").trim();
}

export async function scrapeTopGoalies() {
  const { data } = await axios.get(GOALIE_STATS_URL, {
    headers: REQUEST_HEADERS,
    timeout: 20000
  });
  const $ = cheerio.load(data);
  const { $table, map } = findGoalieTable($);

  const rows = [];
  const rowCandidates = $table.find("tbody tr").toArray();

  for (const row of rowCandidates) {
    const cells = $(row).find("td").toArray();
    if (!cells.length) {
      continue;
    }

    const goalieCellIndex = map.get("GOALIE");
    if (goalieCellIndex === undefined) {
      continue;
    }

    const goalieCell = cells[goalieCellIndex];
    const goalieAnchor = cheerio.load(goalieCell)("a").first();
    const rawName = goalieAnchor.attr("title")?.trim() || goalieAnchor.text().trim();

    if (!rawName) {
      continue;
    }

    const href = goalieAnchor.attr("href");
    const profileUrl = href ? new URL(href, BASE_URL).toString() : null;

    const rowRank = Number.parseInt(getCellText(cells, 0), 10);

    rows.push({
      rank: Number.isFinite(rowRank) ? rowRank : rows.length + 1,
      name: toSentenceCaseIfLower(rawName),
      team: cleanTeamName(getCellText(cells, map.get("TEAM"))),
      gp: getCellText(cells, map.get("GP")),
      w: getCellText(cells, map.get("W")),
      l: getCellText(cells, map.get("L")),
      gaa: getCellText(cells, map.get("GAA")),
      svPct: getCellText(cells, map.get("SV%")),
      profileUrl,
      imageUrl: null
    });
  }

  const topGoalies = rows
    .sort((left, right) => left.rank - right.rank)
    .slice(0, 10);

  for (const goalie of topGoalies) {
    if (!goalie.profileUrl) {
      continue;
    }

    try {
      goalie.imageUrl = await fetchProfileImage(goalie.profileUrl);
    } catch (error) {
      console.warn(`Unable to fetch profile image for ${goalie.name}: ${error.message}`);
    }
  }

  const payload = {
    sourceUrl: GOALIE_STATS_URL,
    generatedAt: new Date().toISOString(),
    goalies: topGoalies
  };

  await ensureDir(OUTPUT_DIR);
  await writeFile(GOALIE_DATA_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  return payload;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  scrapeTopGoalies()
    .then((payload) => {
      console.log(`Saved ${payload.goalies.length} goalies to ${GOALIE_DATA_FILE}`);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

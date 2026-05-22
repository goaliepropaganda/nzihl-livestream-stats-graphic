import axios from "axios";
import * as cheerio from "cheerio";
import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import {
  OUTPUT_DIR,
  REQUEST_HEADERS,
  WOMENS_BASE_URL,
  WOMENS_DATA_FILE,
  WOMENS_STATS_URL
} from "./config.js";
import { ensureDir, normalizeHeader } from "./utils.js";

const REQUIRED_COLUMNS = ["PLAYER", "POS", "TEAM", "GP", "G", "A", "PTS", "P/G", "+/-"];

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

function parseBackgroundImageUrl(style) {
  const match = String(style || "").match(/background-image\s*:\s*url\(([^)]+)\)/i);
  if (!match) {
    return null;
  }

  const rawUrl = match[1].trim().replace(/^['\"]|['\"]$/g, "");
  if (!rawUrl) {
    return null;
  }

  return new URL(rawUrl, WOMENS_BASE_URL).toString();
}

function getPlayerIdFromUrl(profileUrl) {
  try {
    const url = new URL(profileUrl);
    return url.searchParams.get("playerID") || url.searchParams.get("playerid");
  } catch {
    return null;
  }
}

function normalizeInlineName(html) {
  if (!html) {
    return "";
  }

  const withSpaces = html.replace(/<br\s*\/?\s*>/gi, " ");
  const text = cheerio.load(`<div>${withSpaces}</div>`)("div").text();
  return text.replace(/\s+/g, " ").trim();
}

function toDisplayName(value) {
  const words = String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  return words
    .map((word) => {
      if (word.length <= 2 && word === word.toUpperCase()) {
        return word;
      }

      return word
        .toLowerCase()
        .replace(/(^|[-'])([a-z])/g, (_, prefix, char) => `${prefix}${char.toUpperCase()}`);
    })
    .join(" ");
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

function findScoringTable($) {
  const tables = $("table").toArray();

  for (const table of tables) {
    const $table = $(table);
    const map = getTableColumnMap($table);
    const hasColumns = REQUIRED_COLUMNS.every((col) => map.has(col));

    if (hasColumns) {
      return { $table, map };
    }
  }

  throw new Error("Could not find the NZWIHL scoring leaders table with required columns.");
}

function getCellText(cells, index) {
  const cell = cells[index];
  if (!cell) {
    return "";
  }

  return cheerio.load(cell).text().replace(/\s+/g, " ").trim();
}

async function fetchProfileDetails(profileUrl) {
  const { data } = await axios.get(profileUrl, {
    headers: REQUEST_HEADERS,
    timeout: 20000
  });
  const $ = cheerio.load(data);
  const headshot = $("div.largeHeadshot.rounded-circle.m-3").first();
  const imageUrl = parseBackgroundImageUrl(headshot.attr("style"));

  const profileName = $("p.h2 span.font-weight-bold").first().text().trim();
  let fullName = profileName ? toDisplayName(profileName) : "";
  const playerId = getPlayerIdFromUrl(profileUrl);

  if (!fullName && playerId) {
    const matchingLink = $(`a[href*="playerid=${playerId}"]`).first();
    fullName = normalizeInlineName(matchingLink.html());
  }

  if (!fullName) {
    const selectedPlayer = $("#playerID option[selected]").first().text();
    fullName = selectedPlayer.replace(/\s+/g, " ").trim();
  }

  return {
    imageUrl,
    fullName
  };
}

export async function scrapeWomensTop10() {
  const { data } = await axios.get(WOMENS_STATS_URL, {
    headers: REQUEST_HEADERS,
    timeout: 20000
  });
  const $ = cheerio.load(data);
  const { $table, map } = findScoringTable($);

  const rows = [];
  const bodyRows = $table.find("tbody tr").toArray();
  const rowCandidates = bodyRows.length > 0 ? bodyRows : $table.find("tr").slice(1).toArray();

  for (const row of rowCandidates) {
    const cells = $(row).find("td").toArray();
    if (!cells.length) {
      continue;
    }

    const rank = Number.parseInt(getCellText(cells, 0), 10);
    const playerCellIndex = map.get("PLAYER");

    if (!Number.isFinite(rank) || playerCellIndex === undefined) {
      continue;
    }

    const playerCell = cells[playerCellIndex];
    const playerAnchor = cheerio.load(playerCell)("a").first();
    const name = playerAnchor.text().trim();

    if (!name) {
      continue;
    }

    const href = playerAnchor.attr("href");
    const profileUrl = href ? new URL(href, WOMENS_BASE_URL).toString() : null;

    rows.push({
      rank,
      name,
      position: getCellText(cells, map.get("POS")),
      team: cleanTeamName(getCellText(cells, map.get("TEAM"))),
      gp: getCellText(cells, map.get("GP")),
      g: getCellText(cells, map.get("G")),
      a: getCellText(cells, map.get("A")),
      pts: getCellText(cells, map.get("PTS")),
      pPerGame: getCellText(cells, map.get("P/G")),
      plusMinus: getCellText(cells, map.get("+/-")),
      profileUrl,
      imageUrl: null
    });
  }

  const top10 = rows
    .sort((left, right) => left.rank - right.rank)
    .slice(0, 10);

  for (const player of top10) {
    if (!player.profileUrl) {
      continue;
    }

    try {
      const details = await fetchProfileDetails(player.profileUrl);
      if (details.fullName) {
        player.name = details.fullName;
      }
      player.imageUrl = details.imageUrl;
    } catch (error) {
      console.warn(`Unable to fetch profile image for ${player.name}: ${error.message}`);
    }
  }

  const payload = {
    sourceUrl: WOMENS_STATS_URL,
    generatedAt: new Date().toISOString(),
    players: top10
  };

  await ensureDir(OUTPUT_DIR);
  await writeFile(WOMENS_DATA_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  return payload;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  scrapeWomensTop10()
    .then((payload) => {
      console.log(`Saved ${payload.players.length} players to ${WOMENS_DATA_FILE}`);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

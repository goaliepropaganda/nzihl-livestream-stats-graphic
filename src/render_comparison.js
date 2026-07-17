import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import xlsx from "xlsx";
import { Jimp } from "jimp";
import { Resvg } from "@resvg/resvg-js";
import { TEAM_COMPARISON_IMAGE_FILE, TEAM_COMPARISON_SOURCE_FILE, OUTPUT_DIR } from "./config.js";
import { applyInvisibleRunMarker, clampText, ensureDir, escapeXml } from "./utils.js";

const WIDTH = 1920;
const HEIGHT = 1080;
const MARGIN = 52;
const CARD_GAP = 24;
const HEADER_HEIGHT = 128;
const FOOTER_HEIGHT = 34;
const PANEL = {
  x: MARGIN,
  y: MARGIN,
  w: WIDTH - MARGIN * 2,
  h: HEIGHT - MARGIN * 2,
  r: 28
};

const TEAM_ACCENT = { main: "#4DB4FF", soft: "#1D3557" };

const COLORS = {
  bg: "#08111A",
  bg2: "#0B1724",
  panel: "#0E131A",
  panelAlt: "#0B1016",
  grid: "rgba(255, 255, 255, 0.09)",
  line: "rgba(255, 255, 255, 0.12)",
  text: "#F1F4F8",
  sub: "#B8C0CB",
  dim: "#7F8894",
  accent: "#FFCD3C",
  toiTrack: "#132236",
  toiFill: "#2A6DA3",
  rowA: "#141922",
  rowB: "#10151D",
  pill: "#1E2633",
  chip: "#162131",
  chipLine: "rgba(255, 255, 255, 0.1)"
};

const SECTION_HEIGHT = 340;
const SECTION_ROW_HEIGHT = 54;
const SECTION_ROW_GAP = 6;

function parseNumber(value) {
  const raw = String(value ?? "").replace(/[^0-9.-]/g, "");
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatOneDecimal(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "0.0";
}

function average(values) {
  const numericValues = values.filter((value) => Number.isFinite(value));
  if (numericValues.length === 0) {
    return 0;
  }

  return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
}

function parseWorkbook() {
  const workbook = xlsx.readFile(TEAM_COMPARISON_SOURCE_FILE);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  const players = [];
  for (const row of rows.slice(1)) {
    const team = String(row[0] ?? "").trim();
    const position = String(row[1] ?? "").trim();
    const rank = Number.parseInt(row[2], 10);
    const player = String(row[3] ?? "").trim();

    if (!team || !position || !Number.isFinite(rank) || !player) {
      continue;
    }

    players.push({
      team,
      position,
      rank,
      player,
      avgToi: parseNumber(row[4]),
      shiftsPerGame: parseNumber(row[5]),
      medianShift: parseNumber(row[6])
    });
  }

  const teams = [];
  const teamMap = new Map();

  for (const player of players) {
    let team = teamMap.get(player.team);
    if (!team) {
      team = {
        name: player.team,
        accent: TEAM_ACCENT,
        players: [],
        sections: []
      };
      teamMap.set(player.team, team);
      teams.push(team);
    }

    team.players.push(player);
  }

  for (const team of teams) {
    const grouped = new Map();

    for (const player of team.players) {
      if (!grouped.has(player.position)) {
        grouped.set(player.position, []);
      }

      grouped.get(player.position).push(player);
    }

    team.sections = ["Forward", "Defence"]
      .filter((position) => grouped.has(position))
      .map((position) => {
        const sectionPlayers = grouped.get(position).slice().sort((left, right) => left.rank - right.rank);
        return {
          position,
          players: sectionPlayers,
          avgToi: average(sectionPlayers.map((player) => player.avgToi)),
          avgShifts: average(sectionPlayers.map((player) => player.shiftsPerGame)),
          avgMedianShift: average(sectionPlayers.map((player) => player.medianShift))
        };
      });

    team.avgToi = average(team.players.map((player) => player.avgToi));
    team.avgShifts = average(team.players.map((player) => player.shiftsPerGame));
    team.avgMedianShift = average(team.players.map((player) => player.medianShift));
  }

  return {
    generatedAt: new Date().toISOString(),
    teams,
    maxToi: Math.max(...players.map((player) => player.avgToi || 0), 1)
  };
}

function buildMetricChip(x, y, width, text, accent, subtitle = "") {
  const hasSubtitle = Boolean(subtitle);
  return [
    `<rect x="${x}" y="${y}" width="${width}" height="54" rx="16" ry="16" fill="${COLORS.chip}" stroke="${COLORS.chipLine}"/>`,
    `<text x="${x + width / 2}" y="${hasSubtitle ? y + 24 : y + 35}" text-anchor="middle" fill="${accent}" font-size="16" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700">${escapeXml(text)}</text>`,
    hasSubtitle
      ? `<text x="${x + width / 2}" y="${y + 42}" text-anchor="middle" fill="${COLORS.sub}" font-size="10" font-family="DejaVu Sans, Arial, sans-serif" font-weight="600">${escapeXml(subtitle)}</text>`
      : ""
  ].join("");
}

function buildSectionHeader(x, y, width, section) {
  const title = section.position === "Forward" ? "Forwards" : section.position;
  return [
    `<rect x="${x}" y="${y}" width="${width}" height="28" rx="10" ry="10" fill="rgba(255,255,255,0.04)" stroke="${COLORS.grid}"/>`,
    `<text x="${x + 14}" y="${y + 19}" fill="${COLORS.text}" font-size="18" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700">${escapeXml(title)}</text>`,
    `<text x="${x + width - 14}" y="${y + 19}" text-anchor="end" fill="${COLORS.sub}" font-size="13" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700">AVG ${formatOneDecimal(section.avgToi)} MIN</text>`
  ].join("");
}

function buildPlayerRow(team, player, index, x, y, width, maxToi) {
  const rowFill = index % 2 === 0 ? COLORS.rowA : COLORS.rowB;
  const teamAccent = team.accent.main;
  const toiWidth = Math.max(24, Math.round((Math.max(player.avgToi || 0, 0) / maxToi) * 170));
  const shiftValue = Number.isFinite(player.shiftsPerGame) ? player.shiftsPerGame : 0;
  const medianValue = Number.isFinite(player.medianShift) ? player.medianShift : 0;
  const rowTop = y;
  const rowMid = rowTop + SECTION_ROW_HEIGHT / 2;
  const name = clampText(player.player, 24);

  const shiftsBadgeWidth = 116;
  const secsBadgeWidth = 74;
  const badgeGap = 10;
  const rightInset = 2;
  const secsBadgeX = x + width - secsBadgeWidth - rightInset;
  const shiftsBadgeX = secsBadgeX - badgeGap - shiftsBadgeWidth;

  return [
    `<rect x="${x}" y="${rowTop}" width="${width}" height="${SECTION_ROW_HEIGHT}" rx="14" ry="14" fill="${rowFill}"/>`,
    `<rect x="${x + 22}" y="${rowMid - 15}" width="30" height="30" rx="10" ry="10" fill="${COLORS.pill}" stroke="${teamAccent}" stroke-width="1.5"/>`,
    `<text x="${x + 37}" y="${rowMid + 7}" text-anchor="middle" fill="${COLORS.text}" font-size="18" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700">${player.rank}</text>`,
    `<text x="${x + 70}" y="${rowMid + 7}" fill="${COLORS.text}" font-size="22" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700">${escapeXml(name)}</text>`,
    `<rect x="${x + 320}" y="${rowMid - 10}" width="170" height="20" rx="10" ry="10" fill="${COLORS.toiTrack}"/>`,
    `<rect x="${x + 320}" y="${rowMid - 10}" width="${toiWidth}" height="20" rx="10" ry="10" fill="${COLORS.toiFill}"/>`,
    `<text x="${x + 405}" y="${rowMid + 4}" text-anchor="middle" fill="#F8FAFC" font-size="15" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700">${formatOneDecimal(player.avgToi)} MIN</text>`,
    `<rect x="${shiftsBadgeX}" y="${rowMid - 15}" width="${shiftsBadgeWidth}" height="30" rx="12" ry="12" fill="#182234" stroke="rgba(255,255,255,0.1)"/>`,
    `<text x="${shiftsBadgeX + shiftsBadgeWidth / 2}" y="${rowMid + 6}" text-anchor="middle" fill="${COLORS.text}" font-size="15" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700">${shiftValue.toFixed(0)} Shifts/Game</text>`,
    `<rect x="${secsBadgeX}" y="${rowMid - 15}" width="${secsBadgeWidth}" height="30" rx="12" ry="12" fill="#221B12" stroke="rgba(255,255,255,0.1)"/>`,
    `<text x="${secsBadgeX + secsBadgeWidth / 2}" y="${rowMid + 6}" text-anchor="middle" fill="${COLORS.accent}" font-size="15" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700">${Math.ceil(medianValue)} Secs</text>`
  ].join("");
}

function buildTeamCard(team, teamIndex, x, y, width, height, maxToi) {
  const accent = team.accent;
  const innerX = x + 26;
  const innerWidth = width - 52;
  const sectionTop = y + 130;
  const summaryY = y + 56;
  const chipGap = 12;
  const chipWidth = (innerWidth - chipGap * 2) / 3;
  const chipsStartX = innerX;

  let svg = "";
  svg += `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="24" ry="24" fill="${teamIndex === 0 ? COLORS.panel : COLORS.panelAlt}" stroke="${COLORS.line}"/>`;
  svg += `<text x="${x + width / 2}" y="${y + 34}" text-anchor="middle" fill="${COLORS.text}" font-size="30" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700">${escapeXml(team.name)}</text>`;

  svg += buildMetricChip(
    chipsStartX,
    summaryY,
    chipWidth,
    `${formatOneDecimal(team.avgToi)} MIN`,
    accent.main,
    "Avg. TOI per player"
  );
  svg += buildMetricChip(chipsStartX + chipWidth + chipGap, summaryY, chipWidth, `${Math.round(team.avgShifts)} Shifts/Game`, COLORS.text);
  svg += buildMetricChip(
    chipsStartX + chipWidth * 2 + chipGap * 2,
    summaryY,
    chipWidth,
    `${Math.ceil(team.avgMedianShift)} Secs`,
    COLORS.accent,
    "Avg. shift length per player"
  );

  team.sections.forEach((section, sectionIndex) => {
    const sectionY = sectionTop + sectionIndex * SECTION_HEIGHT;
    svg += buildSectionHeader(innerX, sectionY, innerWidth, section);

    section.players.forEach((player, rowIndex) => {
      const rowY = sectionY + 38 + rowIndex * (SECTION_ROW_HEIGHT + SECTION_ROW_GAP);
      svg += buildPlayerRow(team, player, rowIndex, innerX, rowY, innerWidth, maxToi);
    });
  });

  return svg;
}

function buildSvg(payload) {
  const teamWidth = (PANEL.w - CARD_GAP) / 2;
  const cardY = PANEL.y + HEADER_HEIGHT + 14;
  const cardHeight = PANEL.h - HEADER_HEIGHT - FOOTER_HEIGHT - 8;
  const leftCardX = PANEL.x;
  const rightCardX = PANEL.x + teamWidth + CARD_GAP;
  const topMidY = PANEL.y + Math.floor(HEADER_HEIGHT / 2);

  let svg = "";
  svg += `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">`;
  svg += "<defs>";
  svg += `<linearGradient id="bgGradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${COLORS.bg}"/><stop offset="55%" stop-color="${COLORS.bg2}"/><stop offset="100%" stop-color="#06101B"/></linearGradient>`;
  svg += `<radialGradient id="leftGlow" cx="25%" cy="18%" r="60%"><stop offset="0%" stop-color="rgba(58, 143, 255, 0.24)"/><stop offset="75%" stop-color="rgba(58, 143, 255, 0.08)"/><stop offset="100%" stop-color="rgba(58, 143, 255, 0)"/></radialGradient>`;
  svg += `<radialGradient id="rightGlow" cx="75%" cy="20%" r="58%"><stop offset="0%" stop-color="rgba(58, 143, 255, 0.18)"/><stop offset="75%" stop-color="rgba(58, 143, 255, 0.05)"/><stop offset="100%" stop-color="rgba(58, 143, 255, 0)"/></radialGradient>`;
  svg += "</defs>";

  svg += `<rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="url(#bgGradient)"/>`;
  svg += `<rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="url(#leftGlow)"/>`;
  svg += `<rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="url(#rightGlow)"/>`;

  svg += `<rect x="${PANEL.x}" y="${PANEL.y}" width="${PANEL.w}" height="${PANEL.h}" rx="${PANEL.r}" ry="${PANEL.r}" fill="rgba(7, 11, 17, 0.72)" stroke="rgba(255,255,255,0.08)"/>`;
  svg += `<line x1="${PANEL.x + PANEL.w / 2}" y1="${cardY - 12}" x2="${PANEL.x + PANEL.w / 2}" y2="${PANEL.y + PANEL.h - 34}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;

  svg += `<text x="${PANEL.x + PANEL.w / 2}" y="${topMidY + 20}" fill="${COLORS.text}" text-anchor="middle" font-size="40" font-family="DejaVu Sans, Arial, sans-serif" font-weight="700">NZIHL TEAM COMPARISON</text>`;

  svg += buildTeamCard(payload.teams[0], 0, leftCardX, cardY, teamWidth, cardHeight, payload.maxToi);
  svg += buildTeamCard(payload.teams[1], 1, rightCardX, cardY, teamWidth, cardHeight, payload.maxToi);

  svg += "</svg>";
  return svg;
}

export async function renderComparisonImage(payload) {
  await ensureDir(OUTPUT_DIR);

  const baseSvg = Buffer.from(buildSvg(payload), "utf8");
  const resvg = new Resvg(baseSvg, {
    fitTo: {
      mode: "width",
      value: WIDTH
    }
  });
  const basePng = resvg.render().asPng();
  const canvas = await Jimp.read(Buffer.from(basePng));

  applyInvisibleRunMarker(canvas, payload.generatedAt);
  const pngBuffer = await canvas.getBuffer("image/png");
  await writeFile(TEAM_COMPARISON_IMAGE_FILE, pngBuffer);
}

export async function renderComparisonFromFile() {
  const payload = parseWorkbook();
  await renderComparisonImage(payload);
  return payload;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  renderComparisonFromFile()
    .then(() => {
      console.log(`Wrote ${TEAM_COMPARISON_IMAGE_FILE}`);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
import axios from "axios";
import { Resvg } from "@resvg/resvg-js";
import { Jimp } from "jimp";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import {
  OUTPUT_DIR,
  REQUEST_HEADERS,
  WOMENS_GOALIE_DATA_FILE,
  WOMENS_GOALIE_IMAGE_FILE
} from "./config.js";
import { clampText, ensureDir, escapeXml } from "./utils.js";

const WIDTH = 1920;
const HEIGHT = 1080;
const MARGIN = 60;
const PANEL = {
  x: MARGIN,
  y: MARGIN,
  w: WIDTH - MARGIN * 2,
  h: HEIGHT - MARGIN * 2,
  r: 24
};

const COLORS = {
  fg: "#F0F2F6",
  sub: "#BEC2CA",
  dim: "#8C9098",
  accent: "#FFCD3C",
  grid: "#282C34",
  rowA: "#16181E",
  rowB: "#101216",
  pill: "#3C404A"
};

const METRIC_COLUMNS = [
  { key: "gp", label: "GP" },
  { key: "w", label: "W" },
  { key: "l", label: "L" },
  { key: "gaa", label: "GAA" },
  { key: "svPct", label: "SV%" }
];

function getLayout(goalieCount) {
  const leftEdge = PANEL.x + 24;
  const rightEdge = PANEL.x + PANEL.w - 24;
  const topStripHeight = 130;
  const colHeaderHeight = 56;
  const footerHeight = 48;
  const rowsTop = PANEL.y + topStripHeight + colHeaderHeight;
  const rowsBottom = PANEL.y + PANEL.h - footerHeight;
  const rowHeight = Math.floor((rowsBottom - rowsTop) / Math.max(1, goalieCount));

  const posWidth = 92;
  const photoWidth = 120;
  const playerWidth = 440;
  const teamWidth = 340;
  const metricStartX = leftEdge + posWidth + photoWidth + playerWidth + teamWidth;
  const metricWidth = rightEdge - metricStartX;
  const metricColWidth = metricWidth / METRIC_COLUMNS.length;

  return {
    leftEdge,
    rightEdge,
    topStripHeight,
    colHeaderHeight,
    footerHeight,
    rowsTop,
    rowHeight,
    posWidth,
    photoWidth,
    playerWidth,
    teamWidth,
    metricStartX,
    metricColWidth,
    photoSize: 74
  };
}

function buildSvg(payload) {
  const layout = getLayout(payload.goalies.length);
  const colHeaderY = PANEL.y + layout.topStripHeight;
  const topMidY = PANEL.y + Math.floor(layout.topStripHeight / 2);

  let svg = "";
  svg += `<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"${WIDTH}\" height=\"${HEIGHT}\" viewBox=\"0 0 ${WIDTH} ${HEIGHT}\">`;
  svg += "<defs>";
  svg += "<linearGradient id=\"panelGrad\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\">";
  svg += "<stop offset=\"0%\" stop-color=\"#0C0E12\"/>";
  svg += "<stop offset=\"100%\" stop-color=\"#040508\"/>";
  svg += "</linearGradient>";
  svg += "<filter id=\"panelShadow\" x=\"-20%\" y=\"-20%\" width=\"140%\" height=\"140%\">";
  svg += "<feGaussianBlur in=\"SourceAlpha\" stdDeviation=\"9\" result=\"blur\"/>";
  svg += "<feOffset in=\"blur\" dx=\"4\" dy=\"10\" result=\"offset\"/>";
  svg += "<feColorMatrix in=\"offset\" type=\"matrix\" values=\"0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.55 0\"/>";
  svg += "</filter>";
  svg += "</defs>";

  svg += `<rect x=\"${PANEL.x + 4}\" y=\"${PANEL.y + 10}\" width=\"${PANEL.w}\" height=\"${PANEL.h}\" rx=\"${PANEL.r}\" ry=\"${PANEL.r}\" fill=\"#000000\" filter=\"url(#panelShadow)\"/>`;
  svg += `<rect x=\"${PANEL.x}\" y=\"${PANEL.y}\" width=\"${PANEL.w}\" height=\"${PANEL.h}\" rx=\"${PANEL.r}\" ry=\"${PANEL.r}\" fill=\"url(#panelGrad)\"/>`;

  svg += `<text x=\"${PANEL.x + PANEL.w / 2}\" y=\"${topMidY + 12}\" fill=\"${COLORS.fg}\" text-anchor=\"middle\" font-size=\"40\" font-family=\"Segoe UI, Tahoma, sans-serif\" font-weight=\"700\">NZWIHL GOALIE LEADERS</text>`;

  svg += `<rect x=\"${PANEL.x}\" y=\"${colHeaderY}\" width=\"${PANEL.w}\" height=\"${layout.colHeaderHeight}\" fill=\"#1C1E24\"/>`;
  svg += `<line x1=\"${PANEL.x}\" y1=\"${colHeaderY + layout.colHeaderHeight}\" x2=\"${PANEL.x + PANEL.w}\" y2=\"${colHeaderY + layout.colHeaderHeight}\" stroke=\"${COLORS.grid}\" stroke-width=\"1\"/>`;

  const headerMidY = colHeaderY + layout.colHeaderHeight / 2 + 8;
  const positionCx = layout.leftEdge + layout.posWidth / 2;
  const playerStartX = layout.leftEdge + layout.posWidth + layout.photoWidth + 10;
  const teamStartX = playerStartX + layout.playerWidth;

  svg += `<text x=\"${positionCx}\" y=\"${headerMidY}\" text-anchor=\"middle\" fill=\"${COLORS.sub}\" font-size=\"22\" font-family=\"Segoe UI, Tahoma, sans-serif\" font-weight=\"700\">Position</text>`;
  svg += `<text x=\"${playerStartX}\" y=\"${headerMidY}\" fill=\"${COLORS.sub}\" font-size=\"22\" font-family=\"Segoe UI, Tahoma, sans-serif\" font-weight=\"700\">Name</text>`;
  svg += `<text x=\"${teamStartX}\" y=\"${headerMidY}\" fill=\"${COLORS.sub}\" font-size=\"22\" font-family=\"Segoe UI, Tahoma, sans-serif\" font-weight=\"700\">Team</text>`;

  for (let i = 0; i < METRIC_COLUMNS.length; i += 1) {
    const column = METRIC_COLUMNS[i];
    const cx = layout.metricStartX + i * layout.metricColWidth + layout.metricColWidth / 2;
    const isSv = column.key === "svPct";
    const color = isSv ? COLORS.accent : COLORS.sub;
    const size = isSv ? 24 : 22;
    svg += `<text x=\"${cx}\" y=\"${headerMidY}\" text-anchor=\"middle\" fill=\"${color}\" font-size=\"${size}\" font-family=\"Segoe UI, Tahoma, sans-serif\" font-weight=\"700\">${escapeXml(column.label)}</text>`;
  }

  for (let index = 0; index < payload.goalies.length; index += 1) {
    const goalie = payload.goalies[index];
    const rowY = layout.rowsTop + index * layout.rowHeight;
    const cy = rowY + layout.rowHeight / 2;
    const rowFill = index % 2 === 0 ? COLORS.rowA : COLORS.rowB;

    svg += `<rect x=\"${PANEL.x}\" y=\"${rowY}\" width=\"${PANEL.w}\" height=\"${layout.rowHeight}\" fill=\"${rowFill}\"/>`;

    if (index < payload.goalies.length - 1) {
      svg += `<line x1=\"${layout.leftEdge}\" y1=\"${rowY + layout.rowHeight - 1}\" x2=\"${layout.rightEdge}\" y2=\"${rowY + layout.rowHeight - 1}\" stroke=\"${COLORS.grid}\" stroke-width=\"1\"/>`;
    }

    const pillCenterX = layout.leftEdge + layout.posWidth / 2;
    const pillR = 22;
    svg += `<rect x=\"${pillCenterX - pillR}\" y=\"${cy - pillR}\" width=\"${pillR * 2}\" height=\"${pillR * 2}\" rx=\"10\" ry=\"10\" fill=\"${COLORS.pill}\"/>`;
    svg += `<text x=\"${pillCenterX}\" y=\"${cy + 9}\" text-anchor=\"middle\" fill=\"${COLORS.fg}\" font-size=\"28\" font-family=\"Segoe UI, Tahoma, sans-serif\" font-weight=\"700\">${goalie.rank}</text>`;

    const photoX = layout.leftEdge + layout.posWidth + (layout.photoWidth - layout.photoSize) / 2;
    const photoY = cy - layout.photoSize / 2;
    svg += `<rect x=\"${photoX}\" y=\"${photoY}\" width=\"${layout.photoSize}\" height=\"${layout.photoSize}\" rx=\"${layout.photoSize / 2}\" ry=\"${layout.photoSize / 2}\" fill=\"#253243\"/>`;

    const nameX = layout.leftEdge + layout.posWidth + layout.photoWidth + 10;
    const teamX = nameX + layout.playerWidth;
    svg += `<text x=\"${nameX}\" y=\"${cy + 10}\" fill=\"${COLORS.fg}\" font-size=\"34\" font-family=\"Segoe UI, Tahoma, sans-serif\" font-weight=\"700\">${escapeXml(clampText(String(goalie.name || ""), 24))}</text>`;
    svg += `<text x=\"${teamX}\" y=\"${cy + 9}\" fill=\"${COLORS.sub}\" font-size=\"31\" font-family=\"Segoe UI, Tahoma, sans-serif\" font-weight=\"700\">${escapeXml(clampText(String(goalie.team || ""), 22))}</text>`;

    for (let i = 0; i < METRIC_COLUMNS.length; i += 1) {
      const column = METRIC_COLUMNS[i];
      const cx = layout.metricStartX + i * layout.metricColWidth + layout.metricColWidth / 2;
      const raw = String(goalie[column.key] ?? "");

      if (column.key === "svPct") {
        svg += `<text x=\"${cx}\" y=\"${cy + 14}\" text-anchor=\"middle\" fill=\"${COLORS.accent}\" font-size=\"40\" font-family=\"Segoe UI, Tahoma, sans-serif\" font-weight=\"700\">${escapeXml(raw)}</text>`;
        continue;
      }

      svg += `<text x=\"${cx}\" y=\"${cy + 11}\" text-anchor=\"middle\" fill=\"${COLORS.fg}\" font-size=\"33\" font-family=\"Segoe UI, Tahoma, sans-serif\" font-weight=\"700\">${escapeXml(raw)}</text>`;
    }
  }

  svg += `<text x=\"${PANEL.x + PANEL.w / 2}\" y=\"${PANEL.y + PANEL.h - layout.footerHeight / 2 + 7}\" text-anchor=\"middle\" fill=\"${COLORS.dim}\" font-size=\"20\" font-family=\"Segoe UI, Tahoma, sans-serif\">Goalie stats from NZWIHL regular season (showGameType=2)</text>`;

  svg += "</svg>";
  return svg;
}

async function buildPlayerPhotoComposite(imageUrl, size) {
  try {
    const response = await axios.get(imageUrl, {
      headers: REQUEST_HEADERS,
      responseType: "arraybuffer",
      timeout: 20000
    });

    const image = await Jimp.read(Buffer.from(response.data));
    const scale = Math.max(size / image.bitmap.width, size / image.bitmap.height);
    const resizedWidth = Math.max(size, Math.round(image.bitmap.width * scale));
    const resizedHeight = Math.max(size, Math.round(image.bitmap.height * scale));

    image.resize({ w: resizedWidth, h: resizedHeight });

    const cropX = Math.floor((resizedWidth - size) / 2);
    const cropY = Math.floor((resizedHeight - size) / 2);
    image.crop({ x: cropX, y: cropY, w: size, h: size });

    const center = (size - 1) / 2;
    const radius = size / 2;

    image.scan(0, 0, size, size, (x, y, index) => {
      const dx = x - center;
      const dy = y - center;
      if (dx * dx + dy * dy > radius * radius) {
        image.bitmap.data[index + 3] = 0;
      }
    });

    return image;
  } catch {
    return null;
  }
}

export async function renderWomensGoalieImage(payload) {
  await ensureDir(OUTPUT_DIR);
  const layout = getLayout(payload.goalies.length);

  const baseSvg = Buffer.from(buildSvg(payload), "utf8");
  const resvg = new Resvg(baseSvg, {
    fitTo: {
      mode: "width",
      value: WIDTH
    }
  });
  const basePng = resvg.render().asPng();
  const canvas = await Jimp.read(Buffer.from(basePng));

  for (let index = 0; index < payload.goalies.length; index += 1) {
    const goalie = payload.goalies[index];
    if (!goalie.imageUrl) {
      continue;
    }

    const photo = await buildPlayerPhotoComposite(goalie.imageUrl, layout.photoSize);
    if (!photo) {
      continue;
    }

    const rowY = layout.rowsTop + index * layout.rowHeight;
    const cy = rowY + layout.rowHeight / 2;
    const photoX = layout.leftEdge + layout.posWidth + (layout.photoWidth - layout.photoSize) / 2;
    const photoY = cy - layout.photoSize / 2;
    canvas.composite(photo, photoX, photoY);
  }

  const pngBuffer = await canvas.getBuffer("image/png");
  await writeFile(WOMENS_GOALIE_IMAGE_FILE, pngBuffer);
}

export async function renderWomensGoalieFromFile() {
  const raw = await readFile(WOMENS_GOALIE_DATA_FILE, "utf8");
  const payload = JSON.parse(raw);
  await renderWomensGoalieImage(payload);
  return payload;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  renderWomensGoalieFromFile()
    .then((payload) => {
      console.log(`Rendered image for ${payload.goalies.length} goalies to ${WOMENS_GOALIE_IMAGE_FILE}`);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

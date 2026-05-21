import axios from "axios";
import { Resvg } from "@resvg/resvg-js";
import { Jimp } from "jimp";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { OUTPUT_DIR, REQUEST_HEADERS, WOMENS_DATA_FILE, WOMENS_IMAGE_FILE } from "./config.js";
import { applyInvisibleRunMarker, clampText, ensureDir, escapeXml } from "./utils.js";

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
  pill: "#3C404A",
  pos: "#60C482",
  neg: "#E86060"
};

const METRIC_COLUMNS = [
  { key: "position", label: "Pos" },
  { key: "gp", label: "GP" },
  { key: "g", label: "G" },
  { key: "a", label: "A" },
  { key: "pts", label: "Pts" },
  { key: "pPerGame", label: "P/G" },
  { key: "plusMinus", label: "+/-" }
];

const HEADER_LOGO_PATH = "src/nzwihl-logo-full-white.png";
const HEADER_LOGO_WIDTH = 110;
const HEADER_LOGO_HEIGHT = 62;
const HEADER_LOGO_GAP = 20;
const HEADER_TITLE_VISUAL_WIDTH = 600;

function getLayout(playerCount) {
  const leftEdge = PANEL.x + 24;
  const rightEdge = PANEL.x + PANEL.w - 24;
  const topStripHeight = 130;
  const colHeaderHeight = 56;
  const footerHeight = 10;
  const rowsTop = PANEL.y + topStripHeight + colHeaderHeight;
  const rowsBottom = PANEL.y + PANEL.h - footerHeight;
  const rowHeight = Math.floor((rowsBottom - rowsTop) / Math.max(1, playerCount));

  const posWidth = 64;
  const photoWidth = 110;
  const playerWidth = 340;
  const teamWidth = 300;
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
  const layout = getLayout(payload.players.length);
  const colHeaderY = PANEL.y + layout.topStripHeight;
  const topMidY = PANEL.y + Math.floor(layout.topStripHeight / 2);

  let svg = "";
  svg += `<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"${WIDTH}\" height=\"${HEIGHT}\" viewBox=\"0 0 ${WIDTH} ${HEIGHT}\">`;
  svg += "<defs>";
  svg += "</defs>";

  const titleCenterX = PANEL.x + PANEL.w / 2 + (HEADER_LOGO_WIDTH + HEADER_LOGO_GAP) / 2;
  svg += `<text x=\"${titleCenterX}\" y=\"${topMidY + 12}\" fill=\"${COLORS.fg}\" text-anchor=\"middle\" font-size=\"40\" font-family=\"Segoe UI, Tahoma, sans-serif\" font-weight=\"700\">NZWIHL SCORING LEADERS</text>`;

  svg += `<rect x=\"${PANEL.x}\" y=\"${colHeaderY}\" width=\"${PANEL.w}\" height=\"${layout.colHeaderHeight}\" fill=\"#1C1E24\"/>`;
  svg += `<line x1=\"${PANEL.x}\" y1=\"${colHeaderY + layout.colHeaderHeight}\" x2=\"${PANEL.x + PANEL.w}\" y2=\"${colHeaderY + layout.colHeaderHeight}\" stroke=\"${COLORS.grid}\" stroke-width=\"1\"/>`;

  const headerMidY = colHeaderY + layout.colHeaderHeight / 2 + 8;
  const playerStartX = layout.leftEdge + layout.posWidth + layout.photoWidth + 10;
  const teamStartX = playerStartX + layout.playerWidth;
  svg += `<text x=\"${playerStartX}\" y=\"${headerMidY}\" fill=\"${COLORS.sub}\" font-size=\"22\" font-family=\"Segoe UI, Tahoma, sans-serif\" font-weight=\"700\">Player</text>`;
  svg += `<text x=\"${teamStartX}\" y=\"${headerMidY}\" fill=\"${COLORS.sub}\" font-size=\"22\" font-family=\"Segoe UI, Tahoma, sans-serif\" font-weight=\"700\">Team</text>`;

  for (let i = 0; i < METRIC_COLUMNS.length; i += 1) {
    const column = METRIC_COLUMNS[i];
    const cx = layout.metricStartX + i * layout.metricColWidth + layout.metricColWidth / 2;
    const color = column.key === "pts" ? COLORS.accent : COLORS.sub;
    const size = column.key === "pts" ? 24 : 22;
    svg += `<text x=\"${cx}\" y=\"${headerMidY}\" text-anchor=\"middle\" fill=\"${color}\" font-size=\"${size}\" font-family=\"Segoe UI, Tahoma, sans-serif\" font-weight=\"700\">${escapeXml(column.label)}</text>`;
  }

  for (let index = 0; index < payload.players.length; index += 1) {
    const player = payload.players[index];
    const rowY = layout.rowsTop + index * layout.rowHeight;
    const cy = rowY + layout.rowHeight / 2;
    const rowFill = index % 2 === 0 ? COLORS.rowA : COLORS.rowB;

    svg += `<rect x=\"${PANEL.x}\" y=\"${rowY}\" width=\"${PANEL.w}\" height=\"${layout.rowHeight}\" fill=\"${rowFill}\"/>`;

    if (index < payload.players.length - 1) {
      svg += `<line x1=\"${layout.leftEdge}\" y1=\"${rowY + layout.rowHeight - 1}\" x2=\"${layout.rightEdge}\" y2=\"${rowY + layout.rowHeight - 1}\" stroke=\"${COLORS.grid}\" stroke-width=\"1\"/>`;
    }

    const pillCenterX = layout.leftEdge + layout.posWidth / 2;
    const pillR = 22;
    svg += `<rect x=\"${pillCenterX - pillR}\" y=\"${cy - pillR}\" width=\"${pillR * 2}\" height=\"${pillR * 2}\" rx=\"10\" ry=\"10\" fill=\"${COLORS.pill}\"/>`;
    svg += `<text x=\"${pillCenterX}\" y=\"${cy + 9}\" text-anchor=\"middle\" fill=\"${COLORS.fg}\" font-size=\"28\" font-family=\"Segoe UI, Tahoma, sans-serif\" font-weight=\"700\">${index + 1}</text>`;

    const photoX = layout.leftEdge + layout.posWidth + (layout.photoWidth - layout.photoSize) / 2;
    const photoY = cy - layout.photoSize / 2;
    svg += `<rect x=\"${photoX}\" y=\"${photoY}\" width=\"${layout.photoSize}\" height=\"${layout.photoSize}\" rx=\"${layout.photoSize / 2}\" ry=\"${layout.photoSize / 2}\" fill=\"#253243\"/>`;

    const nameX = layout.leftEdge + layout.posWidth + layout.photoWidth + 10;
    const teamX = nameX + layout.playerWidth;
    svg += `<text x=\"${nameX}\" y=\"${cy + 10}\" fill=\"${COLORS.fg}\" font-size=\"34\" font-family=\"Segoe UI, Tahoma, sans-serif\" font-weight=\"700\">${escapeXml(clampText(String(player.name || ""), 24))}</text>`;
    const teamText = clampText(String(player.team || ""), 22);
    const teamFontSize = teamText.length > 18 ? 24 : 31;
    svg += `<text x=\"${teamX}\" y=\"${cy + 9}\" fill=\"${COLORS.sub}\" font-size=\"${teamFontSize}\" font-family=\"Segoe UI, Tahoma, sans-serif\" font-weight=\"700\">${escapeXml(teamText)}</text>`;

    for (let i = 0; i < METRIC_COLUMNS.length; i += 1) {
      const column = METRIC_COLUMNS[i];
      const cx = layout.metricStartX + i * layout.metricColWidth + layout.metricColWidth / 2;
      const raw = String(player[column.key] ?? "");

      if (column.key === "plusMinus") {
        const value = Number.parseInt(raw, 10);
        const color = Number.isNaN(value) ? COLORS.sub : value > 0 ? COLORS.pos : value < 0 ? COLORS.neg : COLORS.dim;
        const label = Number.isNaN(value) ? raw : value > 0 ? `+${value}` : String(value);
        svg += `<text x=\"${cx}\" y=\"${cy + 11}\" text-anchor=\"middle\" fill=\"${color}\" font-size=\"32\" font-family=\"Segoe UI, Tahoma, sans-serif\" font-weight=\"700\">${escapeXml(label)}</text>`;
        continue;
      }

      if (column.key === "pts") {
        svg += `<text x=\"${cx}\" y=\"${cy + 14}\" text-anchor=\"middle\" fill=\"${COLORS.accent}\" font-size=\"44\" font-family=\"Segoe UI, Tahoma, sans-serif\" font-weight=\"700\">${escapeXml(raw)}</text>`;
        continue;
      }

      svg += `<text x=\"${cx}\" y=\"${cy + 11}\" text-anchor=\"middle\" fill=\"${COLORS.fg}\" font-size=\"33\" font-family=\"Segoe UI, Tahoma, sans-serif\" font-weight=\"700\">${escapeXml(raw)}</text>`;
    }
  }

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

async function buildHeaderLogoComposite() {
  try {
    const logo = await Jimp.read(HEADER_LOGO_PATH);
    logo.contain({ w: HEADER_LOGO_WIDTH, h: HEADER_LOGO_HEIGHT });
    return logo;
  } catch {
    return null;
  }
}

export async function renderWomensImage(payload) {
  await ensureDir(OUTPUT_DIR);
  const layout = getLayout(payload.players.length);

  const baseSvg = Buffer.from(buildSvg(payload), "utf8");
  const resvg = new Resvg(baseSvg, {
    fitTo: {
      mode: "width",
      value: WIDTH
    }
  });
  const basePng = resvg.render().asPng();
  const canvas = await Jimp.read(Buffer.from(basePng));

  const headerLogo = await buildHeaderLogoComposite();
  if (headerLogo) {
    const pairWidth = HEADER_LOGO_WIDTH + HEADER_LOGO_GAP + HEADER_TITLE_VISUAL_WIDTH;
    const logoX = Math.round(PANEL.x + (PANEL.w - pairWidth) / 2);
    const logoY = Math.round(PANEL.y + layout.topStripHeight / 2 - HEADER_LOGO_HEIGHT / 2);
    canvas.composite(headerLogo, logoX, logoY);
  }

  for (let index = 0; index < payload.players.length; index += 1) {
    const player = payload.players[index];
    if (!player.imageUrl) {
      continue;
    }

    const photo = await buildPlayerPhotoComposite(player.imageUrl, layout.photoSize);
    if (!photo) {
      continue;
    }

    const rowY = layout.rowsTop + index * layout.rowHeight;
    const cy = rowY + layout.rowHeight / 2;
    const photoX = layout.leftEdge + layout.posWidth + (layout.photoWidth - layout.photoSize) / 2;
    const photoY = cy - layout.photoSize / 2;
    canvas.composite(photo, photoX, photoY);
  }

  applyInvisibleRunMarker(canvas, payload.generatedAt);
  const pngBuffer = await canvas.getBuffer("image/png");
  await writeFile(WOMENS_IMAGE_FILE, pngBuffer);
}

export async function renderWomensFromFile() {
  const raw = await readFile(WOMENS_DATA_FILE, "utf8");
  const payload = JSON.parse(raw);
  await renderWomensImage(payload);
  return payload;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  renderWomensFromFile()
    .then((payload) => {
      console.log(`Rendered image for ${payload.players.length} players to ${WOMENS_IMAGE_FILE}`);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

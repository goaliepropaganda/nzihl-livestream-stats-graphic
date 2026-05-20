import axios from "axios";
import { Resvg } from "@resvg/resvg-js";
import { Jimp } from "jimp";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { DATA_FILE, IMAGE_FILE, OUTPUT_DIR, REQUEST_HEADERS } from "./config.js";
import { clampText, ensureDir, escapeXml } from "./utils.js";

const WIDTH = 1920;
const HEIGHT = 1080;
const BORDER = 80;

const COLUMNS = [
  { key: "name", label: "Player", width: 420, align: "left" },
  { key: "position", label: "Pos", width: 80, align: "center" },
  { key: "team", label: "Team", width: 285, align: "left" },
  { key: "gp", label: "GP", width: 80, align: "center" },
  { key: "g", label: "G", width: 70, align: "center" },
  { key: "a", label: "A", width: 70, align: "center" },
  { key: "pts", label: "Pts", width: 90, align: "center" },
  { key: "pPerGame", label: "p/G", width: 95, align: "center" },
  { key: "plusMinus", label: "+/-", width: 90, align: "center" }
];

function buildSvg(payload) {
  const innerWidth = WIDTH - BORDER * 2;
  const innerHeight = HEIGHT - BORDER * 2;
  const titleY = BORDER + 34;
  const tableTop = BORDER + 96;
  const rowHeight = 76;
  const photoSize = 54;
  const photoInset = 12;

  let svg = "";
  svg += `<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"${WIDTH}\" height=\"${HEIGHT}\" viewBox=\"0 0 ${WIDTH} ${HEIGHT}\">`;
  svg += `<rect x=\"${BORDER}\" y=\"${BORDER}\" width=\"${innerWidth}\" height=\"${innerHeight}\" rx=\"26\" ry=\"26\" fill=\"rgba(8,22,36,0.75)\" />`;
  svg += `<text x=\"${BORDER + 28}\" y=\"${titleY}\" fill=\"#ECF4FB\" font-size=\"42\" font-family=\"Segoe UI, Tahoma, sans-serif\" font-weight=\"700\">NZIHL Top 10 Scoring Leaders</text>`;

  const generatedAt = new Date(payload.generatedAt).toLocaleString("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Pacific/Auckland"
  });

  svg += `<text x=\"${BORDER + innerWidth - 28}\" y=\"${titleY}\" fill=\"#BFD5E8\" text-anchor=\"end\" font-size=\"20\" font-family=\"Segoe UI, Tahoma, sans-serif\">Updated ${escapeXml(generatedAt)}</text>`;

  let x = BORDER + 96;
  for (const column of COLUMNS) {
    const anchor = column.align === "left" ? "start" : "middle";
    const columnX = column.align === "left" ? x : x + column.width / 2;

    svg += `<text x=\"${columnX}\" y=\"${tableTop}\" fill=\"#93B6D3\" text-anchor=\"${anchor}\" font-size=\"20\" font-family=\"Segoe UI, Tahoma, sans-serif\" font-weight=\"700\">${escapeXml(column.label)}</text>`;
    x += column.width;
  }

  for (let index = 0; index < payload.players.length; index += 1) {
    const player = payload.players[index];
    const rowY = tableTop + 22 + index * rowHeight;
    const stripe = index % 2 === 0 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)";

    svg += `<rect x=\"${BORDER + 12}\" y=\"${rowY - 30}\" width=\"${innerWidth - 24}\" height=\"${rowHeight - 6}\" rx=\"14\" ry=\"14\" fill=\"${stripe}\" />`;
    svg += `<text x=\"${BORDER + 24}\" y=\"${rowY + 12}\" fill=\"#D7E6F3\" font-size=\"25\" font-family=\"Segoe UI, Tahoma, sans-serif\" font-weight=\"700\">${index + 1}</text>`;

    const photoX = BORDER + 44;
    const photoY = rowY - 24;
    svg += `<rect x=\"${photoX}\" y=\"${photoY}\" width=\"${photoSize}\" height=\"${photoSize}\" rx=\"27\" ry=\"27\" fill=\"rgba(148,183,214,0.35)\" />`;

    let colX = BORDER + 96;
    for (const column of COLUMNS) {
      const rawValue = player[column.key] ?? "";
      const value = column.key === "team" ? clampText(String(rawValue), 26) : clampText(String(rawValue), 22);
      const anchor = column.align === "left" ? "start" : "middle";
      const textX = column.align === "left" ? colX : colX + column.width / 2;
      const fontWeight = column.key === "name" ? 700 : 500;
      const fontSize = column.key === "name" ? 28 : 24;

      svg += `<text x=\"${textX}\" y=\"${rowY + 12}\" fill=\"#F6FAFE\" text-anchor=\"${anchor}\" font-size=\"${fontSize}\" font-family=\"Segoe UI, Tahoma, sans-serif\" font-weight=\"${fontWeight}\">${escapeXml(value)}</text>`;
      colX += column.width;
    }

    if (!player.imageUrl) {
      svg += `<text x=\"${BORDER + 71}\" y=\"${rowY + 12}\" text-anchor=\"middle\" fill=\"#DCE8F2\" font-size=\"16\" font-family=\"Segoe UI, Tahoma, sans-serif\">N/A</text>`;
    }

    if (photoInset >= 0) {
      // Kept intentionally for matching overlay coordinates with image composites.
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

    // Apply a circular alpha mask so headshots match the original design.
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

export async function renderImage(payload) {
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

  const tableTop = BORDER + 96;
  const rowHeight = 76;
  const photoSize = 54;

  for (let index = 0; index < payload.players.length; index += 1) {
    const player = payload.players[index];
    if (!player.imageUrl) {
      continue;
    }

    const photo = await buildPlayerPhotoComposite(player.imageUrl, photoSize);
    if (!photo) {
      continue;
    }

    const rowY = tableTop + 22 + index * rowHeight;
    canvas.composite(photo, BORDER + 44, rowY - 24);
  }

  const pngBuffer = await canvas.getBuffer("image/png");
  await writeFile(IMAGE_FILE, pngBuffer);
}

export async function renderFromFile() {
  const raw = await readFile(DATA_FILE, "utf8");
  const payload = JSON.parse(raw);
  await renderImage(payload);
  return payload;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  renderFromFile()
    .then((payload) => {
      console.log(`Rendered image for ${payload.players.length} players to ${IMAGE_FILE}`);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

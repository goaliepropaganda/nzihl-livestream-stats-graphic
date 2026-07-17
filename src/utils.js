import { mkdir } from "node:fs/promises";

export async function ensureDir(path) {
  await mkdir(path, { recursive: true });
}

export function normalizeHeader(text) {
  return text
    .replace(/\u00a0/g, " ")
    .trim()
    .toUpperCase();
}

export function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function clampText(value, maxLength) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}

export function estimateTextWidth(value, fontSize = 16) {
  const text = String(value || "");
  let units = 0;

  for (const ch of text) {
    if (ch === " ") {
      units += 0.32;
      continue;
    }

    if ("ilI|!'.,:;`".includes(ch)) {
      units += 0.28;
      continue;
    }

    if ("mwMW@%#&QO".includes(ch)) {
      units += 0.86;
      continue;
    }

    if ("-_/()[]{}".includes(ch)) {
      units += 0.4;
      continue;
    }

    units += 0.58;
  }

  return units * fontSize;
}

export function fitTextForWidth(value, maxWidth, options = {}) {
  const {
    fontSize = 16,
    minFontSize = 12
  } = options;

  const text = String(value || "").trim();
  if (!text) {
    return { text: "", fontSize };
  }

  let fittedSize = fontSize;
  let fittedText = text;
  let estimatedWidth = estimateTextWidth(fittedText, fittedSize);

  if (estimatedWidth > maxWidth) {
    const scaled = Math.floor((fontSize * (maxWidth / estimatedWidth)) * 10) / 10;
    fittedSize = Math.max(minFontSize, scaled);
    estimatedWidth = estimateTextWidth(fittedText, fittedSize);
  }

  if (estimatedWidth <= maxWidth) {
    return { text: fittedText, fontSize: fittedSize };
  }

  while (fittedText.length > 1) {
    fittedText = `${fittedText.slice(0, -1).trimEnd()}…`;
    if (estimateTextWidth(fittedText, fittedSize) <= maxWidth) {
      return { text: fittedText, fontSize: fittedSize };
    }
  }

  return { text: "…", fontSize: fittedSize };
}

function hashRunMarker(value) {
  const text = String(value || "");
  let hash = 2166136261;

  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function applyInvisibleRunMarker(canvas, runMarker) {
  const hash = hashRunMarker(runMarker);
  const r = (hash >> 16) & 0xff;
  const g = (hash >> 8) & 0xff;
  const b = hash & 0xff;

  // Keep alpha at zero so the pixel is invisible while still changing file bytes.
  const color = ((r << 24) | (g << 16) | (b << 8)) >>> 0;
  canvas.setPixelColor(color, 0, 0);
}

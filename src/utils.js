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

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

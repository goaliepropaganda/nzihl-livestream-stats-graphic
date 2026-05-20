import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import {
  DATA_FILE,
  GOALIE_DATA_FILE,
  GOALIE_IMAGE_FILE,
  IMAGE_FILE,
  WOMENS_DATA_FILE,
  WOMENS_GOALIE_DATA_FILE,
  WOMENS_GOALIE_IMAGE_FILE,
  WOMENS_IMAGE_FILE
} from "./config.js";

const LIVE_DIR = "docs";
const LIVE_JSON_FILE = `${LIVE_DIR}/top10.json`;
const LIVE_IMAGE_FILE = `${LIVE_DIR}/NZIHL_top10.png`;
const LIVE_INDEX_FILE = `${LIVE_DIR}/index.html`;
const GOALIE_LIVE_DIR = `${LIVE_DIR}/goalies`;
const GOALIE_LIVE_JSON_FILE = `${GOALIE_LIVE_DIR}/goalies.json`;
const GOALIE_LIVE_IMAGE_FILE = `${GOALIE_LIVE_DIR}/NZIHL_goalies.png`;
const GOALIE_LIVE_INDEX_FILE = `${GOALIE_LIVE_DIR}/index.html`;
const WOMENS_LIVE_DIR = `${LIVE_DIR}/womens`;
const WOMENS_LIVE_JSON_FILE = `${WOMENS_LIVE_DIR}/womens_top10.json`;
const WOMENS_LIVE_IMAGE_FILE = `${WOMENS_LIVE_DIR}/womens_top10.png`;
const WOMENS_LIVE_INDEX_FILE = `${WOMENS_LIVE_DIR}/index.html`;
const WOMENS_GOALIE_LIVE_DIR = `${LIVE_DIR}/womens-goalies`;
const WOMENS_GOALIE_LIVE_JSON_FILE = `${WOMENS_GOALIE_LIVE_DIR}/womens_goalies.json`;
const WOMENS_GOALIE_LIVE_IMAGE_FILE = `${WOMENS_GOALIE_LIVE_DIR}/womens_goalies.png`;
const WOMENS_GOALIE_LIVE_INDEX_FILE = `${WOMENS_GOALIE_LIVE_DIR}/index.html`;
const NO_JEKYLL_FILE = `${LIVE_DIR}/.nojekyll`;

function buildLiveHtml(payload) {
  const generated = new Date(payload.generatedAt).toLocaleString("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Pacific/Auckland"
  });

  return [
    "<!doctype html>",
    "<html lang=\"en\">",
    "<head>",
    "  <meta charset=\"utf-8\">",
    "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    "  <title>NZIHL Scoring Leaders</title>",
    "  <style>",
    "    :root { color-scheme: only light; }",
    "    body {",
    "      margin: 0;",
    "      font-family: 'Segoe UI', Tahoma, sans-serif;",
    "      color: #e6edf3;",
    "      background:",
    "        radial-gradient(1200px 600px at 85% -20%, rgba(50, 120, 170, 0.35), transparent 70%),",
    "        radial-gradient(900px 500px at 0% 100%, rgba(10, 60, 110, 0.35), transparent 70%),",
    "        #031525;",
    "      min-height: 100vh;",
    "      display: grid;",
    "      place-items: center;",
    "      padding: 24px;",
    "      box-sizing: border-box;",
    "    }",
    "    .wrap { width: min(100%, 1600px); }",
    "    .header { margin-bottom: 18px; }",
    "    h1 { margin: 0 0 8px; font-size: clamp(1.5rem, 2.6vw, 2.2rem); }",
    "    .meta { color: #b5c7d8; }",
    "    .card {",
    "      border-radius: 18px;",
    "      background: rgba(255, 255, 255, 0.04);",
    "      border: 1px solid rgba(255, 255, 255, 0.1);",
    "      padding: 16px;",
    "      backdrop-filter: blur(4px);",
    "    }",
    "    img { width: 100%; height: auto; display: block; border-radius: 12px; }",
    "    .links { margin-top: 14px; display: flex; gap: 12px; flex-wrap: wrap; }",
    "    a { color: #9dd6ff; text-decoration: none; }",
    "    a:hover { text-decoration: underline; }",
    "  </style>",
    "</head>",
    "<body>",
    "  <main class=\"wrap\">",
    "    <header class=\"header\">",
    "      <h1>NZIHL Top 10 Scoring Leaders</h1>",
    `      <div class=\"meta\">Last updated: ${generated} (Pacific/Auckland)</div>`,
    "    </header>",
    "    <section class=\"card\">",
    "      <img src=\"./NZIHL_top10.png\" alt=\"NZIHL top 10 scoring leaders graphic\">",
    "      <div class=\"links\">",
    "        <a href=\"./NZIHL_top10.png\">Open PNG</a>",
    "        <a href=\"./top10.json\">Open JSON</a>",
    "        <a href=\"./goalies/\">View Goalie Leaders</a>",
    "        <a href=\"./womens/\">View NZWIHL Scoring Leaders</a>",
    "        <a href=\"./womens-goalies/\">View NZWIHL Goalie Leaders</a>",
    "      </div>",
    "    </section>",
    "  </main>",
    "</body>",
    "</html>"
  ].join("\n");
}

function buildGoalieLiveHtml(payload) {
  const generated = new Date(payload.generatedAt).toLocaleString("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Pacific/Auckland"
  });

  return [
    "<!doctype html>",
    "<html lang=\"en\">",
    "<head>",
    "  <meta charset=\"utf-8\">",
    "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    "  <title>NZIHL Goalie Leaders</title>",
    "  <style>",
    "    :root { color-scheme: only light; }",
    "    body {",
    "      margin: 0;",
    "      font-family: 'Segoe UI', Tahoma, sans-serif;",
    "      color: #e6edf3;",
    "      background:",
    "        radial-gradient(1200px 600px at 85% -20%, rgba(38, 115, 190, 0.35), transparent 70%),",
    "        radial-gradient(900px 500px at 0% 100%, rgba(15, 50, 90, 0.35), transparent 70%),",
    "        #031525;",
    "      min-height: 100vh;",
    "      display: grid;",
    "      place-items: center;",
    "      padding: 24px;",
    "      box-sizing: border-box;",
    "    }",
    "    .wrap { width: min(100%, 1600px); }",
    "    .header { margin-bottom: 18px; }",
    "    h1 { margin: 0 0 8px; font-size: clamp(1.5rem, 2.6vw, 2.2rem); }",
    "    .meta { color: #b5c7d8; }",
    "    .card {",
    "      border-radius: 18px;",
    "      background: rgba(255, 255, 255, 0.04);",
    "      border: 1px solid rgba(255, 255, 255, 0.1);",
    "      padding: 16px;",
    "      backdrop-filter: blur(4px);",
    "    }",
    "    img { width: 100%; height: auto; display: block; border-radius: 12px; }",
    "    .links { margin-top: 14px; display: flex; gap: 12px; flex-wrap: wrap; }",
    "    a { color: #9dd6ff; text-decoration: none; }",
    "    a:hover { text-decoration: underline; }",
    "  </style>",
    "</head>",
    "<body>",
    "  <main class=\"wrap\">",
    "    <header class=\"header\">",
    "      <h1>NZIHL Goalie Leaders</h1>",
    `      <div class=\"meta\">Last updated: ${generated} (Pacific/Auckland)</div>`,
    "    </header>",
    "    <section class=\"card\">",
    "      <img src=\"./NZIHL_goalies.png\" alt=\"NZIHL goalie leaders graphic\">",
    "      <div class=\"links\">",
    "        <a href=\"./NZIHL_goalies.png\">Open PNG</a>",
    "        <a href=\"./goalies.json\">Open JSON</a>",
    "        <a href=\"../\">View Scoring Leaders</a>",
    "        <a href=\"../womens/\">View NZWIHL Scoring Leaders</a>",
    "        <a href=\"../womens-goalies/\">View NZWIHL Goalie Leaders</a>",
    "      </div>",
    "    </section>",
    "  </main>",
    "</body>",
    "</html>"
  ].join("\n");
}

function buildWomensLiveHtml(payload) {
  const generated = new Date(payload.generatedAt).toLocaleString("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Pacific/Auckland"
  });

  return [
    "<!doctype html>",
    "<html lang=\"en\">",
    "<head>",
    "  <meta charset=\"utf-8\">",
    "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    "  <title>NZWIHL Scoring Leaders</title>",
    "  <style>",
    "    :root { color-scheme: only light; }",
    "    body {",
    "      margin: 0;",
    "      font-family: 'Segoe UI', Tahoma, sans-serif;",
    "      color: #e6edf3;",
    "      background:",
    "        radial-gradient(1200px 600px at 85% -20%, rgba(194, 62, 92, 0.30), transparent 70%),",
    "        radial-gradient(900px 500px at 0% 100%, rgba(38, 56, 133, 0.30), transparent 70%),",
    "        #120a1f;",
    "      min-height: 100vh;",
    "      display: grid;",
    "      place-items: center;",
    "      padding: 24px;",
    "      box-sizing: border-box;",
    "    }",
    "    .wrap { width: min(100%, 1600px); }",
    "    .header { margin-bottom: 18px; }",
    "    h1 { margin: 0 0 8px; font-size: clamp(1.5rem, 2.6vw, 2.2rem); }",
    "    .meta { color: #d9c7e8; }",
    "    .card {",
    "      border-radius: 18px;",
    "      background: rgba(255, 255, 255, 0.04);",
    "      border: 1px solid rgba(255, 255, 255, 0.1);",
    "      padding: 16px;",
    "      backdrop-filter: blur(4px);",
    "    }",
    "    img { width: 100%; height: auto; display: block; border-radius: 12px; }",
    "    .links { margin-top: 14px; display: flex; gap: 12px; flex-wrap: wrap; }",
    "    a { color: #f5b6ff; text-decoration: none; }",
    "    a:hover { text-decoration: underline; }",
    "  </style>",
    "</head>",
    "<body>",
    "  <main class=\"wrap\">",
    "    <header class=\"header\">",
    "      <h1>NZWIHL Scoring Leaders</h1>",
    `      <div class=\"meta\">Last updated: ${generated} (Pacific/Auckland)</div>`,
    "    </header>",
    "    <section class=\"card\">",
    "      <img src=\"./womens_top10.png\" alt=\"NZWIHL scoring leaders graphic\">",
    "      <div class=\"links\">",
    "        <a href=\"./womens_top10.png\">Open PNG</a>",
    "        <a href=\"./womens_top10.json\">Open JSON</a>",
    "        <a href=\"../womens-goalies/\">View NZWIHL Goalie Leaders</a>",
    "        <a href=\"../\">View NZIHL Scoring Leaders</a>",
    "      </div>",
    "    </section>",
    "  </main>",
    "</body>",
    "</html>"
  ].join("\n");
}

function buildWomensGoalieLiveHtml(payload) {
  const generated = new Date(payload.generatedAt).toLocaleString("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Pacific/Auckland"
  });

  return [
    "<!doctype html>",
    "<html lang=\"en\">",
    "<head>",
    "  <meta charset=\"utf-8\">",
    "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    "  <title>NZWIHL Goalie Leaders</title>",
    "  <style>",
    "    :root { color-scheme: only light; }",
    "    body {",
    "      margin: 0;",
    "      font-family: 'Segoe UI', Tahoma, sans-serif;",
    "      color: #e6edf3;",
    "      background:",
    "        radial-gradient(1200px 600px at 85% -20%, rgba(133, 71, 170, 0.30), transparent 70%),",
    "        radial-gradient(900px 500px at 0% 100%, rgba(28, 95, 130, 0.30), transparent 70%),",
    "        #10172a;",
    "      min-height: 100vh;",
    "      display: grid;",
    "      place-items: center;",
    "      padding: 24px;",
    "      box-sizing: border-box;",
    "    }",
    "    .wrap { width: min(100%, 1600px); }",
    "    .header { margin-bottom: 18px; }",
    "    h1 { margin: 0 0 8px; font-size: clamp(1.5rem, 2.6vw, 2.2rem); }",
    "    .meta { color: #c0cfe0; }",
    "    .card {",
    "      border-radius: 18px;",
    "      background: rgba(255, 255, 255, 0.04);",
    "      border: 1px solid rgba(255, 255, 255, 0.1);",
    "      padding: 16px;",
    "      backdrop-filter: blur(4px);",
    "    }",
    "    img { width: 100%; height: auto; display: block; border-radius: 12px; }",
    "    .links { margin-top: 14px; display: flex; gap: 12px; flex-wrap: wrap; }",
    "    a { color: #9dd6ff; text-decoration: none; }",
    "    a:hover { text-decoration: underline; }",
    "  </style>",
    "</head>",
    "<body>",
    "  <main class=\"wrap\">",
    "    <header class=\"header\">",
    "      <h1>NZWIHL Goalie Leaders</h1>",
    `      <div class=\"meta\">Last updated: ${generated} (Pacific/Auckland)</div>`,
    "    </header>",
    "    <section class=\"card\">",
    "      <img src=\"./womens_goalies.png\" alt=\"NZWIHL goalie leaders graphic\">",
    "      <div class=\"links\">",
    "        <a href=\"./womens_goalies.png\">Open PNG</a>",
    "        <a href=\"./womens_goalies.json\">Open JSON</a>",
    "        <a href=\"../womens/\">View NZWIHL Scoring Leaders</a>",
    "        <a href=\"../\">View NZIHL Scoring Leaders</a>",
    "      </div>",
    "    </section>",
    "  </main>",
    "</body>",
    "</html>"
  ].join("\n");
}

export async function buildLiveSite() {
  const scoringRaw = await readFile(DATA_FILE, "utf8");
  const scoringPayload = JSON.parse(scoringRaw);
  const goalieRaw = await readFile(GOALIE_DATA_FILE, "utf8");
  const goaliePayload = JSON.parse(goalieRaw);
  const womensRaw = await readFile(WOMENS_DATA_FILE, "utf8");
  const womensPayload = JSON.parse(womensRaw);
  const womensGoalieRaw = await readFile(WOMENS_GOALIE_DATA_FILE, "utf8");
  const womensGoaliePayload = JSON.parse(womensGoalieRaw);

  await mkdir(LIVE_DIR, { recursive: true });
  await mkdir(GOALIE_LIVE_DIR, { recursive: true });
  await mkdir(WOMENS_LIVE_DIR, { recursive: true });
  await mkdir(WOMENS_GOALIE_LIVE_DIR, { recursive: true });

  await copyFile(DATA_FILE, LIVE_JSON_FILE);
  await copyFile(IMAGE_FILE, LIVE_IMAGE_FILE);
  await writeFile(LIVE_INDEX_FILE, `${buildLiveHtml(scoringPayload)}\n`, "utf8");

  await copyFile(GOALIE_DATA_FILE, GOALIE_LIVE_JSON_FILE);
  await copyFile(GOALIE_IMAGE_FILE, GOALIE_LIVE_IMAGE_FILE);
  await writeFile(GOALIE_LIVE_INDEX_FILE, `${buildGoalieLiveHtml(goaliePayload)}\n`, "utf8");

  await copyFile(WOMENS_DATA_FILE, WOMENS_LIVE_JSON_FILE);
  await copyFile(WOMENS_IMAGE_FILE, WOMENS_LIVE_IMAGE_FILE);
  await writeFile(WOMENS_LIVE_INDEX_FILE, `${buildWomensLiveHtml(womensPayload)}\n`, "utf8");

  await copyFile(WOMENS_GOALIE_DATA_FILE, WOMENS_GOALIE_LIVE_JSON_FILE);
  await copyFile(WOMENS_GOALIE_IMAGE_FILE, WOMENS_GOALIE_LIVE_IMAGE_FILE);
  await writeFile(WOMENS_GOALIE_LIVE_INDEX_FILE, `${buildWomensGoalieLiveHtml(womensGoaliePayload)}\n`, "utf8");

  await writeFile(NO_JEKYLL_FILE, "", "utf8");
}

if (process.argv[1] && process.argv[1].endsWith("site.js")) {
  buildLiveSite()
    .then(() => {
      console.log(`Live site updated in ${LIVE_DIR}`);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
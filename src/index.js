import { scrapeTop10 } from "./scrape.js";
import { renderImage } from "./render.js";
import { DATA_FILE, IMAGE_FILE } from "./config.js";

async function main() {
  const payload = await scrapeTop10();
  await renderImage(payload);

  console.log(`Done. Wrote ${DATA_FILE} and ${IMAGE_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import { scrapeTop10 } from "./scrape.js";
import { renderImage } from "./render.js";
import { scrapeTopGoalies } from "./scrape_goalies.js";
import { renderGoalieImage } from "./render_goalies.js";
import { scrapeWomensTop10 } from "./scrape_womens.js";
import { scrapeWomensTopGoalies } from "./scrape_womens_goalies.js";
import { renderWomensImage } from "./render_womens.js";
import { renderWomensGoalieImage } from "./render_womens_goalies.js";
import { DATA_FILE, GOALIE_DATA_FILE, GOALIE_IMAGE_FILE, IMAGE_FILE } from "./config.js";
import {
  WOMENS_DATA_FILE,
  WOMENS_GOALIE_DATA_FILE,
  WOMENS_GOALIE_IMAGE_FILE,
  WOMENS_IMAGE_FILE
} from "./config.js";

async function main() {
  const scoringPayload = await scrapeTop10();
  await renderImage(scoringPayload);

  const goaliePayload = await scrapeTopGoalies();
  await renderGoalieImage(goaliePayload);

  const womensPayload = await scrapeWomensTop10();
  await renderWomensImage(womensPayload);

  const womensGoaliePayload = await scrapeWomensTopGoalies();
  await renderWomensGoalieImage(womensGoaliePayload);

  console.log(
    `Done. Wrote ${DATA_FILE}, ${IMAGE_FILE}, ${GOALIE_DATA_FILE}, ${GOALIE_IMAGE_FILE}, ${WOMENS_DATA_FILE}, ${WOMENS_IMAGE_FILE}, ${WOMENS_GOALIE_DATA_FILE}, and ${WOMENS_GOALIE_IMAGE_FILE}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

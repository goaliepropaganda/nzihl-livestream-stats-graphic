export const STATS_URL =
  "https://www.nzihl.com/leagues/stats_hockey.cfm?clientid=7131&leagueid=35499&printPage=1";

export const BASE_URL = "https://www.nzihl.com/leagues/";

export const REQUEST_HEADERS = {
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-NZ,en;q=0.9",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
};

export const OUTPUT_DIR = "output";
export const DATA_FILE = `${OUTPUT_DIR}/top10.json`;
export const IMAGE_FILE = `${OUTPUT_DIR}/top10.png`;

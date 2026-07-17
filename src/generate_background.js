import { writeFile } from "node:fs/promises";
import { Jimp } from "jimp";
import { Resvg } from "@resvg/resvg-js";

const WIDTH = 1920;
const HEIGHT = 1080;

async function generateBackground() {
  // SVG with just the gradient background
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <defs>
      <linearGradient id="bgGradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#08111A"/>
        <stop offset="55%" stop-color="#0B1724"/>
        <stop offset="100%" stop-color="#06101B"/>
      </linearGradient>
      <radialGradient id="leftGlow" cx="25%" cy="18%" r="60%">
        <stop offset="0%" stop-color="rgba(58, 143, 255, 0.24)"/>
        <stop offset="75%" stop-color="rgba(58, 143, 255, 0.08)"/>
        <stop offset="100%" stop-color="rgba(58, 143, 255, 0)"/>
      </radialGradient>
      <radialGradient id="rightGlow" cx="75%" cy="20%" r="58%">
        <stop offset="0%" stop-color="rgba(58, 143, 255, 0.18)"/>
        <stop offset="75%" stop-color="rgba(58, 143, 255, 0.05)"/>
        <stop offset="100%" stop-color="rgba(58, 143, 255, 0)"/>
      </radialGradient>
    </defs>
    <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="url(#bgGradient)"/>
    <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="url(#leftGlow)"/>
    <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="url(#rightGlow)"/>
  </svg>`;

  const baseSvg = Buffer.from(svg, "utf8");
  const resvg = new Resvg(baseSvg, {
    fitTo: {
      mode: "width",
      value: WIDTH
    }
  });
  const basePng = resvg.render().asPng();
  const canvas = await Jimp.read(Buffer.from(basePng));

  const pngBuffer = await canvas.getBuffer("image/png");
  await writeFile("./output/background.png", pngBuffer);
  console.log("✓ Generated background.png");
}

generateBackground().catch(console.error);

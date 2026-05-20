# NZIHL Player Scoring Leaders Graphic

This project scrapes the NZIHL scoring leaders page, grabs the top 10 points scorers, follows each player profile link to fetch the player headshot URL, and renders a transparent 1920x1080 PNG graphic.

## Included Output

- `output/top10.json`: Structured player data (name, position, team, GP, G, A, Pts, p/G, +/- and profile image URL)
- `output/top10.png`: Rendered leaderboard image with a transparent background and a 80px transparent border

## Local Usage

```bash
npm install
npm run build
```

After running, check the `output` folder.

## Live Site (GitHub Pages)

The repository includes `.github/workflows/deploy-live.yml`, which builds fresh data and deploys a live site from the `docs` folder every 12 hours (and on manual trigger).

### One-time setup

1. In GitHub, open **Settings > Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Run the **Deploy Live NZIHL Leaders** workflow once from the Actions tab.

Your live page URL will be:

`https://<your-github-username>.github.io/<your-repo-name>/`

### Local preview of live assets

```bash
npm install
npm run build:live
```

This writes:

- `docs/index.html`
- `docs/top10.png`
- `docs/top10.json`

## Automated GitHub Workflow

The workflow in `.github/workflows/update-leaders.yml` runs every 12 hours and can also be started manually.

It does the following:

1. Installs dependencies
2. Runs the scraper + renderer
3. Commits updated files back to the repository

## Notes

- Source stats URL:
  `https://www.nzihl.com/leagues/stats_hockey.cfm?clientid=7131&leagueid=35499&printPage=1`
- Player profile headshot extraction reads the `background-image` value from the profile element with class:
  `largeHeadshot rounded-circle m-3 bg-light`

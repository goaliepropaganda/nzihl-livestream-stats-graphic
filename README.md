# NZIHL Player Scoring Leaders Graphic

This project scrapes NZIHL skater and goalie leaderboards, follows each player profile link to fetch the player headshot URL (or team logo fallback), and renders transparent 1920x1080 PNG graphics.

## Included Output

- `output/top10.json`: Structured player data (name, position, team, GP, G, A, Pts, p/G, +/- and profile image URL)
- `output/NZIHL_top10.png`: Rendered NZIHL skater leaderboard image
- `output/goalies.json`: Structured goalie data (position, name, team, GP, W, L, GAA, SV% and profile image URL)
- `output/NZIHL_goalies.png`: Rendered NZIHL goalie leaderboard image
- `output/womens_top10.json`: Structured NZWIHL player data
- `output/womens_top10.png`: Rendered NZWIHL player leaderboard image
- `output/womens_goalies.json`: Structured NZWIHL goalie data
- `output/womens_goalies.png`: Rendered NZWIHL goalie leaderboard image
- `output/team-comparison.png`: Rendered team comparison graphic from `src/Team Comparison - 30.05.2026.xlsx`

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

Goalie page URL (separate path):

`https://<your-github-username>.github.io/<your-repo-name>/goalies/`

NZWIHL player page URL:

`https://<your-github-username>.github.io/<your-repo-name>/womens/`

NZWIHL goalie page URL:

`https://<your-github-username>.github.io/<your-repo-name>/womens-goalies/`

### Local preview of live assets

```bash
npm install
npm run build:live
```

This writes:

- `docs/index.html`
- `docs/NZIHL_top10.png`
- `docs/top10.json`
- `docs/goalies/index.html`
- `docs/goalies/NZIHL_goalies.png`
- `docs/goalies/goalies.json`
- `docs/womens/index.html`
- `docs/womens/womens_top10.png`
- `docs/womens/womens_top10.json`
- `docs/womens-goalies/index.html`
- `docs/womens-goalies/womens_goalies.png`
- `docs/womens-goalies/womens_goalies.json`

## Automated GitHub Workflow

The workflow in `.github/workflows/deploy-live.yml` runs every 12 hours and can also be started manually.

It does the following:

1. Installs dependencies
2. Runs the scraper + renderer for NZIHL and NZWIHL skaters and goalies
3. Builds live assets in `docs`
4. Deploys the site to GitHub Pages

## Notes

- Source stats URL:
  `https://www.nzihl.com/leagues/stats_hockey.cfm?clientid=7131&leagueid=35499&printPage=1`
- Source goalie URL:
  `https://www.nzihl.com/leagues/stats_hockey.cfm?clientid=7131&leagueID=35499&divID=0&statType=goalie&showGameType=2&printPage=0`
- Source NZWIHL player URL:
  `https://www.nzwihl.com/leagues/stats_hockey.cfm?clientid=7132&leagueid=35501&printPage=1`
- Source NZWIHL goalie URL:
  `https://www.nzwihl.com/leagues/stats_hockey.cfm?clientid=7132&leagueID=35501&divID=0&statType=goalie&showGameType=2&printPage=1`
- Player profile headshot extraction reads the `background-image` value from the profile element with class:
  `largeHeadshot rounded-circle m-3`

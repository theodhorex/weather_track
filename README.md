# Weather Alert System

An automated weather monitoring system that delivers Telegram alerts when potential rain is detected. Data is sourced from the OpenWeatherMap API, persisted to InfluxDB as a time-series store, and analyzed to trigger notifications.

The system runs automatically and at no cost via GitHub Actions, requiring no always-on server.

---

## Features

- **Automated rain detection** — triggers an alert when `rain_probability > 60%` or `weather_main == "Rain"`.
- **Telegram notifications** — alert messages delivered via the Bot API.
- **Time-series storage** — historical readings persisted in InfluxDB 2.x.
- **Anti-spam** — alerts are dispatched only on status transitions (e.g. `normal` to `rain` and back), preventing duplicate messages.
- **Web dashboard** — read-only Next.js 14 frontend that visualises the same InfluxDB data with auto-refresh.

---

## Architecture

```
GitHub Actions
        |
        | schedule (cron)
        v
+------------------+        +------------------+
| Python collector | -----> |   OpenWeatherMap |
| (every 20 min)   |        +------------------+
+--------+---------+
         |
         | write
         v
+------------------+
|     InfluxDB     | <-----+
| bucket: weather  |       |
+--------+---------+       |
         |                 | query (read)
         |                 |
         |        +--------+---------+
         |        | Next.js dashboard |
         |        | (serverless)      |
         |        +--------+---------+
         |                 |
         |                 | render
         |                 v
         |        +------------------+
         |        |     Browser      |
         |        +------------------+
         |
         | query (read)
         v
+------------------+
| Python checker   | ----> Telegram Bot API
| (every 10 min)   |
+------------------+
```

The Python backend writes to InfluxDB and is the single source of truth. The Next.js dashboard reads the same store and renders charts and status cards; the alert checker reads it for transition detection.

---

## Tech Stack

- **Python 3.11** — backend collector and alert checker, executed on a schedule via GitHub Actions
- **Next.js 14 + TypeScript + Tailwind CSS** — web dashboard
- **InfluxDB 2.x** — time-series database, hosted and shared between backend and dashboard
- **OpenWeatherMap API** — weather data source
- **Telegram Bot API** — notification channel

---

## Project Structure

```
weather-alert-system/
├── .github/
│   └── workflows/
│       ├── collector.yml             # cron every 20 minutes, fetch and write
│       └── alert_checker.yml         # cron every 10 minutes, check and alert
├── app/                              # Next.js App Router (dashboard)
│   ├── layout.tsx
│   ├── page.tsx                      # main dashboard page
│   ├── globals.css                   # Tailwind base styles
│   ├── api/
│   │   ├── weather/route.ts          # GET ?range=24h|7d|30d
│   │   └── status/route.ts           # GET, latest reading and alert state
│   └── components/
│       ├── StatusCards.tsx           # list-row style with bracket markers
│       ├── WeatherChart.tsx          # line chart in chart-tile pattern
│       ├── RangeSelector.tsx         # tab-style 24h/7d/30d
│       └── StatTiles.tsx             # ASCII sparkline summary tiles
├── lib/
│   └── influx.ts                     # server-side InfluxDB client wrapper
├── src/                              # Python backend (run via -m)
│   ├── __init__.py
│   ├── alert_checker.py
│   ├── influx_weather_collector.py
│   ├── influx_weather_collector_loop.py
│   ├── test_telegram.py
│   └── weather_forecast.py
├── docs/
│   └── sessions/                     # session summaries for handoff
├── .env.example                      # template env file for Python backend
├── .env.local.example                # template env file for Next.js dashboard
├── .gitignore
├── README.md
├── requirements.txt                  # Python dependencies
├── package.json                      # Node dependencies
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.js
└── utility/                          # additional notes and references
```

---

## Local Setup (Development)

### 1. Clone and Install

```bash
git clone https://github.com/<username>/weather-alert-system.git
cd weather-alert-system
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure `.env`

```bash
cp .env.example .env
```

Fill in all variables as described in [Environment Variables](#environment-variables).

### 3. Run Locally (Loop Mode)

```bash
python -m src.influx_weather_collector_loop
```

To run the alert checker manually:

```bash
python -m src.alert_checker
```

To test the Telegram connection:

```bash
python -m src.test_telegram --rain
```

---

## GitHub Actions Deployment

The project is designed to run automatically via GitHub Actions, with no local server required.

### Step 1: Push to GitHub

```bash
git init                            # if not already a repository
git add -A
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/<username>/weather-alert-system.git
git push -u origin main
```

### Step 2: Add GitHub Secrets

In your GitHub repository, navigate to:

**Settings → Secrets and variables → Actions → New repository secret**

Add the following eight secrets (names must match exactly):

| Secret name             | Value / example                                     |
|-------------------------|-----------------------------------------------------|
| `OPENWEATHER_API_KEY`   | API key from openweathermap.org/api                 |
| `INFLUX_URL`            | `https://influxdb.asoytabang.online`                |
| `INFLUX_TOKEN`          | your InfluxDB API token                             |
| `INFLUX_ORG`            | your InfluxDB organisation ID or name               |
| `INFLUX_BUCKET`         | `weather`                                           |
| `CITY`                  | `Yogyakarta,ID`                                     |
| `TELEGRAM_TOKEN`        | bot token from BotFather                            |
| `TELEGRAM_CHAT_ID`      | destination chat ID (user, group, or channel)       |

Never commit real values to the repository. All secrets are read at runtime by the workflows via `${{ secrets.NAME }}`.

### Step 3: Verify the Workflows

Open the Actions tab in your GitHub repository:

- Select the **Weather Collector** workflow, then **Run workflow** for a manual test.
- Select the **Weather Alert Checker** workflow, then **Run workflow** for a manual test. (Alerts are only sent on actual status transitions.)

A green status indicates a correct configuration.

### Step 4: Monitor Executions

The Actions tab displays:

- A list of all runs (scheduled and manual).
- Step-by-step stdout and stderr logs.
- Status: success, failure, or skipped.

To inspect the data in InfluxDB, use the InfluxDB UI or run a Flux query via the CLI.

---

## Environment Variables

| Variable                 | Description                                          | Required |
|--------------------------|------------------------------------------------------|----------|
| `OPENWEATHER_API_KEY`    | OpenWeatherMap API key                               | Yes      |
| `CITY`                   | Monitored city (default: `Yogyakarta,ID`)            | Yes      |
| `INFLUX_URL`             | InfluxDB URL (default: `https://influxdb.asoytabang.online`) | Yes |
| `INFLUX_TOKEN`           | InfluxDB API token                                   | Yes      |
| `INFLUX_ORG`             | InfluxDB organisation ID or name                     | Yes      |
| `INFLUX_BUCKET`          | Bucket name (`weather`)                              | Yes      |
| `TELEGRAM_TOKEN`         | Bot token from BotFather                             | Yes (alert checker only) |
| `TELEGRAM_CHAT_ID`       | Destination chat ID for notifications                | Yes (alert checker only) |
| `FETCH_INTERVAL_SECONDS` | (legacy loop only) Fetch interval in seconds         | No       |

---

## InfluxDB Schema

**Bucket:** `weather`

**Measurement `weather_data`** (written on each collector run):

| Field              | Type    | Description                            |
|--------------------|---------|----------------------------------------|
| `temp`             | float   | Temperature in degrees Celsius         |
| `humidity`         | int     | Relative humidity in percent           |
| `rain_probability` | float   | Probability of precipitation, 0 to 100 |
| `weather_main`     | string  | Clear, Clouds, Rain, and so on         |

Tag: `city` (lowercase, for example `yogyakarta`).

**Measurement `alert_state`** (written on status transitions):

| Field    | Type   | Description                   |
|----------|--------|-------------------------------|
| `status` | string | `"normal"` or `"rain"`        |

Tag: `city` (same as above).

---

## Anti-Spam Behaviour

The last known status (`normal` or `rain`) is stored in the InfluxDB measurement `alert_state`, not in a local file. The local-file approach is unsuitable for GitHub Actions because each runner is ephemeral.

Flow for each alert checker run:

1. Query the most recent reading from `weather_data` (last hour).
2. Compute the current status against the thresholds.
3. Query the last status from `alert_state` (last 30 days, `last()`).
4. If the status has changed, send the Telegram message and write the new status to InfluxDB.
5. If the status is unchanged, do nothing (no-op).

---

## Troubleshooting

**Workflow fails with "Missing required env vars":**
Ensure all eight secrets are added under Settings → Secrets.

**Telegram messages are not delivered:**
Verify that `TELEGRAM_CHAT_ID` is correct (positive number for users, negative for groups, `-100...` for channels). The bot must already be a member of the chat. For channels, the bot must be an administrator.

**InfluxDB writes fail:**
Verify that the token is still valid and has not expired, and that `INFLUX_ORG` and `INFLUX_BUCKET` match exactly what is configured in the InfluxDB UI.

**No historical data appears in InfluxDB:**
Confirm that the collector is running (check the Actions tab). The first scheduled run may be delayed by up to 20 minutes after the initial push.

---

## Dashboard (Next.js)

The repository also contains a web dashboard built with Next.js 14 (App Router, TypeScript, Tailwind) at the same root as the Python backend. The dashboard is read-only: it queries the same InfluxDB instance. The Python backend is unchanged and continues to run automatically via GitHub Actions.

### Dashboard Features

- **Current conditions panel** — list-row style with ASCII bracket markers `[+]`, `[!]`, `[?]`. Displays temperature, humidity, rain probability, condition, and alert status.
- **Time-series chart (Recharts)** — temperature (solid line) and humidity (dashed line) with legend, rendered in the chart-tile pattern (hairline border, no rounded corners, figure caption).
- **ASCII sparkline tiles** — four summary statistics (mean and max temperature, mean and max humidity) as sparse-line ASCII plots, following the chart-tile design pattern.
- **Range selector** — 24 hours, 7 days, 30 days, with automatic downsampling via `aggregateWindow`.
- **Auto-refresh** — every 2 minutes via client-side polling.
- **Loading and error states** — a blinking cursor `[·]` while loading, an error block with the `[!]` marker on failure. The page never appears blank.

### Design System

The dashboard follows a terminal-native, manpage-style design system:

| Aspect          | Treatment                                                                                       |
|-----------------|-------------------------------------------------------------------------------------------------|
| Font            | Berkeley Mono (paid) with JetBrains Mono via `next/font/google` as the open-source substitute. |
| Canvas          | Warm cream `#fdfcfc` as the sole body background.                                               |
| Dark surface    | Used only once on the page: the small `live` badge in the hero.                                 |
| Borders         | 1px hairline `rgba(15, 0, 0, 0.12)` for section dividers and tile borders. No drop shadows.     |
| Radius          | 0px for containers, 4px for interactive elements.                                               |
| Bullets / icons | ASCII bracket markers `[+]`, `[-]`, `[!]`, `[?]`, `+`, `-` replace all iconography.             |
| Spacing         | 96px section rhythm (`spacing.section`).                                                        |
| Accent colours  | The Apple HIG semantic ramp is reserved for the in-product TUI and is not used on the dashboard. |

### Local Setup

```bash
# Install Bun (https://bun.sh) if not already present:
# curl -fsSL https://bun.sh/install | bash

bun install
cp .env.local.example .env.local
# Fill in INFLUX_URL, INFLUX_TOKEN, INFLUX_ORG, INFLUX_BUCKET in .env.local

bun run dev
# Open http://localhost:3000
```

npm is also supported; the lockfile will simply become `package-lock.json`.

`.env.local` is git-ignored. Never commit real values.

### Environment Variables (Next.js)

| Variable        | Description                                                            |
|-----------------|------------------------------------------------------------------------|
| `INFLUX_URL`    | InfluxDB URL (for example `https://influxdb.asoytabang.online`)        |
| `INFLUX_TOKEN`  | InfluxDB API token (read scope is sufficient)                          |
| `INFLUX_ORG`    | InfluxDB organisation ID or name                                       |
| `INFLUX_BUCKET` | Bucket name (default `weather`)                                        |

### Deployment to Vercel

1. Push the repository to GitHub.
2. Open [vercel.com/new](https://vercel.com/new), then **Import Project** and select the repository.
3. The **Framework Preset** is auto-detected as Next.js.
4. Leave the **Root Directory** empty; Next.js lives at the root.
5. In **Environment Variables**, add the four variables above with the same values as in `.env.local` and the GitHub Secrets.
6. Click **Deploy**. Subsequent pushes to `main` trigger automatic redeployments.

Notes:
- Vercel reads `package.json` and runs `npm run build` automatically. No additional configuration is required.
- The default Vercel region (Washington) may add 200 to 400 ms of latency to InfluxDB in Asia. For better performance, set the Vercel region to Singapore via Settings → Functions → Region.

### API Endpoints (for debugging and testing)

```bash
# Latest status (current weather and alert)
curl http://localhost:3000/api/status

# Time-series points for the chart
curl 'http://localhost:3000/api/weather?range=24h'   # last 24 hours, 15-minute window
curl 'http://localhost:3000/api/weather?range=7d'    # last 7 days,  1-hour window
curl 'http://localhost:3000/api/weather?range=30d'   # last 30 days, 3-hour window
```

Response shape for `/api/weather`:
```json
{ "range": "24h", "points": [{ "time": "2026-09-05T10:00:00.000Z", "temp": 28.4, "humidity": 76 }] }
```

---

## Roadmap

- [x] MVP: single-city fetch with a simple alert.
- [x] Migration to GitHub Actions (serverless execution).
- [x] Anti-spam via InfluxDB `alert_state`.
- [ ] Multi-city support with per-city configuration.
- [ ] Extreme-temperature alerts.
- [ ] Grafana integration for time-series dashboards.
- [x] Web dashboard (Next.js + Recharts).

---

## License

MIT. Free to use, modify, and distribute with attribution.

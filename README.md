# Weather Alert System

Sistem monitoring cuaca otomatis yang mengirim **alert ke Telegram** ketika terdeteksi potensi hujan. Data diambil dari **OpenWeatherMap API**, disimpan ke **InfluxDB** sebagai time-series database, lalu dianalisis untuk memicu notifikasi.

Project ini berjalan **otomatis & gratis via GitHub Actions** — tidak perlu server 24/7.

---

## Fitur Utama

- 🌧️ **Deteksi hujan otomatis** — alert jika `rain_probability > 60%` **ATAU** `weather_main == "Rain"`.
- 📲 **Notifikasi Telegram** — pesan alert terkirim via Bot API dengan emoji 🌧️/☀️.
- 🗄️ **Time-series storage** — data historis tersimpan rapi di InfluxDB 2.x.
- 🚫 **Anti-spam** — alert hanya dikirim saat status BERUBAH (`normal → rain` atau `rain → normal`), bukan tiap kali kondisi terpenuhi.
- ☁️ **Serverless** — dijalankan via GitHub Actions cron, tidak perlu hosting sendiri.

---

## Arsitektur

```
┌─────────────────────┐
│  GitHub Actions     │  schedule (cron)
│  ┌───────────────┐  │
│  │ collector.yml │  │  tiap 20 menit
│  └───────┬───────┘  │
│          │ fetch    │
│          ▼          │
│   OpenWeatherMap    │
│          │ write    │
│          ▼          │
│       InfluxDB      │  ← data historis persistent di sini
│          │ query    │
│  ┌───────┴───────┐  │
│  │alert_checker  │  │  tiap 10 menit
│  │     .yml      │  │
│  └───────┬───────┘  │
│          │ detect   │
│          ▼          │
│   Telegram Bot API  │
└─────────────────────┘
```

> **Data historis tetap tersimpan di InfluxDB** yang sudah ada (`https://influxdb.asoytabang.online`). GitHub Actions hanya menjalankan **compute** (fetch + cek alert) secara berkala — tidak menyimpan data apa pun di runner.

---

## Tech Stack

- **Python 3.11** — backend collector + alert checker (cron via GitHub Actions)
- **Next.js 14 + TypeScript + Tailwind** — web dashboard (lihat section [Dashboard](#dashboard-nextjs))
- **InfluxDB 2.x** — time-series database (hosted, shared antara backend & dashboard)
- **OpenWeatherMap API** — sumber data cuaca
- **Telegram Bot API** — channel notifikasi
- **GitHub Actions** — scheduler (cron) gratis untuk backend

---

## Struktur Project

```
weather-alert-system/
├── .github/
│   └── workflows/
│       ├── collector.yml         # cron tiap 20 menit → fetch + write
│       └── alert_checker.yml     # cron tiap 10 menit → cek + alert
├── app/                          # Next.js App Router (dashboard)
│   ├── layout.tsx
│   ├── page.tsx                  # dashboard utama
│   ├── globals.css
│   ├── api/
│   │   ├── weather/route.ts
│   │   └── status/route.ts
│   └── components/
│       ├── StatusCards.tsx        # list-row style dengan [+] [!] [?] markers
│       ├── WeatherChart.tsx       # recharts line chart dalam chart-tile
│       ├── RangeSelector.tsx      # tab-style 24h/7d/30d
│       ├── StatTiles.tsx          # 4 ASCII sparkline tiles
│       └── TuiMockup.tsx          # hero dark surface + ASCII wordmark
├── lib/influx.ts                 # InfluxDB client wrapper (server-side)
├── src/                          # Python backend (dipanggil via -m)
│   ├── __init__.py
│   ├── alert_checker.py
│   ├── influx_weather_collector.py
│   ├── influx_weather_collector_loop.py
│   ├── test_telegram.py
│   └── weather_forecast.py
├── .env.example                  # template env untuk Python (backend)
├── .env.local.example            # template env untuk Next.js (dashboard)
├── .gitignore
├── README.md
├── requirements.txt              # Python deps
├── package.json                  # Node deps
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.js
└── utility/                      # catatan / referensi tambahan
```

---

## Setup (untuk development lokal)

### 1. Clone & Install

```bash
git clone https://github.com/<username>/weather-alert-system.git
cd weather-alert-system
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Konfigurasi `.env`

```bash
cp .env.example .env
```

Isi semua variabel (lihat bagian [Environment Variables](#environment-variables)).

### 3. Jalankan Lokal (mode loop)

```bash
python influx_weather_collector_loop.py
```

Untuk menjalankan alert checker manual:

```bash
python alert_checker.py
```

Test koneksi Telegram:

```bash
python test_telegram.py --rain
```

---

## Setup untuk GitHub Actions (deployment)

Project ini didesain untuk berjalan otomatis via GitHub Actions — **tidak perlu server lokal**.

### Langkah 1: Push ke GitHub

```bash
git init                       # kalau belum
git add -A
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/<username>/weather-alert-system.git
git push -u origin main
```

### Langkah 2: Tambahkan GitHub Secrets

Masuk ke repo GitHub kamu, lalu:

**Settings → Secrets and variables → Actions → New repository secret**

Tambahkan 7 secret berikut (nama harus persis sama):

| Secret Name          | Isi / Contoh                                       |
|----------------------|----------------------------------------------------|
| `OPENWEATHER_API_KEY`| API key dari [openweathermap.org/api](https://openweathermap.org/api) |
| `INFLUX_URL`         | `https://influxdb.asoytabang.online`               |
| `INFLUX_TOKEN`       | API token InfluxDB kamu                            |
| `INFLUX_ORG`         | Organization ID/name di InfluxDB                   |
| `INFLUX_BUCKET`      | `weather`                                          |
| `CITY`               | `Yogyakarta,ID`                                    |
| `TELEGRAM_TOKEN`     | Token bot dari [@BotFather](https://t.me/BotFather)|
| `TELEGRAM_CHAT_ID`   | Chat ID tujuan notifikasi (user / grup / channel)  |

> ⚠️ **Jangan pernah commit nilai asli ke repo.** Semua secret dibaca di runtime oleh workflow lewat `${{ secrets.NAMA }}`.

### Langkah 3: Verifikasi Workflow

Buka tab **Actions** di GitHub repo:

- Pilih workflow **Weather Collector** → **Run workflow** (test manual)
- Pilih workflow **Weather Alert Checker** → **Run workflow** (test manual, opsional — alert terkirim kalau status berubah)

Kalau log hijau ✅ artinya konfigurasi benar.

### Langkah 4: Pantau Eksekusi

Tab **Actions** menampilkan:

- Daftar semua run (otomatis & manual)
- Log stdout/stderr tiap step
- Status: ✅ sukses / ❌ gagal / ⏭️ skipped

Untuk cek data di InfluxDB, gunakan InfluxDB UI atau query Flux via CLI.

---

## Environment Variables

| Variable                | Deskripsi                                          | Wajib |
|-------------------------|----------------------------------------------------|-------|
| `OPENWEATHER_API_KEY`   | API key OpenWeatherMap                              | ✅   |
| `CITY`                  | Kota yang dimonitor (default: `Yogyakarta,ID`)      | ✅   |
| `INFLUX_URL`            | URL InfluxDB (default: `https://influxdb.asoytabang.online`) | ✅ |
| `INFLUX_TOKEN`          | API token InfluxDB                                  | ✅   |
| `INFLUX_ORG`            | Organization ID/name                               | ✅   |
| `INFLUX_BUCKET`         | Bucket name (`weather`)                             | ✅   |
| `TELEGRAM_TOKEN`        | Token bot dari BotFather                            | ✅ (alert checker saja) |
| `TELEGRAM_CHAT_ID`      | Chat ID tujuan notifikasi                           | ✅ (alert checker saja) |
| `FETCH_INTERVAL_SECONDS`| (legacy loop only) Interval fetch dalam detik       | ❌   |

---

## InfluxDB Schema

**Bucket:** `weather`

**Measurement `weather_data`** (ditulis tiap collector run):

| Field              | Type    | Keterangan                              |
|--------------------|---------|-----------------------------------------|
| `temp`             | float   | Suhu (°C)                               |
| `humidity`         | int     | Kelembapan (%)                          |
| `rain_probability` | float   | Probabilitas hujan 0–100% (dari `pop`)  |
| `weather_main`     | string  | Clear / Clouds / Rain / dll             |

Tag: `city` (lowercase, misal `yogyakarta`)

**Measurement `alert_state`** (ditulis saat transisi status):

| Field    | Type   | Keterangan                  |
|----------|--------|-----------------------------|
| `status` | string | `"normal"` atau `"rain"`    |

Tag: `city` (sama dengan measurement di atas)

---

## Cara Kerja Anti-Spam

Status terakhir (`normal` / `rain`) disimpan di InfluxDB measurement `alert_state` — **bukan** di file lokal lagi, karena GitHub Actions runner fresh setiap kali job dijalankan.

Flow tiap alert checker run:

1. Query data cuaca **terbaru** dari `weather_data` (1 jam terakhir)
2. Deteksi status saat ini berdasarkan threshold
3. Query status terakhir dari `alert_state` (30 hari terakhir, `last()`)
4. **Kalau status BERUBAH**: kirim Telegram + tulis status baru ke InfluxDB
5. **Kalau status SAMA**: diam (no-op)

---

## Troubleshooting

**Workflow gagal dengan "Missing required env vars":**
→ Cek semua secret sudah ditambahkan di Settings → Secrets.

**Telegram gak nyampe:**
→ Cek `TELEGRAM_CHAT_ID` benar (user = angka positif, grup = negatif, channel = `-100...`).
→ Bot harus sudah di-add ke chat. Untuk channel, bot harus admin.

**InfluxDB write gagal:**
→ Cek token masih valid dan belum expired.
→ Cek `INFLUX_ORG` dan `INFLUX_BUCKET` persis sama dengan yang ada di InfluxDB UI.

**Data lama gak nongol di InfluxDB:**
→ Pastikan collector jalan (lihat tab Actions). Workflow pertama mungkin delay ~20 menit dari push.

---

## Roadmap

- [x] MVP — fetch 1 kota + alert sederhana
- [x] Migrasi ke GitHub Actions (serverless)
- [x] Anti-spam via InfluxDB `alert_state`
- [ ] Multi-kota dengan konfigurasi per kota
- [ ] Alert suhu ekstrem
- [ ] Integrasi Grafana untuk dashboard time-series
- [ ] Web dashboard (Next.js + Recharts) ← **done**

---

## Dashboard (Next.js)

Repo ini juga berisi **web dashboard** (Next.js 14 App Router + TypeScript + Tailwind + Recharts) di **root yang sama** dengan backend Python. Dashboard cuma **membaca** data dari InfluxDB yang sama — backend Python tidak diubah dan tetap jalan otomatis via GitHub Actions.

### Lokasi & struktur

```
root/
├── app/                          # ← Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx                  # dashboard utama (status cards + chart)
│   ├── globals.css               # Tailwind
│   ├── api/
│   │   ├── weather/route.ts      # GET ?range=24h|7d|30d → time-series points
│   │   └── status/route.ts       # GET → latest point + alert_state
│   └── components/
│       ├── StatusCards.tsx        # list-row style dengan [+] [!] [?] markers
│       ├── WeatherChart.tsx       # recharts line chart dalam chart-tile
│       ├── RangeSelector.tsx      # tab-style 24h/7d/30d
│       ├── StatTiles.tsx          # 4 ASCII sparkline tiles
│       └── TuiMockup.tsx          # hero dark surface + ASCII wordmark
├── lib/influx.ts                 # InfluxDB client wrapper (server-side)
├── package.json
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.js
├── postcss.config.mjs
├── .env.local.example            # template env untuk Next.js
└── ... (backend Python, workflows, dll tetap di tempat masing-masing)
```

> File Python di `src/`, workflow di `.github/workflows/`, dan `requirements.txt` **tidak disentuh** oleh setup Next.js.

### Fitur dashboard

- 🌡️ **Current conditions** — list-row style dengan ASCII bracket markers `[+]`, `[!]`, `[?]`. Temperature, humidity, rain probability, condition, alert status.
- 📈 **Timeseries chart (recharts)** — temperature (solid) + humidity (dashed) dengan legend, di-render dalam `chart-tile` pattern (hairline border, no rounded, fig caption).
- 📊 **ASCII sparkline tiles** — 4 summary stats (avg/max temp, avg/max humidity) sebagai sparse-line ASCII plots di atas canvas — sesuai `chart-tile` design pattern.
- ⏱️ **Range selector** — 24h / 7d / 30d, dengan downsampling otomatis via `aggregateWindow`.
- 🔄 **Auto-refresh** — tiap 2 menit (client-side `setInterval`).
- ⚠️ **Loading & error state** — blinking cursor `[·]` saat loading, error block dengan `[!]` marker, halaman tidak pernah blank.

### Design system

Dashboard ini pakai **terminal-native / manpage design system** (lihat `DESIGN-opencode.ai.md` untuk full spec):

| Aspek | Treatment |
|---|---|
| Font | Berkeley Mono (paid) → fallback ke JetBrains Mono via `next/font/google`. Single monospaced face, no sans/italic anywhere. |
| Canvas | Warm cream `#fdfcfc` (`surface.canvas`) sebagai satu-satunya body background. |
| Dark surface | Hanya **satu** di seluruh halaman: TUI mockup hero (`surface.dark` = `#201d1d`). |
| Borders | 1px hairline `rgba(15,0,0,0.12)` untuk section divider & tile border. Tidak ada drop shadow. |
| Radius | `0px` untuk containers, `4px` (`rounded.sm`) untuk interactive elements. |
| Bullet / icon | ASCII bracket markers `[+]`, `[-]`, `[!]`, `[?]`, `+`, `−` sebagai ganti icon/SVG. |
| Spacing | Section rhythm 96px (`spacing.section`). |
| Wordmark | Block-pixel ASCII art di nav + di dalam hero TUI mockup. |
| Accent colors | Apple HIG semantic ramp (blue, warning, danger, success) **tidak dipakai** di marketing chrome — reserved untuk in-product TUI. Status alerts pakai bracket + warna netral. |

### Setup lokal

```bash
# Install Bun dulu (https://bun.sh) — project ini pakai Bun sebagai package manager
# curl -fsSL https://bun.sh/install | bash

bun install
cp .env.local.example .env.local
# Edit .env.local: isi INFLUX_URL, INFLUX_TOKEN, INFLUX_ORG, INFLUX_BUCKET

bun run dev
# buka http://localhost:3000
```

Atau kalau mau pakai npm (tetap supported, lockfile akan jadi `package-lock.json`):

```bash
npm install
npm run dev
```

`.env.local` di-gitignore — jangan commit nilai asli.

### Environment Variables (Next.js)

| Variable        | Deskripsi                                       |
|-----------------|-------------------------------------------------|
| `INFLUX_URL`    | URL InfluxDB (contoh: `https://influxdb.asoytabang.online`) |
| `INFLUX_TOKEN`  | API token InfluxDB (read scope cukup)           |
| `INFLUX_ORG`    | Organization ID/name                            |
| `INFLUX_BUCKET` | Bucket name (`weather`)                          |

### Deploy ke Vercel

1. **Push repo ke GitHub** (kalau belum).
2. Buka [vercel.com/new](https://vercel.com/new) → **Import Project** → pilih repo ini.
3. **Framework Preset**: auto-detect sebagai Next.js.
4. **Root Directory**: kosongkan (Next.js ada di root).
5. Klik **Environment Variables**, tambahkan 4 variabel di atas (`INFLUX_URL`, `INFLUX_TOKEN`, `INFLUX_ORG`, `INFLUX_BUCKET`) dengan nilai yang sama seperti di `.env.local` / GitHub Secrets.
6. Klik **Deploy**.
7. Setelah deploy sukses, setiap push ke `main` akan auto-redeploy.

> 💡 Vercel otomatis membaca `package.json` dan menjalankan `npm run build`. Tidak perlu konfigurasi tambahan.
>
> ⚠️ Region Vercel default (Washington) mungkin menambah latensi ~200-400ms ke InfluxDB di Asia. Untuk performa lebih baik, pakai Vercel region terdekat (Singapore) lewat Settings → Functions → Region.

### API Endpoints (untuk debugging/testing)

```bash
# Status terbaru (current weather + alert)
curl http://localhost:3000/api/status

# Time-series points untuk chart
curl 'http://localhost:3000/api/weather?range=24h'   # 24 jam, window 15 menit
curl 'http://localhost:3000/api/weather?range=7d'    # 7 hari,  window 1 jam
curl 'http://localhost:3000/api/weather?range=30d'   # 30 hari, window 3 jam
```

Response `weather` shape:
```json
{ "range": "24h", "points": [{ "time": "2026-09-05T10:00:00.000Z", "temp": 28.4, "humidity": 76, "rain_probability": 12.5 }] }
```

---

## Lisensi

MIT — bebas digunakan, dimodifikasi, dan didistribusikan dengan menyertakan atribusi.

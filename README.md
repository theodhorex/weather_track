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

- **Python 3.11**
- **InfluxDB 2.x** — time-series database (hosted)
- **OpenWeatherMap API** — sumber data cuaca
- **Telegram Bot API** — channel notifikasi
- **GitHub Actions** — scheduler (cron) gratis

---

## Struktur Project

```
weather-alert-system/
├── .github/
│   └── workflows/
│       ├── collector.yml         # cron tiap 20 menit → fetch + write
│       └── alert_checker.yml     # cron tiap 10 menit → cek + alert
├── .env.example                  # template konfigurasi lokal
├── .gitignore
├── README.md
├── requirements.txt
├── alert_checker.py              # query InfluxDB + deteksi hujan + kirim Telegram
├── influx_weather_collector.py   # one-shot: fetch OpenWeatherMap → write InfluxDB
├── influx_weather_collector_loop.py  # LEGACY: versi loop kontinyu (local use only)
├── test_telegram.py              # utilitas test koneksi Telegram
├── weather_forecast.py           # utilitas debugging API OpenWeatherMap
├── last_status.txt               # (legacy, sudah tidak dipakai — state sekarang di InfluxDB)
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

---

## Lisensi

MIT — bebas digunakan, dimodifikasi, dan didistribusikan dengan menyertakan atribusi.

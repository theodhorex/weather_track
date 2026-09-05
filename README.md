# Weather Alert System

Sistem monitoring cuaca otomatis yang mengirim **alert ke Telegram** ketika terdeteksi potensi hujan. Data diambil dari **OpenWeatherMap API**, disimpan ke **InfluxDB** sebagai time-series database, lalu dianalisis untuk memicu notifikasi.

> Cocok sebagai sistem peringatan dini sederhana berbasis data historis dengan deteksi multi-kondisi: curah hujan, kelembapan, tren kenaikan, dan suhu ekstrem.

---

## Fitur Utama

- 🌧️ **Deteksi hujan otomatis** — alert jika `rain_probability > 60%`, atau kombinasi `humidity > 85%` + `clouds > 70%`, atau tren kenaikan probabilitas hujan.
- 📲 **Notifikasi Telegram** — pesan alert terkirim via Bot API.
- 🗄️ **Time-series storage** — data historis tersimpan rapi di InfluxDB 2.x.
- 🚫 **Anti-spam** — cooldown period + deteksi perubahan status, tidak spam alert duplikat.
- 📊 **Bonus** — command interaktif Telegram, alert suhu ekstrem, integrasi Grafana untuk visualisasi.

---

## Arsitektur

```
OpenWeatherMap API
        │
        ▼  (fetch tiap 10–15 menit)
 Script Python (collector + logic)
        │
        ▼  (write point)
   InfluxDB 2.x
        │
        ▼  (query Flux 2 jam terakhir)
  Logic Alert (threshold + tren + cooldown)
        │
        ▼  (kirim pesan)
   Telegram Bot API → User / Grup
```

---

## Tech Stack

- **Python 3.10+**
- **InfluxDB 2.x** — time-series database
- **OpenWeatherMap API** — sumber data cuaca
- **Telegram Bot API** — channel notifikasi
- **Grafana** *(opsional)* — visualisasi dashboard

---

## Struktur Project

```
weather-alert-system/
├── .env.example
├── .gitignore
├── requirements.txt
├── README.md
├── src/
│   ├── config.py          # load env, konstanta threshold
│   ├── owm_client.py      # fetch dari OpenWeatherMap
│   ├── influx_client.py   # write + query Flux
│   ├── alert_logic.py     # deteksi hujan + cooldown
│   ├── notifier.py        # kirim Telegram
│   └── main.py            # orchestrator + scheduler
└── scripts/
    └── init_influx.py     # setup bucket, org, token
```

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/<username>/weather-alert-system.git
cd weather-alert-system
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Setup Akun & API

- **OpenWeatherMap** — daftar di [openweathermap.org/api](https://openweathermap.org/api), ambil API key.
- **Telegram** — chat ke [@BotFather](https://t.me/BotFather), buat bot baru, simpan token & chat_id.
- **InfluxDB** — install lokal atau pakai cloud, buat bucket `weather` dan API token.

### 3. Konfigurasi `.env`

```bash
cp .env.example .env
```

Isi variabel berikut (lihat bagian [Environment Variables](#environment-variables)).

### 4. Jalankan

```bash
python src/main.py
```

Script akan fetch cuaca, simpan ke InfluxDB, dan kirim alert via Telegram ketika kondisi hujan terdeteksi.

---

## Environment Variables

| Variable                    | Deskripsi                                   |
|-----------------------------|---------------------------------------------|
| `OWM_API_KEY`               | API key OpenWeatherMap                       |
| `OWM_CITY`                  | Kota yang dimonitor (default: `Jakarta`)     |
| `OWM_LAT` / `OWM_LON`       | Koordinat (untuk One Call API)               |
| `BOT_TOKEN`                 | Token bot dari BotFather                     |
| `CHAT_ID`                   | ID user/grup tujuan alert                    |
| `INFLUX_URL`                | URL InfluxDB (`http://localhost:8086`)       |
| `INFLUX_TOKEN`              | API token InfluxDB                            |
| `INFLUX_ORG`                | Organization name                            |
| `INFLUX_BUCKET`             | Bucket name (`weather`)                      |
| `FETCH_INTERVAL_MINUTES`    | Interval fetch (default: `15`)               |
| `ALERT_COOLDOWN_MINUTES`    | Cooldown alert (default: `60`)               |
| `RAIN_PROBABILITY_THRESHOLD`| Threshold hujan 0–1 (default: `0.6`)         |
| `HUMIDITY_THRESHOLD`        | Threshold kelembapan % (default: `85`)       |
| `CLOUDS_THRESHOLD`          | Threshold tutupan awan % (default: `70`)     |
| `TEMP_HIGH_THRESHOLD`       | Suhu tinggi ekstrem °C (default: `35`)       |
| `TEMP_LOW_THRESHOLD`        | Suhu rendah ekstrem °C (default: `18`)       |

> File `.env` **wajib** masuk `.gitignore` — jangan pernah commit secret.

---

## Roadmap

- [x] MVP — fetch 1 kota + alert sederhana `rain_probability > 60%`
- [ ] Multi-kota dengan konfigurasi per kota
- [ ] Anti-spam: deteksi perubahan status, bukan hanya threshold sesaat
- [ ] Alert suhu ekstrem
- [ ] Command interaktif Telegram (`/cuaca`, `/status`, `/help`)
- [ ] Integrasi Grafana untuk dashboard time-series
- [ ] Deploy sebagai Docker container / systemd service

Lihat [`WEATHER_ALERT_SYSTEM.md`](./WEATHER_ALERT_SYSTEM.md) untuk dokumentasi teknis lengkap.

---

## Kontribusi

Pull request dan issue sangat diterima. Untuk perubahan besar, buka issue dulu untuk diskusi.

---

## Lisensi

MIT — bebas digunakan, dimodifikasi, dan didistribusikan dengan menyertakan atribusi.
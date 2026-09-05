# Weather Alert System

Sistem monitoring cuaca otomatis yang mengirim notifikasi ke **Telegram** ketika terdeteksi potensi hujan di sebuah kota. Data cuaca diambil secara berkala dari **OpenWeatherMap API**, disimpan ke **InfluxDB** sebagai time-series database, lalu dianalisis menggunakan logic threshold untuk memicu alert.

Project ini cocok sebagai sistem peringatan dini sederhana berbasis data historis, dengan kemampuan deteksi multi-kondisi (curah hujan, kelembapan, tren kenaikan, maupun suhu ekstrem).

---

## Arsitektur Sistem

```
┌────────────────────┐    fetch tiap N menit    ┌──────────────────────┐
│  OpenWeatherMap    │ ───────────────────────► │   Script Python      │
│       API          │                          │  (collector + logic) │
└────────────────────┘                          └──────────┬───────────┘
                                                            │
                                                            │ write points
                                                            ▼
                                               ┌────────────────────────┐
                                               │   InfluxDB 2.x         │
                                               │ (time-series storage)  │
                                               └──────────┬─────────────┘
                                                          │
                                                          │ query Flux
                                                          ▼
                                               ┌────────────────────────┐
                                               │  Logic Pengecekan      │
                                               │  (threshold + tren)    │
                                               └──────────┬─────────────┘
                                                          │
                                                          │ trigger alert
                                                          ▼
                                               ┌────────────────────────┐
                                               │   Telegram Bot API     │
                                               │   → kirim pesan ke     │
                                               │     user / grup        │
                                               └────────────────────────┘
```

**Alur singkat:**
1. Script Python melakukan *polling* ke OpenWeatherMap API secara terjadwal.
2. Hasil respon disimpan sebagai *point* di InfluxDB (measurement: `weather_data`).
3. Script menjalankan query Flux untuk mengambil data 1–2 jam terakhir.
4. Logic alert menilai kondisi (threshold rain_probability, kombinasi humidity/clouds, tren kenaikan) lalu memutuskan apakah perlu kirim notifikasi.
5. Jika kondisi terpenuhi dan tidak dalam masa *cooldown*, Telegram Bot mengirim pesan alert.

---

## Tech Stack

| Komponen            | Teknologi yang digunakan                |
|---------------------|------------------------------------------|
| Bahasa              | Python 3.10+                            |
| Time-Series DB      | InfluxDB 2.x                             |
| Sumber Data Cuaca   | OpenWeatherMap API (free tier OK)        |
| Notifikasi          | Telegram Bot API                         |
| HTTP Client         | `requests` (atau `httpx`)                 |
| InfluxDB Client     | `influxdb-client` (official)             |
| Scheduler (opsional)| `APScheduler`, `cron`, atau Task Scheduler|
| Visualisasi (bonus) | Grafana                                  |

---

## Breakdown Tugas

### Bagian 1 — Setup Sumber Data (API Cuaca)

- [ ] Daftar akun di [OpenWeatherMap](https://openweathermap.org/api)
- [ ] Pilih endpoint: **Current Weather Data** atau **One Call API 3.0**
- [ ] Ambil **API key** dari dashboard OpenWeatherMap
- [ ] Tes endpoint via browser / Postman untuk verifikasi respon JSON
- [ ] Tentukan kota yang akan dimonitor (mis. `Jakarta`, `Bandung`)
- [ ] Simpan API key di `.env` (jangan di-*commit*)

### Bagian 2 — Setup Telegram Bot

- [ ] Buka Telegram, cari **@BotFather**
- [ ] Kirim `/newbot`, ikuti instruksi sampai dapat **bot token**
- [ ] Simpan token di `.env` sebagai `BOT_TOKEN`
- [ ] Mulai chat dengan bot yang baru dibuat (kirim pesan apa saja)
- [ ] Ambil `chat_id` via `https://api.telegram.org/bot<TOKEN>/getUpdates`
- [ ] (Opsional) Tambahkan bot ke grup, gunakan `chat_id` grup untuk broadcast
- [ ] Tes kirim pesan manual via curl

### Bagian 3 — Script Fetch Data Cuaca & Simpan ke InfluxDB

- [ ] Buat project Python + virtual environment
- [ ] Install dependency (`requests`, `influxdb-client`, `python-dotenv`)
- [ ] Setup InfluxDB: buat **organization**, **bucket** (`weather`), dan **token**
- [ ] Implementasi fungsi `fetch_weather(city, api_key)`
- [ ] Mapping respon OpenWeatherMap ke struktur InfluxDB:
  - **Measurement**: `weather_data`
  - **Tags**: `city`
  - **Fields**:
    - `temp` (float, °C)
    - `humidity` (int, %)
    - `rain_probability` (float, 0–1) — dari `pop` One Call API
    - `weather_main` (string) — mis. `Rain`, `Clouds`, `Clear`
    - `clouds` (int, %)
    - `wind_speed` (float, m/s)
- [ ] Tulis *point* ke InfluxDB setiap fetch berhasil
- [ ] Jalankan scheduler tiap 10–15 menit

### Bagian 4 — Logic Alert (Deteksi Hujan)

- [ ] Tentukan rule alert — alert dikirim jika **salah satu** terpenuhi:
  - [ ] `rain_probability > 0.6` (60%) dalam 2 jam ke depan
  - [ ] Kombinasi `humidity > 85%` **DAN** `clouds > 70%`
  - [ ] Deteksi tren: `rain_probability` naik > 30% dalam 1 jam terakhir
- [ ] Implementasi fungsi `should_alert(points)` yang mengembalikan `bool` + alasan
- [ ] Logging setiap keputusan (alert / skip + reason) ke file atau stdout

### Bagian 5 — Anti-Spam Alert

- [ ] Implementasi **cooldown period** (mis. minimal 60 menit antar alert untuk kota yang sama)
- [ ] Simpan `last_alert_at[city]` di memory / file / InfluxDB
- [ ] Cek **perubahan status** sebelum kirim:
  - [ ] Hanya kirim saat transisi `tidak_hujan → berpotensi_hujan`
  - [ ] Reset status setelah 30–60 menit kondisi membaik
- [ ] Pastikan bot tidak mengirim alert duplikat untuk event yang sama

### Bagian 6 — Bonus / Pengembangan Lanjutan

- [ ] Alert **suhu ekstrem** (mis. `temp > 35°C` atau `temp < 18°C`)
- [ ] Command interaktif di Telegram: `/cuaca [kota]`, `/status`, `/help`
- [ ] Multi-kota (loop list kota, tag berbeda per kota)
- [ ] **Visualisasi Grafana**: connect ke InfluxDB, bikin dashboard time-series
- [ ] Deploy sebagai service (systemd / Docker / Windows Service)
- [ ] Tambah logging terstruktur + alerting kalau script mati

---

## Contoh Code Snippet

### 1. Fetch Data dari OpenWeatherMap (Current Weather + One Call)

```python
import os
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("OWM_API_KEY")
CITY = "Jakarta"


def fetch_current_weather(city: str) -> dict:
    """Ambil data cuaca terkini + prakiraan singkat."""
    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        "q": city,
        "appid": API_KEY,
        "units": "metric",
    }
    resp = requests.get(url, params=params, timeout=10)
    resp.raise_for_status()
    return resp.json()


def fetch_one_call(lat: float, lon: float) -> dict:
    """One Call API 3.0 — berisi rain_probability (pop) per jam."""
    url = "https://api.openweathermap.org/data/3.0/onecall"
    params = {
        "lat": lat,
        "lon": lon,
        "appid": API_KEY,
        "units": "metric",
        "exclude": "minutely,daily,alerts",
    }
    resp = requests.get(url, params=params, timeout=10)
    resp.raise_for_status()
    return resp.json()
```

---

### 2. Query Flux — Data 2 Jam Terakhir dari InfluxDB

```flux
from(bucket: "weather")
  |> range(start: -2h)
  |> filter(fn: (r) => r._measurement == "weather_data")
  |> filter(fn: (r) => r.city == "Jakarta")
  |> filter(fn: (r) =>
      r._field == "rain_probability" or
      r._field == "humidity" or
      r._field == "clouds" or
      r._field == "temp"
  )
  |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> sort(columns: ["_time"], desc: false)
```

> **Catatan:** gunakan `pivot` agar tiap timestamp punya satu row berisi semua field — memudahkan logic deteksi tren di Python.

Contoh penggunaan dari Python:

```python
from influxdb_client import InfluxDBClient

query_api = InfluxDBClient(...).query_api()
tables = query_api.query(flux_query, org="my-org")

points = []
for table in tables:
    for record in table.records:
        points.append({
            "time": record.get_time(),
            "rain_probability": record.values.get("rain_probability"),
            "humidity":         record.values.get("humidity"),
            "clouds":           record.values.get("clouds"),
            "temp":             record.values.get("temp"),
        })
```

---

### 3. Kirim Pesan via Telegram Bot API

**Via `curl`:**

```bash
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
     -d "chat_id=${CHAT_ID}" \
     -d "text=⚠️ Alert: Potensi hujan di Jakarta dalam 1-2 jam ke depan (pop: 78%)"
```

**Via Python `requests`:**

```python
import os
import requests
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
CHAT_ID = os.getenv("CHAT_ID")


def send_telegram(message: str) -> None:
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": CHAT_ID,
        "text": message,
        "parse_mode": "Markdown",
    }
    resp = requests.post(url, json=payload, timeout=10)
    resp.raise_for_status()
    print("Alert terkirim:", resp.json())
```

Contoh pesan alert (Markdown):

```
⚠️ *Weather Alert — Jakarta*
• Probabilitas hujan: *78%*
• Kelembapan: 91%
• Tutupan awan: 82%
• Suhu: 27.4°C

_Estimasi waktu hujan: 1–2 jam ke depan_
```

---

## Environment Variables

Buat file `.env` di root project (jangan di-*commit* ke git):

```bash
# --- OpenWeatherMap ---
OWM_API_KEY=your_openweathermap_api_key_here
OWM_CITY=Jakarta
OWM_LAT=-6.2088
OWM_LON=106.8456

# --- Telegram Bot ---
BOT_TOKEN=123456789:AAExampleBotTokenFromBotFather
CHAT_ID=987654321

# --- InfluxDB 2.x ---
INFLUX_URL=http://localhost:8086
INFLUX_TOKEN=your_influxdb_api_token_here
INFLUX_ORG=my-org
INFLUX_BUCKET=weather

# --- App Settings ---
FETCH_INTERVAL_MINUTES=15
ALERT_COOLDOWN_MINUTES=60
RAIN_PROBABILITY_THRESHOLD=0.6
HUMIDITY_THRESHOLD=85
CLOUDS_THRESHOLD=70
TEMP_HIGH_THRESHOLD=35
TEMP_LOW_THRESHOLD=18
```

Tambahkan `.env` ke `.gitignore`:

```gitignore
.env
__pycache__/
*.pyc
.venv/
```

---

## Struktur Project (Referensi)

```
weather-alert-system/
├── .env.example
├── .gitignore
├── requirements.txt
├── README.md
├── src/
│   ├── __init__.py
│   ├── config.py          # load env, constants
│   ├── owm_client.py      # fetch_weather()
│   ├── influx_client.py   # write + query Flux
│   ├── alert_logic.py     # should_alert() + cooldown
│   ├── notifier.py        # send_telegram()
│   └── main.py            # orchestrator + scheduler
└── scripts/
    └── init_influx.py     # setup bucket, org, token
```

---

## Next Steps / Roadmap

### v0.1 — MVP (Fungsional Dasar)
- [ ] Fetch cuaca satu kota → simpan ke InfluxDB
- [ ] Alert sederhana berbasis `rain_probability > 60%`
- [ ] Kirim via Telegram, dengan cooldown 60 menit

### v0.2 — Robust
- [ ] Multi-kota (config list kota)
- [ ] Anti-spam: deteksi perubahan status, bukan hanya threshold sesaat
- [ ] Logging terstruktur + rotate log harian
- [ ] Error handling: retry exponential backoff untuk API call

### v0.3 — Observability & Insight
- [ ] Integrasi Grafana untuk dashboard time-series
- [ ] Tambah field: `wind_speed`, `pressure`, `visibility`
- [ ] Notifikasi kegagalan sistem (jika fetch gagal N kali berturut)

### v1.0 — Production-Ready
- [ ] Deploy sebagai Docker container / systemd service
- [ ] Setup CI/CD untuk auto-restart saat server reboot
- [ ] Tambah command interaktif Telegram (`/cuaca`, `/status`, `/kota`)
- [ ] Alert suhu ekstrem + notifikasi multi-channel (Telegram + Discord/Email)
- [ ] Dokumentasi runbook untuk troubleshooting

### Ide Lanjutan
- [ ] Machine learning: prediksi hujan berdasarkan tren 24 jam
- [ ] Integrasi data satelit / BMKG untuk akurasi lebih tinggi
- [ ] Web dashboard sederhana (Flask/FastAPI) untuk kelola kota & threshold
- [ ] Webhook untuk integrasi ke smart home / irrigation system

---

**Lisensi:** MIT (atau sesuai kebutuhan)
**Maintainer:** _(isi nama / kontak Anda)_
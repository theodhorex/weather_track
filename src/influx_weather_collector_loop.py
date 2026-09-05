import os
import time
import logging
import warnings
import requests
from datetime import datetime
from dotenv import load_dotenv
from influxdb_client import InfluxDBClient, Point, WriteOptions
from influxdb_client.client.exceptions import InfluxDBError

# ==============================================================================
# LEGACY — continuous loop version of the collector.
# Kept for manual/local use only. Production runs use influx_weather_collector.py
# (one-shot, triggered by GitHub Actions cron).
# To run locally:
#     python influx_weather_collector_loop.py
# ==============================================================================

warnings.filterwarnings(
    "ignore",
    message=r".*URLs without a scheme.*",
    category=FutureWarning,
    module=r"urllib3.*",
)

load_dotenv()

API_KEY = os.getenv("OPENWEATHER_API_KEY")
BASE_URL = "https://api.openweathermap.org/data/2.5/forecast"
CITY = os.getenv("CITY")
INTERVAL_SECONDS = int(os.getenv("FETCH_INTERVAL_SECONDS", "1200"))

INFLUX_URL = "https://influxdb.asoytabang.online"
INFLUX_TOKEN = os.getenv("INFLUX_TOKEN")
INFLUX_ORG = os.getenv("INFLUX_ORG")
INFLUX_BUCKET = os.getenv("INFLUX_BUCKET")

_required = {
    "OPENWEATHER_API_KEY": API_KEY,
    "CITY": CITY,
    "INFLUX_TOKEN": INFLUX_TOKEN,
    "INFLUX_ORG": INFLUX_ORG,
    "INFLUX_BUCKET": INFLUX_BUCKET,
}
_missing = [k for k, v in _required.items() if not v]
if _missing:
    raise SystemExit(
        f"Missing required env vars: {', '.join(_missing)}. "
        "Copy .env.example to .env and fill it in."
    )

MEASUREMENT = "weather_data"
TAG_CITY = CITY.split(",")[0].lower()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("weather-collector")


def fetch_weather() -> dict:
    params = {"q": CITY, "appid": API_KEY, "units": "metric"}
    resp = requests.get(BASE_URL, params=params, timeout=10)
    resp.raise_for_status()
    data = resp.json()

    forecast = data["list"][0]
    return {
        "temp": float(forecast["main"]["temp"]),
        "humidity": int(forecast["main"]["humidity"]),
        "rain_probability": float(forecast.get("pop", 0)) * 100.0,
        "weather_main": forecast["weather"][0]["main"],
    }


def build_point(payload: dict) -> Point:
    point = Point(MEASUREMENT).tag("city", TAG_CITY)
    for field, value in payload.items():
        point = point.field(field, value)
    return point


def run_once(client: InfluxDBClient) -> bool:
    try:
        payload = fetch_weather()
        point = build_point(payload)

        write_api = client.write_api(write_options=WriteOptions(batch_size=1, flush_interval=1_000))
        write_api.write(bucket=INFLUX_BUCKET, org=INFLUX_ORG, record=point)
        log.info(
            "Saved -> city=%s temp=%.2f humidity=%d rain=%.1f%% weather=%s",
            TAG_CITY,
            payload["temp"],
            payload["humidity"],
            payload["rain_probability"],
            payload["weather_main"],
        )
        return True
    except requests.exceptions.RequestException as e:
        log.error("OpenWeatherMap request failed: %s", e)
    except (InfluxDBError, ConnectionError, OSError) as e:
        log.error("InfluxDB write failed: %s", e)
    except (KeyError, ValueError) as e:
        log.error("Payload parse failed: %s", e)
    return False


def main() -> None:
    log.info("Starting weather collector (interval=%ds, city=%s)", INTERVAL_SECONDS, CITY)
    while True:
        start = datetime.now()
        with InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG, timeout=10_000) as client:
            ok = run_once(client)

        elapsed = (datetime.now() - start).total_seconds()
        sleep_for = max(0, INTERVAL_SECONDS - elapsed)
        log.info("Sleeping for %.1fs", sleep_for)
        time.sleep(sleep_for)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log.info("Stopped by user")

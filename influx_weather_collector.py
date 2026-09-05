import os
import time
import logging
import requests
from datetime import datetime
from influxdb_client import InfluxDBClient, Point, WriteOptions
from influxdb_client.client.exceptions import InfluxDBError

API_KEY = "a25b0f174716fa4bc9f2591a9ba8b360"
BASE_URL = "https://api.openweathermap.org/data/2.5/forecast"
CITY = "Yogyakarta,ID"
INTERVAL_SECONDS = 5 * 60

INFLUX_URL = "http://localhost:8086"
INFLUX_TOKEN = os.getenv("INFLUX_TOKEN", "YOUR_INFLUXDB_TOKEN")
INFLUX_ORG = os.getenv("INFLUX_ORG", "YOUR_ORG")
INFLUX_BUCKET = "weather"

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

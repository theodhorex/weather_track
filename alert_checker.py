import os
import sys
import logging
import warnings
import requests
from dotenv import load_dotenv
from datetime import datetime, timezone
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.exceptions import InfluxDBError

warnings.filterwarnings(
    "ignore",
    message=r".*URLs without a scheme.*",
    category=FutureWarning,
    module=r"urllib3.*",
)

load_dotenv()

INFLUX_URL = os.getenv("INFLUX_URL", "https://influxdb.asoytabang.online")
INFLUX_TOKEN = os.getenv("INFLUX_TOKEN")
INFLUX_ORG = os.getenv("INFLUX_ORG")
INFLUX_BUCKET = os.getenv("INFLUX_BUCKET")
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
CITY = os.getenv("CITY", "Yogyakarta,ID")

_RAIN_PROBABILITY_THRESHOLD = 60.0
_RAIN_WEATHER_MAIN = "Rain"
_STATUS_NORMAL = "normal"
_STATUS_RAIN = "rain"
_LOOKBACK_HOURS = 1
_STATE_LOOKBACK_DAYS = 30
_TELEGRAM_TIMEOUT = 10
_INFLUX_TIMEOUT = 10_000

MEASUREMENT_WEATHER = "weather_data"
MEASUREMENT_ALERT_STATE = "alert_state"
TAG_CITY = CITY.split(",")[0].lower()

_required = {
    "INFLUX_TOKEN": INFLUX_TOKEN,
    "INFLUX_ORG": INFLUX_ORG,
    "INFLUX_BUCKET": INFLUX_BUCKET,
    "TELEGRAM_TOKEN": TELEGRAM_TOKEN,
    "TELEGRAM_CHAT_ID": TELEGRAM_CHAT_ID,
}
_missing = [k for k, v in _required.items() if not v]
if _missing:
    raise SystemExit(
        f"Missing required env vars: {', '.join(_missing)}. "
        "Copy .env.example to .env and fill it in."
    )

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("weather-alert")


def query_latest_weather(client: InfluxDBClient) -> dict | None:
    flux = f'''
from(bucket: "{INFLUX_BUCKET}")
  |> range(start: -{_LOOKBACK_HOURS}h)
  |> filter(fn: (r) => r._measurement == "{MEASUREMENT_WEATHER}")
  |> filter(fn: (r) => r.city == "{TAG_CITY}")
  |> filter(fn: (r) => r._field == "rain_probability" or r._field == "weather_main")
  |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> sort(columns: ["_time"], desc: true)
  |> limit(n: 1)
'''
    try:
        tables = client.query_api().query(flux, org=INFLUX_ORG)
        for table in tables:
            for record in table.records:
                return {
                    "time": record.get_time(),
                    "rain_probability": record.values.get("rain_probability"),
                    "weather_main": record.values.get("weather_main"),
                }
        log.warning("No weather data found in last %d hour(s)", _LOOKBACK_HOURS)
        return None
    except (InfluxDBError, ConnectionError, OSError) as e:
        log.error("InfluxDB query (weather) failed: %s", e)
        return None


def query_last_alert_state(client: InfluxDBClient) -> str:
    flux = f'''
from(bucket: "{INFLUX_BUCKET}")
  |> range(start: -{_STATE_LOOKBACK_DAYS}d)
  |> filter(fn: (r) => r._measurement == "{MEASUREMENT_ALERT_STATE}")
  |> filter(fn: (r) => r.city == "{TAG_CITY}")
  |> filter(fn: (r) => r._field == "status")
  |> last()
'''
    try:
        tables = client.query_api().query(flux, org=INFLUX_ORG)
        for table in tables:
            for record in table.records:
                value = str(record.get_value()).strip().lower()
                if value in (_STATUS_NORMAL, _STATUS_RAIN):
                    return value
        log.info("No previous alert_state found, assuming '%s'", _STATUS_NORMAL)
        return _STATUS_NORMAL
    except (InfluxDBError, ConnectionError, OSError) as e:
        log.error("InfluxDB query (alert_state) failed: %s", e)
        return _STATUS_NORMAL


def write_alert_state(client: InfluxDBClient, status: str) -> bool:
    point = (
        Point(MEASUREMENT_ALERT_STATE)
        .tag("city", TAG_CITY)
        .field("status", status)
    )
    try:
        write_api = client.write_api()
        write_api.write(bucket=INFLUX_BUCKET, org=INFLUX_ORG, record=point)
        log.info("alert_state written to InfluxDB: '%s'", status)
        return True
    except (InfluxDBError, ConnectionError, OSError) as e:
        log.error("InfluxDB write (alert_state) failed: %s", e)
        return False


def detect_status(weather: dict) -> str:
    rain_pop = float(weather.get("rain_probability") or 0.0)
    weather_main = str(weather.get("weather_main") or "")

    log.info(
        "Sampled point -> rain_probability=%.1f%% weather_main=%s",
        rain_pop,
        weather_main,
    )

    is_rain = rain_pop > _RAIN_PROBABILITY_THRESHOLD or weather_main == _RAIN_WEATHER_MAIN
    return _STATUS_RAIN if is_rain else _STATUS_NORMAL


def send_telegram(message: str) -> bool:
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }
    try:
        resp = requests.post(url, json=payload, timeout=_TELEGRAM_TIMEOUT)
        resp.raise_for_status()
        log.info("Telegram alert sent OK")
        return True
    except requests.exceptions.RequestException as e:
        log.error("Telegram send failed: %s", e)
        return False


def build_message(status: str, weather: dict) -> str:
    ts = weather.get("time")
    if isinstance(ts, datetime):
        ts_str = ts.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    else:
        ts_str = "unknown"

    rain_pop = float(weather.get("rain_probability") or 0.0)
    weather_main = str(weather.get("weather_main") or "Unknown")
    threshold = _RAIN_PROBABILITY_THRESHOLD

    if status == _STATUS_RAIN:
        return (
            f"🌧️ <b>Rain Alert — {weather_main} detected</b>\n\n"
            f"📊 Rain probability: <b>{rain_pop:.1f}%</b> (threshold {threshold:.0f}%)\n"
            f"☁️ Condition: {weather_main}\n"
            f"🕒 Sample time: {ts_str}\n\n"
            f"Prepare your umbrella ☂️"
        )
    return (
        f"☀️ <b>Weather back to normal</b>\n\n"
        f"📊 Rain probability: <b>{rain_pop:.1f}%</b>\n"
        f"☁️ Condition: {weather_main}\n"
        f"🕒 Sample time: {ts_str}\n\n"
        f"Safe to head out without an umbrella."
    )


def main() -> int:
    log.info("Running rain alert check (city=%s)", TAG_CITY)

    try:
        client = InfluxDBClient(
            url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG, timeout=_INFLUX_TIMEOUT
        )
    except (InfluxDBError, ConnectionError, OSError) as e:
        log.error("InfluxDB client init failed: %s", e)
        return 1

    try:
        weather = query_latest_weather(client)
        if weather is None:
            log.warning("Skipping alert logic: no data available")
            return 0

        current_status = detect_status(weather)
        last_status = query_last_alert_state(client)
        log.info("Status transition: '%s' -> '%s'", last_status, current_status)

        if current_status != last_status:
            message = build_message(current_status, weather)
            sent = send_telegram(message)
            if sent:
                if write_alert_state(client, current_status):
                    log.info("State updated to '%s'", current_status)
                else:
                    log.warning("State NOT updated because InfluxDB write failed")
            else:
                log.warning("State NOT updated because Telegram send failed")
        else:
            log.info("No state change, alert suppressed (anti-spam)")
        return 0
    finally:
        try:
            client.close()
        except Exception:
            pass


if __name__ == "__main__":
    sys.exit(main())

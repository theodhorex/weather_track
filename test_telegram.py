"""Test Telegram bot connectivity independently from main alert logic.

Usage:
    python test_telegram.py                    # default test message
    python test_telegram.py --rain             # simulate rain alert format
    python test_telegram.py --normal           # simulate clear-weather format
    python test_telegram.py --custom "halo bro" # custom text
"""
import os
import argparse
import requests
from dotenv import load_dotenv

load_dotenv()

TOKEN = os.getenv("TELEGRAM_TOKEN")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")


def send(text: str) -> tuple[int, str]:
    if not TOKEN or not CHAT_ID:
        print("ERROR: TELEGRAM_TOKEN / TELEGRAM_CHAT_ID belum di-set di .env")
        return 0, "missing-env"

    url = f"https://api.telegram.org/bot{TOKEN}/sendMessage"
    payload = {
        "chat_id": CHAT_ID,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }
    try:
        resp = requests.post(url, json=payload, timeout=10)
        return resp.status_code, resp.text
    except requests.exceptions.RequestException as e:
        return 0, str(e)


def main() -> int:
    parser = argparse.ArgumentParser(description="Send a test Telegram message.")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--rain", action="store_true", help="Simulate rain alert format.")
    group.add_argument("--normal", action="store_true", help="Simulate clear-weather format.")
    group.add_argument("--custom", type=str, help="Custom message text.")
    args = parser.parse_args()

    if args.rain:
        text = (
            "🌧️ <b>Rain Alert — Rain detected</b>\n\n"
            "📊 Rain probability: <b>87.0%</b> (threshold 60%)\n"
            "☁️ Condition: Rain\n"
            "🕒 Sample time: test\n\n"
            "Prepare your umbrella ☂️"
        )
    elif args.normal:
        text = (
            "☀️ <b>Weather back to normal</b>\n\n"
            "📊 Rain probability: <b>12.0%</b>\n"
            "☁️ Condition: Clear\n"
            "🕒 Sample time: test\n\n"
            "Safe to head out without an umbrella."
        )
    elif args.custom:
        text = args.custom
    else:
        text = "🤖 Test ping dari weather tracker — kalau ini muncul, Telegram bot connected ✅"

    print(f"Sending to chat_id={CHAT_ID} ...")
    status, body = send(text)
    print(f"HTTP {status}")
    print(body)

    if status == 200:
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())

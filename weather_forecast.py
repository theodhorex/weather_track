import os
import json
import requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("OPENWEATHER_API_KEY")
BASE_URL = "https://api.openweathermap.org/data/2.5/forecast"
CITY = os.getenv("CITY", "Yogyakarta,ID")

if not API_KEY:
    raise SystemExit("OPENWEATHER_API_KEY is not set. Copy .env.example to .env and fill it in.")

params = {
    "q": CITY,
    "appid": API_KEY,
    "units": "metric"
}

try:
    response = requests.get(BASE_URL, params=params, timeout=10)
    response.raise_for_status()
    data = response.json()

    city = data['city']
    print("=" * 60)
    print(f"=== Weather Forecast for {CITY} ===")
    print("=" * 60)
    print(f"City ID        : {city.get('id')}")
    print(f"City Name      : {city.get('name')}")
    print(f"Country        : {city.get('country')}")
    print(f"Timezone       : {city.get('timezone')} seconds (UTC{city.get('timezone', 0)/3600:+.0f})")
    print(f"Sunrise        : {datetime.fromtimestamp(city.get('sunrise')).strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Sunset         : {datetime.fromtimestamp(city.get('sunset')).strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Population     : {city.get('population')}")
    print(f"Coord (lat,lon): {city.get('coord', {}).get('lat')}, {city.get('coord', {}).get('lon')}")
    print(f"Total Forecasts: {len(data['list'])}")
    print("=" * 60)

    for idx, item in enumerate(data['list'], 1):
        dt = datetime.fromtimestamp(item['dt'])
        time_str = dt.strftime('%Y-%m-%d %H:%M:%S')

        main = item.get('main', {})
        weather_list = item.get('weather', [])
        clouds = item.get('clouds', {})
        wind = item.get('wind', {})
        rain = item.get('rain', {})
        snow = item.get('snow', {})
        sys_data = item.get('sys', {})

        print(f"\n--- Forecast #{idx} ---")
        print(f"Time          : {time_str}")
        print(f"Weather       : {weather_list[0].get('main')} - {weather_list[0].get('description')}")
        print(f"Weather ID    : {weather_list[0].get('id')}")
        print(f"Icon          : {weather_list[0].get('icon')}")

        print(f"\n[Main]")
        print(f"  Temperature : {main.get('temp')}°C")
        print(f"  Feels Like  : {main.get('feels_like')}°C")
        print(f"  Temp Min    : {main.get('temp_min')}°C")
        print(f"  Temp Max    : {main.get('temp_max')}°C")
        print(f"  Pressure    : {main.get('pressure')} hPa")
        print(f"  Sea Level   : {main.get('sea_level')} hPa")
        print(f"  Ground Level: {main.get('grnd_level')} hPa")
        print(f"  Humidity    : {main.get('humidity')}%")
        print(f"  Temp KF     : {main.get('temp_kf')}")

        print(f"\n[Visibility]")
        print(f"  Visibility  : {item.get('visibility')} meters")

        print(f"\n[Wind]")
        print(f"  Speed       : {wind.get('speed')} m/s")
        print(f"  Degree      : {wind.get('deg')}°")
        print(f"  Gust        : {wind.get('gust')} m/s")

        print(f"\n[Clouds]")
        print(f"  Cloudiness  : {clouds.get('all')}%")

        if rain:
            print(f"\n[Rain]")
            for key, val in rain.items():
                print(f"  {key:<3} : {val} mm")
        if snow:
            print(f"\n[Snow]")
            for key, val in snow.items():
                print(f"  {key:<3} : {val} mm")

        print(f"\n[Probability]")
        print(f"  Precipitation: {item.get('pop', 0) * 100:.0f}%")

        print(f"\n[System Info]")
        print(f"  Pod (part of day): {sys_data.get('pod')}")

        print("-" * 60)

except requests.exceptions.RequestException as e:
    print(f"Error fetching data: {e}")
except KeyError as e:
    print(f"Unexpected data format: missing key {e}")
except json.JSONDecodeError:
    print("Error: Invalid JSON response")

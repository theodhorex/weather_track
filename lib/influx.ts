import { InfluxDB } from "@influxdata/influxdb-client";

export type WeatherPoint = {
  time: string;
  temp: number | null;
  humidity: number | null;
};

export type CurrentWeather = {
  time: string;
  temp: number | null;
  humidity: number | null;
  rain_probability: number | null;
  weather_main: string | null;
};

export type AlertStatus = {
  status: "normal" | "rain" | "unknown";
  time: string | null;
};

export type CombinedStatus = CurrentWeather & { alert: AlertStatus };

function getEnv() {
  const url = process.env.INFLUX_URL;
  const token = process.env.INFLUX_TOKEN;
  const org = process.env.INFLUX_ORG;
  const bucket = process.env.INFLUX_BUCKET;

  if (!url || !token || !org || !bucket) {
    throw new Error(
      "Missing InfluxDB env vars. Set INFLUX_URL, INFLUX_TOKEN, INFLUX_ORG, INFLUX_BUCKET in .env.local"
    );
  }
  return { url, token, org, bucket };
}

export function getInfluxClient(): InfluxDB {
  const { url, token } = getEnv();
  return new InfluxDB({ url, token });
}

export function getOrg(): string {
  return getEnv().org;
}

export function getBucket(): string {
  return getEnv().bucket;
}

export async function queryFlux<T = Record<string, unknown>>(
  flux: string
): Promise<T[]> {
  const client = getInfluxClient();
  const queryApi = client.getQueryApi(getOrg());
  const rows: T[] = [];

  for await (const { values, tableMeta } of queryApi.iterateRows(flux)) {
    const o = tableMeta.toObject(values) as T;
    rows.push(o);
  }
  return rows;
}

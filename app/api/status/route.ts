import { NextResponse } from "next/server";
import { getBucket, queryFlux, CombinedStatus } from "@/lib/influx";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const bucket = getBucket();

  const weatherFlux = `
from(bucket: "${bucket}")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "weather_data")
  |> filter(fn: (r) => r._field == "temp" or r._field == "humidity" or r._field == "rain_probability" or r._field == "weather_main")
  |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> sort(columns: ["_time"], desc: true)
  |> limit(n: 1)
`;

  const alertFlux = `
from(bucket: "${bucket}")
  |> range(start: -30d)
  |> filter(fn: (r) => r._measurement == "alert_state")
  |> filter(fn: (r) => r._field == "status")
  |> last()
`;

  try {
    const [weatherRows, alertRows] = await Promise.all([
      queryFlux<Record<string, unknown>>(weatherFlux),
      queryFlux<Record<string, unknown>>(alertFlux),
    ]);

    const w = weatherRows[0];
    const a = alertRows[0];

    const result: CombinedStatus = {
      time: w?._time ? new Date(String(w._time)).toISOString() : new Date().toISOString(),
      temp: typeof w?.temp === "number" ? w.temp : null,
      humidity: typeof w?.humidity === "number" ? w.humidity : null,
      rain_probability: typeof w?.rain_probability === "number" ? w.rain_probability : null,
      weather_main: typeof w?.weather_main === "string" ? w.weather_main : null,
      alert: {
        status:
          typeof a?.status === "string" && (a.status === "rain" || a.status === "normal")
            ? (a.status as "normal" | "rain")
            : "unknown",
        time: a?._time ? new Date(String(a._time)).toISOString() : null,
      },
    };

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

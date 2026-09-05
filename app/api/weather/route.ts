import { NextRequest, NextResponse } from "next/server";
import { getBucket, queryFlux, WeatherPoint } from "@/lib/influx";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RangeKey = "24h" | "7d" | "30d";

const RANGE_CONFIG: Record<RangeKey, { range: string; window: string }> = {
  "24h": { range: "-24h", window: "15m" },
  "7d": { range: "-7d", window: "1h" },
  "30d": { range: "-30d", window: "3h" },
};

function isRangeKey(v: string | null): v is RangeKey {
  return v === "24h" || v === "7d" || v === "30d";
}

export async function GET(req: NextRequest) {
  const rangeParam = req.nextUrl.searchParams.get("range");
  const range: RangeKey = isRangeKey(rangeParam) ? rangeParam : "24h";
  const { range: rangeClause, window } = RANGE_CONFIG[range];
  const bucket = getBucket();

  const flux = `
from(bucket: "${bucket}")
  |> range(start: ${rangeClause})
  |> filter(fn: (r) => r._measurement == "weather_data")
  |> filter(fn: (r) => r._field == "temp" or r._field == "humidity")
  |> aggregateWindow(every: ${window}, fn: mean, createEmpty: false)
  |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
  |> sort(columns: ["_time"], desc: false)
`;

  try {
    const rows = await queryFlux<Record<string, unknown>>(flux);
    const points: WeatherPoint[] = rows.map((r) => ({
      time: new Date(String(r._time)).toISOString(),
      temp: typeof r.temp === "number" ? r.temp : null,
      humidity: typeof r.humidity === "number" ? r.humidity : null,
    }));

    return NextResponse.json({ range, points });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

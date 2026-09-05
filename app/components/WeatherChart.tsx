"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { WeatherPoint } from "@/lib/influx";

type Props = {
  data: WeatherPoint[];
  loading: boolean;
  error: string | null;
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function WeatherChart({ data, loading, error }: Props) {
  if (error) {
    return (
      <div className="border border-hairline px-lg py-md bg-surface-soft text-danger">
        <div className="text-body-md">
          <span className="text-body-strong mr-sm">[!]</span>
          <span>failed to load chart:</span>
        </div>
        <div className="text-caption-md text-mute mt-xs">{error}</div>
      </div>
    );
  }

  if (loading && data.length === 0) {
    return (
      <div className="border border-hairline h-72 flex items-center justify-center bg-canvas">
        <span className="text-caption-md text-mute">
          <span className="text-ink">[</span>
          <span className="animate-blink">·</span>
          <span className="text-ink">]</span>
          &nbsp;&nbsp;loading timeseries...
        </span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="border border-hairline h-72 flex items-center justify-center bg-canvas text-mute">
        <span className="text-body-md">
          <span className="text-ink mr-sm">[-]</span>
          no data points in this range
        </span>
      </div>
    );
  }

  return (
    <figure className="border border-hairline p-lg bg-canvas">
      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="rgba(15,0,0,0.12)" />
            <XAxis
              dataKey="time"
              tickFormatter={fmtTime}
              stroke="#646262"
              fontSize={11}
              tickLine={false}
              minTickGap={48}
            />
            <YAxis
              yAxisId="temp"
              orientation="left"
              stroke="#201d1d"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}°`}
              width={36}
            />
            <YAxis
              yAxisId="humidity"
              orientation="right"
              stroke="#646262"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              width={36}
            />
            <Tooltip
              labelFormatter={(v) => fmtTime(String(v))}
              contentStyle={{
                background: "#fdfcfc",
                border: "1px solid rgba(15,0,0,0.12)",
                borderRadius: "4px",
                fontFamily: "inherit",
                fontSize: "12px",
                padding: "8px 12px",
              }}
              formatter={(value, name) => {
                if (typeof value === "number" && !isNaN(value)) {
                  if (name === "temp") return [`${value.toFixed(1)}°C`, "temperature"];
                  if (name === "humidity") return [`${value.toFixed(0)}%`, "humidity"];
                  return [String(value), String(name)];
                }
                if (value === null || value === undefined) return ["—", String(name)];
                if (Array.isArray(value)) return [value.join(", "), String(name)];
                return [String(value), String(name)];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
              formatter={(v) =>
                v === "temp" ? "temperature (°C)" : "humidity (%)"
              }
            />
            <Line
              yAxisId="temp"
              type="linear"
              dataKey="temp"
              stroke="#201d1d"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              yAxisId="humidity"
              type="linear"
              dataKey="humidity"
              stroke="#646262"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-md text-caption-md text-mute">
        <span className="text-body-strong">fig 1.</span> timeseries — temp
        (solid) and humidity (dashed), downsampled by InfluxDB aggregateWindow.
      </figcaption>
    </figure>
  );
}

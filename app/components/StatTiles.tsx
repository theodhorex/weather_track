import { WeatherPoint } from "@/lib/influx";

type Props = {
  data: WeatherPoint[];
};

function avg(nums: Array<number | null | undefined>): number | null {
  const valid = nums.filter((n): n is number => typeof n === "number" && !isNaN(n));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function maxVal(nums: Array<number | null | undefined>): number | null {
  const valid = nums.filter((n): n is number => typeof n === "number" && !isNaN(n));
  if (valid.length === 0) return null;
  return Math.max(...valid);
}

function Sparkline({
  values,
  caption,
  unit,
  stat,
  glyph = "·",
  color = "#424245",
}: {
  values: Array<number | null | undefined>;
  caption: string;
  unit: string;
  stat: string;
  glyph?: string;
  color?: string;
}) {
  const valid = values.filter((v): v is number => typeof v === "number" && !isNaN(v));
  if (valid.length === 0) {
    return (
      <div className="border border-hairline p-lg bg-canvas">
        <div className="h-16 flex items-center justify-center text-mute text-caption-md">
          [-] no data
        </div>
        <div className="mt-md text-caption-md text-mute">
          <span className="text-body-strong">{caption.split(".")[0]}.</span>{" "}
          {caption.split(".").slice(1).join(".").trim()}
        </div>
      </div>
    );
  }

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min || 1;
  const ROWS = 6;
  const COLS = 28;
  const step = Math.max(1, Math.floor(values.length / COLS));
  const sampled = values.filter((_, i) => i % step === 0).slice(0, COLS);

  const grid: string[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: sampled.length }, () => " ")
  );

  sampled.forEach((v, c) => {
    if (typeof v !== "number" || isNaN(v)) return;
    const normalized = (v - min) / range;
    const row = Math.min(ROWS - 1, Math.floor((1 - normalized) * (ROWS - 1)));
    grid[row][c] = glyph;
  });

  return (
    <div className="border border-hairline p-lg bg-canvas">
      <pre
        className="text-[10px] leading-[1.1] font-mono whitespace-pre overflow-hidden"
        style={{ color }}
        aria-hidden="true"
      >
        {grid.map((row) => row.join("")).join("\n")}
      </pre>
      <div className="mt-md flex items-baseline justify-between">
        <span className="text-body-strong text-ink text-body-md tabular-nums">
          {stat}
          <span className="text-caption-md text-mute ml-xs">{unit}</span>
        </span>
        <span className="text-caption-md text-mute tabular-nums">
          {min.toFixed(1)}–{max.toFixed(1)}
        </span>
      </div>
      <div className="mt-xs text-caption-md text-mute">
        <span className="text-body-strong">{caption.split(".")[0]}.</span>{" "}
        {caption.split(".").slice(1).join(".").trim()}
      </div>
    </div>
  );
}

export default function StatTiles({ data }: Props) {
  const temps = data.map((d) => d.temp);
  const hums = data.map((d) => d.humidity);

  const avgTemp = avg(temps);
  const maxTemp = maxVal(temps);
  const avgHum = avg(hums);
  const maxHum = maxVal(hums);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-lg gap-y-lg">
      <Sparkline
        values={temps}
        caption="fig 2. mean temperature across range"
        unit="°C avg"
        stat={avgTemp !== null ? avgTemp.toFixed(1) : "—"}
        glyph="·"
        color="#201d1d"
      />
      <Sparkline
        values={temps}
        caption="fig 3. peak temperature across range"
        unit="°C max"
        stat={maxTemp !== null ? maxTemp.toFixed(1) : "—"}
        glyph="·"
        color="#201d1d"
      />
      <Sparkline
        values={hums}
        caption="fig 4. mean humidity across range"
        unit="% avg"
        stat={avgHum !== null ? avgHum.toFixed(0) : "—"}
        glyph="·"
        color="#646262"
      />
      <Sparkline
        values={hums}
        caption="fig 5. peak humidity across range"
        unit="% max"
        stat={maxHum !== null ? maxHum.toFixed(0) : "—"}
        glyph="·"
        color="#646262"
      />
    </div>
  );
}

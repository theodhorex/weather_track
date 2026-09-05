import { CombinedStatus } from "@/lib/influx";

type Props = {
  data: CombinedStatus | null;
  error: string | null;
  loading: boolean;
};

function fmt(v: number | null, unit = "", digits = 1): string {
  if (v === null || Number.isNaN(v)) return "—";
  return `${v.toFixed(digits)}${unit}`;
}

function fmtTime(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

function Skeleton({ width = "w-32" }: { width?: string }) {
  return (
    <span
      className={`inline-block h-[1em] align-middle bg-surface-card animate-pulse ${width}`}
    >
      &nbsp;
    </span>
  );
}

export default function StatusCards({ data, error, loading }: Props) {
  if (error) {
    return (
      <div className="border border-hairline px-lg py-md bg-surface-soft text-danger">
        <div className="text-body-md">
          <span className="text-body-strong mr-sm">[!]</span>
          <span>failed to load status:</span>
        </div>
        <div className="text-caption-md text-mute mt-xs">{error}</div>
      </div>
    );
  }

  const isRain = data?.alert.status === "rain";
  const alertMarker = isRain
    ? "[!]"
    : data?.alert.status === "normal"
    ? "[+]"
    : "[?]";
  const alertText = isRain
    ? "rain detected"
    : data?.alert.status === "normal"
    ? "no rain expected"
    : "no data";
  const alertColor = isRain
    ? "text-warning"
    : data?.alert.status === "normal"
    ? "text-success"
    : "text-mute";

  const rows: { key: string; label: string; marker: string; value: React.ReactNode }[] = [
    {
      key: "temp",
      label: "temperature",
      marker: "[+]",
      value:
        loading || !data ? (
          <Skeleton />
        ) : (
          <span className="text-body-strong">{fmt(data.temp, "°C", 1)}</span>
        ),
    },
    {
      key: "humidity",
      label: "humidity",
      marker: "[+]",
      value:
        loading || !data ? (
          <Skeleton />
        ) : (
          <span className="text-body-strong">{fmt(data.humidity, "%", 0)}</span>
        ),
    },
    {
      key: "rain",
      label: "rain probability",
      marker: isRain ? "[!]" : "[+]",
      value:
        loading || !data ? (
          <Skeleton />
        ) : (
          <span className={isRain ? "text-body-strong text-warning" : "text-body-strong"}>
            {fmt(data.rain_probability, "%", 0)}
          </span>
        ),
    },
    {
      key: "condition",
      label: "condition",
      marker: "[+]",
      value:
        loading || !data ? (
          <Skeleton />
        ) : (
          <span className="text-body-strong">{data.weather_main ?? "—"}</span>
        ),
    },
    {
      key: "alert",
      label: "alert status",
      marker: alertMarker,
      value:
        loading || !data ? (
          <Skeleton />
        ) : (
          <span className={`text-body-strong ${alertColor}`}>{alertText}</span>
        ),
    },
  ];

  return (
    <div className="border-t border-hairline">
      {rows.map((row) => (
        <div
          key={row.key}
          className="flex items-baseline gap-x-md py-sm border-b border-hairline text-body-md"
        >
          <span className="text-mute select-none w-6 shrink-0">{row.marker}</span>
          <span className="text-body-strong w-44 shrink-0">{row.label}</span>
          <span className="text-ink tabular-nums">{row.value}</span>
        </div>
      ))}
      <div className="flex items-baseline gap-x-md py-sm text-caption-md text-mute">
        <span className="select-none w-6 shrink-6">·</span>
        <span className="w-44 shrink-0">last sample</span>
        <span className="tabular-nums">
          {loading || !data ? "—" : fmtTime(data.time)}
        </span>
      </div>
    </div>
  );
}

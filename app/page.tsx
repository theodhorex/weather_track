"use client";

import { useCallback, useEffect, useState } from "react";
import StatusCards from "./components/StatusCards";
import WeatherChart from "./components/WeatherChart";
import RangeSelector from "./components/RangeSelector";
import StatTiles from "./components/StatTiles";
import { CombinedStatus, WeatherPoint } from "@/lib/influx";

type RangeKey = "24h" | "7d" | "30d";

const REFRESH_MS = 2 * 60 * 1000;

export default function DashboardPage() {
  const [range, setRange] = useState<RangeKey>("24h");
  const [status, setStatus] = useState<CombinedStatus | null>(null);
  const [points, setPoints] = useState<WeatherPoint[]>([]);
  const [statusLoading, setStatusLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/status", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
      setStatus(j as CombinedStatus);
      setStatusError(null);
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const fetchPoints = useCallback(async (r: RangeKey) => {
    setChartLoading(true);
    try {
      const resp = await fetch(`/api/weather?range=${r}`, { cache: "no-store" });
      const j = await resp.json();
      if (!resp.ok) throw new Error(j.error ?? `HTTP ${resp.status}`);
      setPoints(j.points ?? []);
      setChartError(null);
    } catch (e) {
      setChartError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setChartLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchPoints(range);
    const id = setInterval(() => {
      fetchStatus();
      fetchPoints(range);
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [range, fetchStatus, fetchPoints]);

  return (
    <div className="bg-canvas text-ink">
      <main className="mx-auto max-w-5xl px-lg sm:px-xl py-section space-y-section">
        {/* ── hero ── */}
        <section>
          <div className="mb-lg">
            <span className="inline-block bg-surface-dark text-on-dark px-sm py-xxs text-caption-md mr-sm align-middle">
              live
            </span>
            <span className="text-caption-md text-mute align-middle">
              monitoring yogyakarta weather
            </span>
          </div>

          <h1 className="text-display-xl text-ink leading-tight">
            weather-tracker(1) — open source weather monitor for yogyakarta
          </h1>

          <p className="mt-lg text-body-md text-body max-w-3xl">
            a self-hosted weather & rain-alert dashboard. python backend polls
            openweathermap every 20 minutes and writes to influxdb; this page
            reads the same store and tells you when to bring an umbrella. no
            telemetry, no third-party fonts, no shadows.
          </p>

          <div className="mt-lg flex flex-wrap items-center gap-md">
            <span className="text-button-md text-mute select-none">range:</span>
            <RangeSelector
              value={range}
              onChange={setRange}
              disabled={chartLoading}
            />
          </div>
        </section>

        {/* ── status section ── */}
        <section id="section-status">
          <header className="border-b border-hairline pb-sm mb-lg">
            <h2 className="text-heading-md text-ink">
              <span className="text-mute mr-sm">[+]</span>current conditions
            </h2>
          </header>
          <StatusCards
            data={status}
            error={statusError}
            loading={statusLoading}
          />
          <p className="mt-md text-caption-md text-mute">
            source: openweathermap forecast, polled by{" "}
            <span className="text-body-strong">influx_weather_collector</span>{" "}
            on github actions. rain threshold = 60% probability or weather_main
            == &quot;Rain&quot;.
          </p>
        </section>

        {/* ── chart section ── */}
        <section id="section-chart">
          <header className="border-b border-hairline pb-sm mb-lg">
            <h2 className="text-heading-md text-ink">
              <span className="text-mute mr-sm">[+]</span>timeseries
            </h2>
          </header>
          <WeatherChart
            data={points}
            loading={chartLoading}
            error={chartError}
          />
        </section>

        {/* ── stat tiles (chart-tile pattern) ── */}
        <section>
          <header className="border-b border-hairline pb-sm mb-lg">
            <h2 className="text-heading-md text-ink">
              <span className="text-mute mr-sm">[+]</span>summary statistics
            </h2>
          </header>
          <StatTiles data={points} />
        </section>

        {/* ── footer ── */}
        <footer className="border-t border-hairline pt-xxl text-caption-md text-mute">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-lg">
            {["github", "docs", "changelog"].map((link) => (
              <a
                key={link}
                href="#"
                className="text-ink hover:underline underline-offset-4"
              >
                {link}
              </a>
            ))}
          </div>
          <div className="mt-lg flex flex-wrap items-center justify-between gap-md">
            <span>©2026 weather-tracker contributors</span>
            <span>
              brand · privacy · terms · <span className="text-ink">english ▼</span>
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}

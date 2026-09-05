# Session Summary — frontend dashboard to manpage design (2026-09-05)

## Context
- Project: weather-tracker (Python + Next.js hybrid repo di `test2_weather_track/`)
- Tujuan sesi: Migrasi dashboard Next.js dari generic Tailwind (rounded card, slate colors, sans font) ke manpage-style design system sesuai `DESIGN-opencode.ai.md` (Berkeley Mono, cream canvas, ASCII bracket markers, hairline borders, no shadows)
- Task/feature yang dikerjakan: Refactor lengkap frontend dashboard — layout, page, components, design tokens. Backend Python + GitHub Actions workflow **tidak boleh tersentuh** (byte-identical verified via filecmp).

## Completed

### Revert (dibuang dari sesi sebelumnya)
- `app/components/ui/area-chart-1.tsx` (dihapus)
- `bun.lock` (dihapus)
- `reaviz` + `framer-motion` deps (dihapus dari package.json)
- `app/api/weather/route.ts` revert ke `temp + humidity` only (no rain_probability)
- TUI mockup + nav + install snippet + FAQ + footer (discord/x) — dihapus dari page.tsx sesuai request

### Design system refactor
- `app/layout.tsx` — pakai `JetBrains_Mono` dari `next/font/google` sebagai substitute Berkeley Mono, body pakai `bg-canvas` + `font-mono`
- `app/globals.css` — base font, `.border-hairline` helper, blinking cursor animation
- `tailwind.config.js` — full design tokens:
  - colors: `canvas` (#fdfcfc), `ink` (#201d1d), `mute`/`body`/`charcoal`/`stone`/`ash`, `surface-soft`/`surface-card`/`surface-dark`/`surface-dark-elevated`, `hairline` rgba, `on-dark`/`on-dark-mute`, semantic ramp (`accent`/`warning`/`danger`/`success` — unused di chrome)
  - spacing: `xxs`/`xs`/`sm`/`md`/`lg`/`xl`/`xxl`/`section` (96px)
  - radius: `none` (0px), `sm` (4px), `full` (9999px)
  - fontSize: `display-xl` (38/700), `heading-md`, `body-md`, `body-strong`, `body-tight`, `button-md`, `caption-md`
  - font stack: Berkeley Mono priority, fallback ke JetBrains Mono → IBM Plex Mono → monospace

### Components
- `app/components/RangeSelector.tsx` — tab-style: `range:` prefix + 2px ash underline saat active, no rounded
- `app/components/StatusCards.tsx` — `list-row` pattern dengan `[+]`/`[!]`/`[?]` markers, bold label + tabular-nums value, hairline border-b
- `app/components/WeatherChart.tsx` — recharts line chart di dalam `<figure>` dengan hairline border, no rounded, "fig 1." caption, dashed humidity line, blinking `[·]` loading state
- `app/components/StatTiles.tsx` (BARU) — 4 ASCII sparkline tiles (chart-tile pattern) untuk avg/max temp & humidity, "fig 2.-5." captions, pure text glyphs no SVG
- `app/components/TuiMockup.tsx` (BARU lalu DIHAPUS) — hero dark surface, ASCII wordmark + command line + keybinding hints

### Page
- `app/page.tsx` — final layout: hero (live badge + headline + description + range selector) → current conditions → timeseries → summary statistics → footer 3-link (github/docs/changelog)
- Wordmark + nav + TUI mockup + install snippet + FAQ section + lastUpdate state — semua dihapus

### Dokumentasi
- `README.md` — tambah section "Design system" lengkap, update struktur project
- `.env.example`, `.env.local.example` — env templates
- `.gitignore` — extended untuk Node/Next (node_modules, .next, .env*.local, .vercel, next-env.d.ts) + fix `lib/` pattern (tidak ignore top-level `lib/` Next.js)

## Files Changed
| File | Jenis Perubahan | Keterangan Singkat |
|---|---|---|
| `app/layout.tsx` | diubah | pakai JetBrains Mono via next/font/google |
| `app/globals.css` | diubah | base font + hairline border helper + blink animation |
| `tailwind.config.js` | diubah | design tokens lengkap (colors, spacing, radius, fontSize, font stack) |
| `app/page.tsx` | diubah | manpage layout: hero + 3 sections + footer (TUI/nav/FAQ dihapus) |
| `app/components/RangeSelector.tsx` | diubah | tab-style dengan ash underline |
| `app/components/StatusCards.tsx` | diubah | list-row pattern dengan ASCII bracket markers |
| `app/components/WeatherChart.tsx` | diubah | recharts dalam figure + fig caption + dashed humidity |
| `app/components/StatTiles.tsx` | dibuat | 4 ASCII sparkline tiles (chart-tile pattern) |
| `app/components/TuiMockup.tsx` | dibuat lalu dihapus | hero TUI mockup (lifecycle pendek) |
| `app/components/ui/area-chart-1.tsx` | dihapus | revert dari eksperimen reaviz |
| `app/api/weather/route.ts` | diubah lalu revert | rain_probability dicoba lalu dibatalkan |
| `package.json` | diubah | tambah reaviz+framer-motion lalu dihapus; tambah bun packageManager |
| `bun.lock` | dibuat lalu dihapus | lockfile dari eksperimen bun |
| `README.md` | diubah | section Design system + struktur project |
| `.gitignore` | diubah | entry Node/Next + fix `lib/` pattern |
| `.env.local.example` | dibuat (sebelumnya) | template env Next.js |
| `.eslintrc.json` | dibuat (sebelumnya) | Next.js eslint config |
| `next.config.mjs`, `postcss.config.mjs` | dibuat (sebelumnya) | Next.js config |
| `lib/influx.ts` | tidak berubah | TERVERIFIKASI byte-identical |
| `app/api/status/route.ts` | tidak berubah | TERVERIFIKASI byte-identical |
| `src/*.py` (5 file) | tidak berubah | TERVERIFIKASI byte-identical |
| `.github/workflows/*.yml` (2 file) | tidak berubah | TERVERIFIKASI byte-identical |
| `requirements.txt` | tidak berubah | TERVERIFIKASI byte-identical |

## Technical Decisions

- **Font substitute JetBrains Mono**: Berkeley Mono proprietary (paid). Pakai JetBrains Mono via `next/font/google` sebagai substitute paling dekat. Font stack di tailwind config tetap list Berkeley Mono di priority 2 supaya kalau nanti ada license bisa swap tanpa ubah className.
  - Alternatif dipertimbangkan: IBM Plex Mono (lebih terbuka counter, breakline beda), Geist Mono (lebih modern tapi beda vibe). JetBrains paling dekat untuk stroke + x-height.
- **Layout final tanpa nav/TUI/FAQ**: sesuai eksplisit request user. Hapus yang gak diperlukan, sisain: hero + current conditions + timeseries + summary statistics + footer.
- **Sparkline ASCII (`StatTiles.tsx`)** bukan Recharts: sesuai design spec "abstract dotted/sparse-line plots without specific data points" — pure 6x28 char grid, lebih cocok dengan aesthetic manpage.
- **Recharts dipertahankan untuk timeseries utama**: butuh precise time-series data (bukan abstract), dan chart itu real data dashboard.
- **Color usage discipline**: `bg-surface-dark` HANYA dipakai di live badge (yg paling kecil). Semantic accent (warning/danger/success) dipakai di text only, bukan di background/CTA. Sesuai design spec "marketing chrome stays monochrome".
- **TuiMockup dihapus cepat**: setelah di-build, user request untuk hapus seluruh dark hero (TUI mockup) dari page. File-nya juga dihapus dari `app/components/` agar tidak jadi dead code.

## Problems

- **Node.js / Bun tidak tersedia di environment ini**: tidak bisa `bun install` atau `bun run build` untuk verifikasi runtime. Validasi hanya via:
  - Bracket/paren balance check (PASS)
  - JSON validation untuk `package.json` (PASS)
  - YAML validation untuk workflows (PASS)
  - Filecmp byte-identical untuk file existing (PASS)
- **`lib/` di-ignore oleh `.gitignore` lama** (pattern `lib/` dari Python egg build). Fixed dengan pattern `/lib/` + `/*/lib/` + `!lib/` (negate).
- **`reaviz` + `framer-motion` import path breaking risk**: v13 ubah `import { motion } from 'framer-motion'` ke `'motion/react'`. Dipakai v12 untuk safety. Lalu semua dibatalkan.
- **System prompt `<available_skills>` cuma tampil `customize-opencode` di awal sesi**: membuat saya kira global skill gak ter-load, padahal sebenarnya auto-load normal. Konfirmasi via test:
  - Skill dari `~/.config/opencode/skills/` global **resolved dengan benar** oleh tool `skill` dan muncul di `<available_skills>`
  - Folder random di luar global/project **tidak di-resolve**
  - Project-level `.opencode/skills/` juga resolved (alternatif selain global)

## Current State

- ✅ Frontend dashboard sudah refactor total ke manpage design system
- ✅ Semua file existing (Python + workflow + status API + influx lib) **byte-identical** dengan sebelum refactor (verified via filecmp)
- ✅ Syntax validation pass (TS bracket/paren + JSON + YAML)
- ⚠️ Runtime verification (bun install / bun run dev / bun run build) **belum dilakukan** karena Node/Bun tidak ada di environment
- ⚠️ Font rendering dengan JetBrains Mono belum dilihat visual (perlu user test di browser)
- ⚠️ Belum di-commit — semua perubahan masih di working tree

## Next Steps

1. **(USER) Install Node.js / Bun kalau belum**, lalu jalankan:
   ```bash
   cd C:\Users\user\Documents\magang_theo\project_coba_coba\influxdb\test2_weather_track
   bun install
   bun run dev
   ```
2. **(USER) Verifikasi visual di http://localhost:3000**:
   - Body cream `#fdfcfc`, font monospace
   - Live badge hitam kecil di atas hero (satu-satunya dark surface yg dipakai sekarang)
   - Range selector dengan 2px ash underline saat active
   - 4 ASCII sparkline tiles di section "summary statistics" (cek rendering char grid)
   - Footer 3-link grid + copyright + utility cluster
3. **(USER) Kalau visual OK, commit & push**:
   ```bash
   git add -A
   git status
   git commit -m "refactor: redesign dashboard to manpage-style design system"
   git push origin main
   ```
4. **(OPSIONAL) Setup Vercel deploy**: project sudah auto-detect sebagai Next.js. Tambah 4 env vars (`INFLUX_URL`, `INFLUX_TOKEN`, `INFLUX_ORG`, `INFLUX_BUCKET`) di dashboard Vercel. Region Singapore untuk latency ke InfluxDB Asia.
5. **(OPSIONAL) Ganti font ke Berkeley Mono asli** kalau ada license — tinggal uncomment dari `tailwind.config.js` font stack dan tambahkan `@font-face` di `globals.css`.

## Important Context

- **Backend Python + GitHub Actions JANGAN disentuh** saat frontend work — collector jalan tiap 20 menit, alert checker tiap 10 menit, pakai GitHub Secrets (8 secrets: OPENWEATHER_API_KEY, INFLUX_URL, INFLUX_TOKEN, INFLUX_ORG, INFLUX_BUCKET, CITY, TELEGRAM_TOKEN, TELEGRAM_CHAT_ID)
- **InfluxDB schema tidak berubah** — measurement `weather_data` (fields: temp, humidity, rain_probability, weather_main) + `alert_state` (field: status) dengan tag `city`
- **API endpoint yang dipakai frontend**:
  - `GET /api/status` → CombinedStatus (latest point + alert_state)
  - `GET /api/weather?range=24h|7d|30d` → `{ range, points: [{time, temp, humidity}] }`
- **Design spec lengkap** ada di `C:\Users\user\Downloads\DESIGN-opencode.ai.md` (~520 lines, terminal-native / Berkeley Mono / cream canvas / hairline / ASCII brackets). **SELALU rujuk spec ini** kalau ada pertanyaan visual, jangan tebak.
- **Skill auto-load dari global** `~/.config/opencode/skills/`: 5 skill tersedia tanpa setup tambahan (`backend-logic-thinking`, `customize-opencode`, `frontend-engineering`, `github-automation`, `session-summary`). Tool `skill <name>` untuk load detail lengkap. Project-level `.opencode/skills/` juga resolved.
- **Project AGENTS.md wajibkan 4 skill ini** untuk task yang relevan: `frontend-engineering` untuk semua UI work, `backend-logic-thinking` untuk backend logic, `github-automation` untuk git/commit/push, `session-summary` untuk recap akhir sesi.
- **InfluxDB hosted di `influxdb.asoytabang.online`**, bucket `weather`, org tidak ditentukan di repo (di .env).
- **API key OpenWeatherMap yang pernah hardcode** di `weather_forecast.py` sudah dipindah ke env, **tapi masih ada di git history** (commit `b6cd69b`/`f482ec7`). **REGENERATE API key** di dashboard OpenWeatherMap kalau mau bener-bener aman.

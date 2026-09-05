"use client";

type RangeKey = "24h" | "7d" | "30d";

type Props = {
  value: RangeKey;
  onChange: (next: RangeKey) => void;
  disabled?: boolean;
};

const OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "24h", label: "24h" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
];

export default function RangeSelector({ value, onChange, disabled }: Props) {
  return (
    <div role="tablist" aria-label="time range" className="flex items-center gap-x-xs">
      <span className="text-caption-md text-mute mr-xs select-none">range:</span>
      {OPTIONS.map((opt) => {
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(opt.key)}
            className={[
              "px-lg py-sm text-button-md transition-colors",
              "focus:outline-none focus:ring-1 focus:ring-ink focus:ring-offset-0",
              active
                ? "text-ink border-b-2 border-ash"
                : "text-mute border-b-2 border-transparent hover:text-ink",
              disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
            ].join(" ")}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

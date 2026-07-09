"use client";

import { ScaleDef } from "@/lib/scales";

export default function ScoreGroup({
  title, defs, values, onChange, defaultOpen = false,
}: {
  title: string;
  defs: ScaleDef[];
  values: Record<string, number>;
  onChange: (key: string, value: number) => void;
  defaultOpen?: boolean;
}) {
  return (
    <details className="section-group" open={defaultOpen}>
      <summary>{title}</summary>
      <div className="score-grid">
        {defs.map((d) => (
          <div className="score-field" key={d.key}>
            <label htmlFor={d.key}>{d.label}</label>
            <input
              id={d.key}
              type="number"
              value={values[d.key] ?? 50}
              onChange={(e) => onChange(d.key, Number(e.target.value))}
            />
          </div>
        ))}
      </div>
    </details>
  );
}

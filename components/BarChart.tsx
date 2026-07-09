"use client";

type BarItem = { key: string; label: string; value: number };

interface BarChartProps {
  items: BarItem[];
  domainMax: number; // 예: T점수=120, 백분위=100
  refLines: { at: number; label: string }[];
  highlightThreshold?: number; // 이 값 이상이면 강조색
  orientation?: "horizontal" | "vertical";
  levelThresholds?: { high: number; low: number }; // 지정 시 우측에 H/M/L 표기
}

function levelOf(value: number, t: { high: number; low: number }): "H" | "M" | "L" {
  if (value >= t.high) return "H";
  if (value <= t.low) return "L";
  return "M";
}

const LEVEL_COLOR = "#2f5d62";

export default function BarChart({
  items, domainMax, refLines, highlightThreshold, orientation = "horizontal", levelThresholds,
}: BarChartProps) {
  if (orientation === "vertical") {
    return <VerticalBarChart items={items} domainMax={domainMax} refLines={refLines} highlightThreshold={highlightThreshold} />;
  }

  const rowH = 24;
  const gap = 8;
  const leftPad = 108;
  const rightPad = levelThresholds ? 66 : 40;
  const chartW = 560;
  const topPad = 18;
  const height = topPad + items.length * (rowH + gap) + 20;
  const plotW = chartW - leftPad - rightPad;

  const xScale = (v: number) => (v / domainMax) * plotW;

  return (
    <svg viewBox={`0 0 ${chartW} ${height}`} width="100%" style={{ maxWidth: 560, display: "block" }}>
      {refLines.map((r, i) => {
        const x = leftPad + xScale(r.at);
        return (
          <g key={i}>
            <line x1={x} y1={topPad - 6} x2={x} y2={height - 14} stroke="#b6bfc8" strokeDasharray="3,3" strokeWidth="1" />
            <text x={x} y={height - 3} fontSize="9" fill="#7a8391" textAnchor="middle">{r.label}</text>
          </g>
        );
      })}
      {items.map((it, i) => {
        const y = topPad + i * (rowH + gap);
        const barW = Math.max(1, xScale(Math.min(it.value, domainMax)));
        const highlighted = highlightThreshold !== undefined && it.value >= highlightThreshold;
        const level = levelThresholds ? levelOf(it.value, levelThresholds) : null;
        return (
          <g key={it.key}>
            <text x={leftPad - 10} y={y + rowH / 2 + 4} fontSize="11.5" fill="#1c2430" textAnchor="end">
              {it.label}
            </text>
            <rect x={leftPad} y={y} width={plotW} height={rowH} fill="#f1f3f5" rx="2" />
            <rect x={leftPad} y={y} width={barW} height={rowH} fill={highlighted ? "#a4462f" : "#2f5d62"} rx="2" />
            <text x={leftPad + barW + 6} y={y + rowH / 2 + 4} fontSize="11" fill="#1c2430">
              {it.value}
            </text>
            {level && (
              <text
                x={chartW - rightPad + 44}
                y={y + rowH / 2 + 4}
                fontSize="12"
                fontWeight="700"
                fill={LEVEL_COLOR}
                textAnchor="middle"
              >
                {level}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function VerticalBarChart({ items, domainMax, refLines, highlightThreshold }: BarChartProps) {
  const colW = 46;
  const gap = 14;
  const topPad = 16;
  const bottomPad = 34;
  const chartH = 220;
  const leftPad = 8;
  const plotH = chartH - topPad - bottomPad;
  const chartW = leftPad + items.length * (colW + gap) + gap;

  const yScale = (v: number) => (Math.min(v, domainMax) / domainMax) * plotH;

  return (
    <svg viewBox={`0 0 ${chartW} ${chartH}`} width="100%" style={{ maxWidth: 560, display: "block" }}>
      {refLines.map((r, i) => {
        const y = topPad + plotH - yScale(r.at);
        return (
          <g key={i}>
            <line x1={leftPad} y1={y} x2={chartW - 4} y2={y} stroke="#b6bfc8" strokeDasharray="3,3" strokeWidth="1" />
            <text x={chartW - 4} y={y - 2} fontSize="9" fill="#7a8391" textAnchor="end">{r.label}</text>
          </g>
        );
      })}
      {items.map((it, i) => {
        const x = leftPad + gap + i * (colW + gap);
        const barH = Math.max(1, yScale(it.value));
        const y = topPad + plotH - barH;
        const highlighted = highlightThreshold !== undefined && it.value >= highlightThreshold;
        return (
          <g key={it.key}>
            <rect x={x} y={topPad} width={colW} height={plotH} fill="#f1f3f5" rx="2" />
            <rect x={x} y={y} width={colW} height={barH} fill={highlighted ? "#a4462f" : "#2f5d62"} rx="2" />
            <text x={x + colW / 2} y={y - 5} fontSize="10.5" fill="#1c2430" textAnchor="middle">{it.value}</text>
            <text x={x + colW / 2} y={topPad + plotH + 14} fontSize="10.5" fill="#1c2430" textAnchor="middle">{it.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

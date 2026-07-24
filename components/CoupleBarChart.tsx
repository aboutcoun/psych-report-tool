"use client";

type CoupleBarItem = { key: string; label: string; value1: number; value2: number };

interface CoupleBarChartProps {
  items: CoupleBarItem[];
  domainMax: number;
  refLines: { at: number; label: string }[];
}

const COLOR_1 = "#2f5d62"; // 피검자1 (teal)
const COLOR_2 = "#b5822f"; // 피검자2 (amber)

export default function CoupleBarChart({ items, domainMax, refLines }: CoupleBarChartProps) {
  const rowH = 16;
  const rowGap = 4;
  const groupGap = 14;
  const leftPad = 108;
  const rightPad = 40;
  const chartW = 560;
  const topPad = 14;
  const groupH = rowH * 2 + rowGap;
  const height = topPad + items.length * (groupH + groupGap) + 20;
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
        const groupY = topPad + i * (groupH + groupGap);
        const y1 = groupY;
        const y2 = groupY + rowH + rowGap;
        const barW1 = Math.max(1, xScale(Math.min(it.value1, domainMax)));
        const barW2 = Math.max(1, xScale(Math.min(it.value2, domainMax)));
        return (
          <g key={it.key}>
            <text x={leftPad - 10} y={groupY + groupH / 2 + 4} fontSize="11.5" fill="#1c2430" textAnchor="end">
              {it.label}
            </text>
            <rect x={leftPad} y={y1} width={plotW} height={rowH} fill="#f1f3f5" rx="2" />
            <rect x={leftPad} y={y1} width={barW1} height={rowH} fill={COLOR_1} rx="2" />
            <text x={leftPad + barW1 + 6} y={y1 + rowH / 2 + 4} fontSize="10" fill="#1c2430">{it.value1}</text>

            <rect x={leftPad} y={y2} width={plotW} height={rowH} fill="#f1f3f5" rx="2" />
            <rect x={leftPad} y={y2} width={barW2} height={rowH} fill={COLOR_2} rx="2" />
            <text x={leftPad + barW2 + 6} y={y2 + rowH / 2 + 4} fontSize="10" fill="#1c2430">{it.value2}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function CoupleLegend({ name1, name2 }: { name1: string; name2: string }) {
  return (
    <div className="couple-legend">
      <div className="couple-legend-item">
        <span className="couple-legend-swatch" style={{ background: COLOR_1 }} />
        {name1 || "피검자1"}
      </div>
      <div className="couple-legend-item">
        <span className="couple-legend-swatch" style={{ background: COLOR_2 }} />
        {name2 || "피검자2"}
      </div>
    </div>
  );
}

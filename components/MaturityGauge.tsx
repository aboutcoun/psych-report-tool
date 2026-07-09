"use client";

// TCI SC(자율성+연대감) 점수를 미성숙↔성숙 스펙트럼으로 시각화
export default function MaturityGauge({ sc }: { sc: number }) {
  const w = 520;
  const h = 92;
  const barY = 34;
  const barH = 18;
  const padX = 20;
  const barW = w - padX * 2;

  const clamp = Math.max(0, Math.min(100, sc));
  const markerX = padX + (clamp / 100) * barW;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ maxWidth: 560, display: "block", margin: "6px 0 10px" }}>
      <defs>
        <linearGradient id="maturity-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#c98a6f" />
          <stop offset="50%" stopColor="#cfd3d6" />
          <stop offset="100%" stopColor="#2f5d62" />
        </linearGradient>
      </defs>

      <rect x={padX} y={barY} width={barW} height={barH} rx={barH / 2} fill="url(#maturity-gradient)" />

      {/* 마커 */}
      <polygon
        points={`${markerX - 8},${barY - 10} ${markerX + 8},${barY - 10} ${markerX},${barY + 2}`}
        fill="#1c2430"
      />
      <text x={markerX} y={barY - 14} fontSize="12" fontWeight="700" fill="#1c2430" textAnchor="middle">
        {Math.round(clamp)}
      </text>

      {/* 좌우 끝 라벨 */}
      <text x={padX} y={barY + barH + 20} fontSize="11.5" fill="#7a8391" textAnchor="start">미성숙</text>
      <text x={padX + barW} y={barY + barH + 20} fontSize="11.5" fill="#7a8391" textAnchor="end">성숙</text>
    </svg>
  );
}

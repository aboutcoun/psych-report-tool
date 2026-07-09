"use client";

// TCI SC(자율성+연대감) 점수를 3구간 게이지로 시각화
export default function MaturityGauge({ sc }: { sc: number }) {
  const w = 520;
  const h = 108;
  const barY = 40;
  const barH = 26;
  const padX = 20;
  const barW = w - padX * 2;

  const clamp = Math.max(0, Math.min(100, sc));
  const markerX = padX + (clamp / 100) * barW;

  const zoneW = barW / 100;
  const lowW = 30 * zoneW;
  const midW = 40 * zoneW;
  const highW = 30 * zoneW;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ maxWidth: 560, display: "block", margin: "6px 0 10px" }}>
      {/* 3구간 배경 */}
      <rect x={padX} y={barY} width={lowW} height={barH} fill="#e7dcd7" rx="4" />
      <rect x={padX + lowW} y={barY} width={midW} height={barH} fill="#eceeef" />
      <rect x={padX + lowW + midW} y={barY} width={highW} height={barH} fill="#dce8e7" rx="4" />

      {/* 구간 경계선 */}
      <line x1={padX + lowW} y1={barY - 4} x2={padX + lowW} y2={barY + barH + 4} stroke="#b6bfc8" strokeWidth="1" />
      <line x1={padX + lowW + midW} y1={barY - 4} x2={padX + lowW + midW} y2={barY + barH + 4} stroke="#b6bfc8" strokeWidth="1" />

      {/* 구간 라벨 */}
      <text x={padX + lowW / 2} y={barY + barH + 18} fontSize="11" fill="#7a8391" textAnchor="middle">성장 중</text>
      <text x={padX + lowW + midW / 2} y={barY + barH + 18} fontSize="11" fill="#7a8391" textAnchor="middle">균형</text>
      <text x={padX + lowW + midW + highW / 2} y={barY + barH + 18} fontSize="11" fill="#7a8391" textAnchor="middle">안정적</text>

      {/* 마커 */}
      <polygon
        points={`${markerX - 8},${barY - 10} ${markerX + 8},${barY - 10} ${markerX},${barY + 2}`}
        fill="#2f5d62"
      />
      <text x={markerX} y={barY - 14} fontSize="12" fontWeight="700" fill="#2f5d62" textAnchor="middle">
        {Math.round(clamp)}
      </text>
    </svg>
  );
}

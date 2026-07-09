"use client";

const STEPS = [
  { label: "정서적 지지", desc: "지금의 감정을 있는 그대로\n이해받는 경험" },
  { label: "관계 패턴 이해", desc: "반복되는 관계의 흐름을\n함께 들여다보기" },
  { label: "자기이해 심화", desc: "나를 이루는 특성들을\n더 깊이 알아가기" },
];

// 마지막 페이지 여백을 채우는 장식용 인포그래픽
export default function NextStepsInfographic() {
  return (
    <div className="next-steps-wrap">
      <div className="next-steps-title">상담을 통해 함께 다뤄볼 수 있는 것들</div>
      <div className="next-steps-row">
        {STEPS.map((s) => (
          <div className="next-steps-card" key={s.label}>
            <div className="next-steps-badge">{s.label[0]}</div>
            <div className="next-steps-label">{s.label}</div>
            <div className="next-steps-desc">
              {s.desc.split("\n").map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

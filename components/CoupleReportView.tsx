"use client";

import CoupleBarChart, { CoupleLegend } from "./CoupleBarChart";
import { CoupleReportRequestBody, CoupleReportResult } from "@/lib/types";

function BrandTop() {
  return <div className="page-brand-top">어바웃심리상담센터</div>;
}
function PageFooter({ current, total }: { current: number; total: number }) {
  return (
    <div className="page-footer">
      <div className="page-footer-line" />
      <div className="page-footer-row">
        <span className="page-footer-brand">어바웃심리상담센터 · aboutcounsel.com</span>
        <span className="page-footer-num">{current} / {total}</span>
      </div>
    </div>
  );
}

function levelOf(v: number): string {
  if (v <= 10) return "매우 낮음";
  if (v <= 30) return "낮음";
  if (v <= 70) return "보통";
  if (v <= 90) return "높음";
  return "매우 높음";
}

const TEMPERAMENT_SCALES = [
  { key: "NS", label: "자극추구(NS)" },
  { key: "HA", label: "위험회피(HA)" },
  { key: "RD", label: "사회적민감성(RD)" },
  { key: "P", label: "인내력(P)" },
];
const CHARACTER_SCALES = [
  { key: "SD", label: "자율성(SD)" },
  { key: "CO", label: "연대감(CO)" },
  { key: "ST", label: "자기초월(ST)" },
];

export default function CoupleReportView({
  request, result, onPrint, onBack,
}: {
  request: CoupleReportRequestBody;
  result: CoupleReportResult;
  onPrint: () => void;
  onBack: () => void;
}) {
  const { person1, person2 } = request;
  const today = new Date().toLocaleDateString("ko-KR");
  const TOTAL_PAGES = 4;

  const allScales = [...TEMPERAMENT_SCALES, ...CHARACTER_SCALES];
  const summaryRows = allScales.map((s) => ({
    key: s.key,
    label: s.label,
    v1: (person1.temperament[s.key] ?? person1.character[s.key]) ?? 50,
    v2: (person2.temperament[s.key] ?? person2.character[s.key]) ?? 50,
  }));

  const chartItems = summaryRows.map((r) => ({ key: r.key, label: r.label.replace(/\(.+\)/, ""), value1: r.v1, value2: r.v2 }));

  function Masthead() {
    return (
      <header className="report-masthead">
        <h2>커플 TCI 해석상담보고서</h2>
        <div className="meta">{person1.name} · {person2.name}</div>
      </header>
    );
  }

  return (
    <div>
      <div className="report-toolbar no-print">
        <button className="btn-secondary" onClick={onBack}>← 입력값 수정</button>
        <button className="btn-secondary" onClick={onPrint}>인쇄 / PDF 저장</button>
      </div>

      {/* 표지 */}
      <section className="report-page cover-page">
        <BrandTop />
        <div className="cover-kicker">COUPLE TCI INTERPRETATION REPORT</div>
        <h1 className="cover-title">커플 TCI 기질 및 성격검사<br />해석상담보고서</h1>
        <div className="cover-subtitle">TCI Couple Interpretation Report</div>

        <div className="cover-divider" />

        <table className="cover-info-table">
          <tbody>
            <tr><th>피검자 1</th><td>{person1.name || "비공개"} ({person1.gender || "-"})</td></tr>
            <tr><th>피검자 2</th><td>{person2.name || "비공개"} ({person2.gender || "-"})</td></tr>
            <tr><th>검사 도구</th><td>TCI (기질 및 성격검사)</td></tr>
            <tr><th>분석일</th><td>{today}</td></tr>
          </tbody>
        </table>

        <div className="cover-footer">본 보고서는 두 분의 기질적·성격적 검사 결과를 바탕으로 작성된 전문 해석상담 자료이며, 임상적 진단을 대체하지 않습니다.</div>
        <div className="cover-brand">어바웃심리상담센터 · aboutcounsel.com</div>
      </section>

      {/* 2p: 검사 결과 요약 (표 + 그래프) */}
      <section className="report-page">
        <BrandTop />
        <Masthead />

        <div className="page-content page-content-center">
          <div className="report-block">
            <div className="report-section-title">검사 결과 요약</div>
            <table className="couple-score-table">
              <thead>
                <tr>
                  <th>척도</th>
                  <th>{person1.name || "피검자1"}</th>
                  <th>수준</th>
                  <th>{person2.name || "피검자2"}</th>
                  <th>수준</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((r) => (
                  <tr key={r.key}>
                    <td>{r.label}</td>
                    <td>{r.v1}</td>
                    <td>{levelOf(r.v1)}</td>
                    <td>{r.v2}</td>
                    <td>{levelOf(r.v2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 18 }}>
              <CoupleLegend name1={person1.name} name2={person2.name} />
              <CoupleBarChart items={chartItems} domainMax={100} refLines={[{ at: 50, label: "50" }]} />
            </div>
          </div>
        </div>

        <PageFooter current={2} total={TOTAL_PAGES} />
      </section>

      {/* 3p: 기질/성격 차원 분석 */}
      <section className="report-page">
        <BrandTop />
        <Masthead />

        <div className="page-content page-content-center">
          <div className="report-block">
            <div className="report-section-title">서로의 기질 차원(Temperament)에 대한 분석</div>
            <p className="report-body-text">{result.temperament_analysis}</p>
          </div>
          <div className="report-block">
            <div className="report-section-title">서로의 성격 차원(Character)에 대한 분석</div>
            <p className="report-body-text">{result.character_analysis}</p>
          </div>
        </div>

        <PageFooter current={3} total={TOTAL_PAGES} />
      </section>

      {/* 4p: 종합 제언 */}
      <section className="report-page">
        <BrandTop />
        <Masthead />

        <div className="page-content">
          <div className="report-block">
            <div className="report-section-title">종합 제언</div>
            <div className="couple-summary-box">
              <div className="couple-summary-title">① 두 분 관계의 강점</div>
              <p className="couple-person-text">{result.strengths}</p>
            </div>
            <div className="couple-summary-box">
              <div className="couple-summary-title">② 주의가 필요한 영역</div>
              <p className="couple-person-text">{result.cautions}</p>
            </div>
            <div className="couple-summary-box">
              <div className="couple-summary-title">③ 구체적 실천 제언</div>
              <ol className="couple-action-list">
                {result.action_items.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ol>
            </div>
            <div className="couple-summary-box">
              <div className="couple-summary-title">④ 상담자 코멘트</div>
              <p className="couple-person-text">{result.counselor_comment}</p>
            </div>
          </div>

          <div className="report-disclaimer">
            본 보고서는 어바웃심리상담센터의 TCI 검사 결과를 바탕으로 작성된 전문 해석상담 자료이며, 임상적 진단을 대체하지 않습니다.
          </div>
        </div>

        <PageFooter current={4} total={TOTAL_PAGES} />
      </section>
    </div>
  );
}

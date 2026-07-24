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

const TEMPERAMENT_SCALES = [
  { key: "NS", label: "자극추구" },
  { key: "HA", label: "위험회피" },
  { key: "RD", label: "사회적민감성" },
  { key: "P", label: "인내력" },
];
const CHARACTER_SCALES = [
  { key: "SD", label: "자율성" },
  { key: "CO", label: "연대감" },
  { key: "ST", label: "자기초월" },
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
  const TOTAL_PAGES = 7;

  const summaryRows = [...TEMPERAMENT_SCALES, ...CHARACTER_SCALES].map((s) => ({
    key: s.key,
    label: s.label,
    v1: (person1.temperament[s.key] ?? person1.character[s.key]) ?? 50,
    v2: (person2.temperament[s.key] ?? person2.character[s.key]) ?? 50,
  }));

  const chartItems = summaryRows.map((r) => ({ key: r.key, label: r.label, value1: r.v1, value2: r.v2 }));

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

      {/* 2p: 검사 결과 요약 + 동물 유형 정의 */}
      <section className="report-page">
        <BrandTop />
        <Masthead />

        <div className="page-content page-content-center">
          <div className="report-block">
            <div className="report-section-title">검사 결과 요약</div>
            <CoupleLegend name1={person1.name} name2={person2.name} />
            <CoupleBarChart items={chartItems} domainMax={100} refLines={[{ at: 50, label: "50" }]} />
          </div>

          <div className="report-block">
            <div className="report-section-title">두 사람의 동물 유형 정의</div>
            <div className="couple-person-row">
              <div className="couple-person-card">
                <div className="couple-person-title">{person1.name}님: {result.person1_animal}</div>
                <p className="couple-person-text">{result.person1_animal_desc}</p>
              </div>
              <div className="couple-person-card">
                <div className="couple-person-title">{person2.name}님: {result.person2_animal}</div>
                <p className="couple-person-text">{result.person2_animal_desc}</p>
              </div>
            </div>
          </div>
        </div>

        <PageFooter current={2} total={TOTAL_PAGES} />
      </section>

      {/* 3p: 개인별 기질/성격 요약 + 강점/약점 */}
      <section className="report-page">
        <BrandTop />
        <Masthead />

        <div className="page-content page-content-center">
          <div className="report-block">
            <div className="report-section-title">개인별 기질 및 성격 요약 분석</div>
            <div className="couple-person-row">
              <div className="couple-person-card">
                <div className="couple-person-title">{person1.name}님: {result.person1_animal}</div>
                <p className="couple-person-text">{result.person1_summary}</p>
                <div className="couple-person-label">강점</div>
                <p className="couple-person-text">{result.person1_strength}</p>
                <div className="couple-person-label">약점 및 특이지표</div>
                <p className="couple-person-text">{result.person1_weakness}</p>
              </div>
              <div className="couple-person-card">
                <div className="couple-person-title">{person2.name}님: {result.person2_animal}</div>
                <p className="couple-person-text">{result.person2_summary}</p>
                <div className="couple-person-label">강점</div>
                <p className="couple-person-text">{result.person2_strength}</p>
                <div className="couple-person-label">약점 및 특이지표</div>
                <p className="couple-person-text">{result.person2_weakness}</p>
              </div>
            </div>
          </div>
        </div>

        <PageFooter current={3} total={TOTAL_PAGES} />
      </section>

      {/* 4p: 기질/성격 차원 비교 분석 */}
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

        <PageFooter current={4} total={TOTAL_PAGES} />
      </section>

      {/* 5p: 갈등 시나리오 */}
      <section className="report-page">
        <BrandTop />
        <Masthead />

        <div className="page-content page-content-center">
          <div className="report-block">
            <div className="report-section-title">연애·결혼 관계에서의 주요 갈등 양상</div>
            {result.conflict_scenarios.map((s, i) => (
              <div className="couple-scenario-card" key={i}>
                <div className="couple-scenario-title">갈등 상황 {i + 1}: {s.title}</div>
                <p className="couple-scenario-story">{s.story}</p>
              </div>
            ))}
          </div>
        </div>

        <PageFooter current={5} total={TOTAL_PAGES} />
      </section>

      {/* 6p: 맞춤형 처방전 (단독 페이지로 분리) */}
      <section className="report-page">
        <BrandTop />
        <Masthead />

        <div className="page-content page-content-center">
          <div className="report-block">
            <div className="report-section-title">관계 개선을 위한 맞춤형 처방전</div>
            {result.prescriptions.map((p, i) => (
              <div className="couple-prescription-card" key={i}>
                <div className="couple-prescription-title">{p.forName}님을 위한 처방: "{p.title}"</div>
                <p className="couple-prescription-detail">{p.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <PageFooter current={6} total={TOTAL_PAGES} />
      </section>

      {/* 7p: 종합 제언 (단독 페이지로 분리) */}
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

        <PageFooter current={7} total={TOTAL_PAGES} />
      </section>
    </div>
  );
}

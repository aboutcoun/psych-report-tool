"use client";

import { useState, ReactNode } from "react";
import BarChart from "./BarChart";
import MaturityGauge from "./MaturityGauge";
import NextStepsInfographic from "./NextStepsInfographic";
import {
  MMPI_CLINICAL, MMPI_RC,
  TCI_TEMPERAMENT, TCI_CHARACTER, TCI_TEMPERAMENT_KO, TCI_CHARACTER_KO,
} from "@/lib/scales";
import { ClientInfo, MmpiInput, TciInput, ReportResult, ReportSection, CounselorSection } from "@/lib/types";

function toItemsKo(defs: { key: string }[], scores: Record<string, number>, koLabels: Record<string, string>) {
  return defs
    .filter((d) => scores[d.key] !== undefined)
    .map((d) => ({ key: d.key, label: koLabels[d.key] || d.key, value: scores[d.key] }));
}

function toItems(defs: { key: string; label: string }[], scores: Record<string, number>) {
  return defs
    .filter((d) => scores[d.key] !== undefined)
    .map((d) => ({ key: d.key, label: d.key, value: scores[d.key] }));
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

type Block = {
  key: string;
  title: string;
  roman?: string;
  body?: string;
  charts?: ReactNode;
};

function BrandTop() {
  return <div className="page-brand-top no-print-hide">어바웃심리상담센터</div>;
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

export default function ReportView({
  client, mmpi, tci, sctEnabled, result, onPrint, onBack,
}: {
  client: ClientInfo;
  mmpi: MmpiInput;
  tci: TciInput;
  sctEnabled: boolean;
  result: ReportResult;
  onPrint: () => void;
  onBack: () => void;
}) {
  const [mode, setMode] = useState<"client" | "counselor">("client");
  const tRef = [
    { at: 50, label: "50" },
    { at: 65, label: "65" },
  ];
  const pRef = [{ at: 50, label: "50" }];
  const tciLevels = { high: 70, low: 30 };

  const section: ReportSection | CounselorSection = mode === "client" ? result.client : result.counselor;
  const isCounselor = mode === "counselor";
  const sc = tci.character["SC"] ?? 50;

  const testsAdministered: string[] = [];
  if (mmpi.enabled) testsAdministered.push("MMPI-2 (다면적 인성검사)");
  if (tci.enabled) testsAdministered.push("TCI 기질 및 성격검사");
  if (sctEnabled) testsAdministered.push("SCT 문장완성검사");

  const today = new Date().toLocaleDateString("ko-KR");

  // ── 블록 구성 ────────────────────────────────────
  const introBlocks: Block[] = [];
  if (mmpi.enabled) {
    introBlocks.push({ key: "validity", title: "검사 결과를 읽기 전에", body: section.validity_summary });
  }

  const partBlocks: Block[] = [];
  if (tci.enabled) {
    partBlocks.push({
      key: "maturity",
      title: "나의 성격적 성숙도",
      body: section.maturity_summary,
      charts: <MaturityGauge sc={sc} />,
    });
    partBlocks.push({
      key: "temperament",
      title: "기질/성격적 특성",
      body: section.temperament_character_summary,
      charts: (
        <>
          <div className="chart-wrap">
            <BarChart items={toItemsKo(TCI_TEMPERAMENT, tci.temperament, TCI_TEMPERAMENT_KO)} domainMax={100} refLines={pRef} levelThresholds={tciLevels} />
          </div>
          <div className="chart-wrap">
            <BarChart items={toItemsKo(TCI_CHARACTER, tci.character, TCI_CHARACTER_KO)} domainMax={100} refLines={pRef} levelThresholds={tciLevels} />
          </div>
        </>
      ),
    });
  }
  if (mmpi.enabled) {
    partBlocks.push({
      key: "symptom",
      title: "심리적 어려움/증상",
      body: section.symptom_summary,
      charts: (
        <>
          <div className="chart-wrap">
            <BarChart items={toItems(MMPI_CLINICAL, mmpi.clinical)} domainMax={120} refLines={tRef} highlightThreshold={65} orientation="vertical" />
          </div>
          <div className="chart-wrap">
            <BarChart items={toItems(MMPI_RC, mmpi.rc)} domainMax={120} refLines={tRef} highlightThreshold={65} orientation="vertical" />
          </div>
        </>
      ),
    });
  }
  partBlocks.forEach((b, i) => (b.roman = ROMAN[i]));

  const integrationBlock: Block = {
    key: "integration",
    title: "종합 소견",
    body: section.integration_recommendations,
    roman: ROMAN[partBlocks.length],
  };

  // ── 페이지 구성: 1p = 도입부+첫 파트 / 이후 각 파트마다 1페이지씩 / 마지막 = 종합소견 ──
  const page1: Block[] = [...introBlocks];
  const remaining = [...partBlocks];
  if (remaining.length > 0) page1.push(remaining.shift()!);

  const soloPages: Block[][] = remaining.map((b) => [b]);

  const allPages: Block[][] = [page1, ...soloPages, [integrationBlock]];
  const isLastPage = (i: number) => i === allPages.length - 1;

  return (
    <div>
      <div className="report-toolbar no-print">
        <button className="btn-secondary" onClick={onBack}>← 입력값 수정</button>
        <div style={{ display: "flex", gap: 8 }}>
          <div className="mode-toggle">
            <button className={`mode-btn ${mode === "client" ? "active" : ""}`} onClick={() => setMode("client")}>내담자용</button>
            <button className={`mode-btn ${mode === "counselor" ? "active" : ""}`} onClick={() => setMode("counselor")}>상담자용</button>
          </div>
          <button className="btn-secondary" onClick={onPrint}>인쇄 / PDF 저장</button>
        </div>
      </div>

      {/* 표지 */}
      <section className="report-page cover-page">
        <BrandTop />
        <div className="cover-kicker">PSYCHOLOGICAL ASSESSMENT REPORT</div>
        <h1 className="cover-title">심리검사 통합 해석 보고서</h1>
        <div className="cover-subtitle">{isCounselor ? "상담자용" : "내담자용"}</div>

        <div className="cover-divider" />

        <table className="cover-info-table">
          <tbody>
            <tr><th>이름</th><td>{client.name || "비공개"}</td></tr>
            <tr><th>성별 / 연령</th><td>{client.gender || "-"} / 만 {client.age || "-"}세</td></tr>
            <tr><th>검사일</th><td>{client.testDate || "-"}</td></tr>
            <tr><th>실시 검사</th><td>{testsAdministered.join(", ") || "-"}</td></tr>
            <tr><th>작성일</th><td>{today}</td></tr>
          </tbody>
        </table>

        <div className="cover-footer">본 보고서는 심리검사 결과를 바탕으로 작성된 참고 자료이며, 확정적인 진단을 대신하지 않습니다.</div>
        <div className="cover-brand">어바웃심리상담센터 · aboutcounsel.com</div>
      </section>

      {allPages.map((pageBlocks, pageIdx) => {
        const isSolo = pageBlocks.length === 1 && pageIdx !== 0 && !isLastPage(pageIdx);
        return (
        <section className="report-page" key={pageIdx}>
          <BrandTop />
          <header className="report-masthead">
            <h2>심리검사 통합 해석 보고서</h2>
            <div className="meta">
              {client.name || "비공개"} · {client.gender || "-"} · 만 {client.age || "-"}세 · {isCounselor ? "상담자용" : "내담자용"}
            </div>
          </header>

          <div className={`page-content ${isSolo ? "page-content-center" : ""}`}>
            {pageBlocks.map((block) => (
              <div key={block.key} className="report-block">
                <div className="report-section-title">
                  {block.roman ? `Part ${block.roman}. ${block.title}` : block.title}
                </div>
                {block.charts}
                <p className="report-body-text">{block.body}</p>
              </div>
            ))}

            {isLastPage(pageIdx) && isCounselor && (
              <div className="report-block">
                <div className="report-section-title">상담자 참고사항</div>
                <div className="counselor-points">
                  {(section as CounselorSection).counselor_notes.map((pt, i) => (
                    <div className="counselor-point" key={i}>
                      <div className="counselor-point-title">{i + 1}. {pt.title}</div>
                      <p className="counselor-point-detail">{pt.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isLastPage(pageIdx) && <NextStepsInfographic />}
          </div>

          {isLastPage(pageIdx) && (
            <div className="report-disclaimer">
              본 보고서는 담당 상담자의 전문적 판단과 임상적 검토를 거쳐 사용해야 합니다.
              검사 결과는 내담자의 현재 심리 상태에 대한 참고 자료이며 확정적 진단으로 해석되어서는 안 됩니다.
            </div>
          )}

          <PageFooter current={pageIdx + 1} total={allPages.length} />
        </section>
        );
      })}
    </div>
  );
}

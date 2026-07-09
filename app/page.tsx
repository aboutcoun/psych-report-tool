"use client";

import { useState } from "react";
import ScoreGroup from "@/components/ScoreGroup";
import ReportView from "@/components/ReportView";
import {
  MMPI_VALIDITY, MMPI_CLINICAL, MMPI_RC, MMPI_PSY5, MMPI_CONTENT, MMPI_SUPPLEMENTARY,
  TCI_TEMPERAMENT, TCI_CHARACTER, SCT_ITEMS, ScaleDef,
} from "@/lib/scales";
import { ClientInfo, MmpiInput, TciInput, SctInput, ReportResult, TrinInput } from "@/lib/types";

function initScores(defs: ScaleDef[], defaultVal = 50): Record<string, number> {
  const out: Record<string, number> = {};
  defs.forEach((d) => (out[d.key] = defaultVal));
  return out;
}

// "66t" / "55F" 같은 입력을 { value, direction } 으로 파싱
function parseTrin(raw: string): TrinInput | null {
  const m = raw.trim().match(/^(\d{1,3})\s*([tTfF])$/);
  if (!m) return null;
  return { value: Number(m[1]), direction: m[2].toUpperCase() as "T" | "F" };
}

type Tab = "mmpi" | "tci" | "sct";

export default function Home() {
  const [tab, setTab] = useState<Tab>("mmpi");
  const [client, setClient] = useState<ClientInfo>({ name: "", gender: "", age: "", testDate: "" });

  // 실시한 검사 선택 (기본값: 전부 미선택)
  const [mmpiEnabled, setMmpiEnabled] = useState(false);
  const [tciEnabled, setTciEnabled] = useState(false);
  const [sctEnabled, setSctEnabled] = useState(false);

  const [validity, setValidity] = useState(initScores(MMPI_VALIDITY));
  const [trinText, setTrinText] = useState("50T");
  const [clinical, setClinical] = useState(initScores(MMPI_CLINICAL));
  const [rc, setRc] = useState(initScores(MMPI_RC));
  const [psy5, setPsy5] = useState(initScores(MMPI_PSY5));
  const [content, setContent] = useState(initScores(MMPI_CONTENT));
  const [supplementary, setSupplementary] = useState(initScores(MMPI_SUPPLEMENTARY));

  const [temperament, setTemperament] = useState(initScores(TCI_TEMPERAMENT));
  const [character, setCharacter] = useState(initScores(TCI_CHARACTER));

  const [sctResponses, setSctResponses] = useState<Record<number, string>>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReportResult | null>(null);

  function makeSetter(setter: (v: Record<string, number>) => void, current: Record<string, number>) {
    return (key: string, value: number) => setter({ ...current, [key]: value });
  }

  async function handleSubmit() {
    setError(null);

    if (!mmpiEnabled && !tciEnabled) {
      setError('"실시한 검사"에서 MMPI-2와 TCI 중 최소 하나는 선택해야 보고서를 생성할 수 있습니다.');
      return;
    }

    const trin = parseTrin(trinText);
    if (mmpiEnabled && !trin) {
      setError('TRIN 입력 형식이 올바르지 않습니다. "66T" 또는 "55F"처럼 숫자 뒤에 T 또는 F를 붙여 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const mmpi: MmpiInput = { enabled: mmpiEnabled, validity, trin: trin || { value: 50, direction: "T" }, clinical, rc, psy5, content, supplementary };
      const tci: TciInput = { enabled: tciEnabled, temperament, character };
      const sct: SctInput = { enabled: sctEnabled, responses: sctResponses };

      const res = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client, mmpi, tci, sct }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "보고서 생성에 실패했습니다.");
        return;
      }
      setResult(data.result);
    } catch (e: any) {
      setError(e?.message || "네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    const trin = parseTrin(trinText) || { value: 50, direction: "T" as const };
    return (
      <div className="app-shell">
        <ReportView
          client={client}
          mmpi={{ enabled: mmpiEnabled, validity, trin, clinical, rc, psy5, content, supplementary }}
          tci={{ enabled: tciEnabled, temperament, character }}
          sctEnabled={sctEnabled}
          result={result}
          onPrint={() => window.print()}
          onBack={() => setResult(null)}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header no-print">
        <h1>심리검사 통합 해석 보고서 생성</h1>
        <p>MMPI-2 · TCI · SCT 결과를 입력하면 통합 해석 보고서를 생성합니다.</p>
      </header>

      <div className="client-info-grid no-print">
        <div>
          <label>이름</label>
          <input value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} />
        </div>
        <div>
          <label>성별</label>
          <select value={client.gender} onChange={(e) => setClient({ ...client, gender: e.target.value as any })}>
            <option value="">선택</option>
            <option value="남">남</option>
            <option value="여">여</option>
          </select>
        </div>
        <div>
          <label>연령(만)</label>
          <input value={client.age} onChange={(e) => setClient({ ...client, age: e.target.value })} />
        </div>
        <div>
          <label>검사일</label>
          <input type="date" value={client.testDate} onChange={(e) => setClient({ ...client, testDate: e.target.value })} />
        </div>
      </div>

      <div className="test-select-box no-print">
        <div className="test-select-label">실시한 검사</div>
        <div className="test-toggle-group">
          <button
            type="button"
            className={`test-toggle-btn ${mmpiEnabled ? "on" : ""}`}
            onClick={() => setMmpiEnabled((v) => !v)}
          >
            MMPI-2
          </button>
          <button
            type="button"
            className={`test-toggle-btn ${tciEnabled ? "on" : ""}`}
            onClick={() => setTciEnabled((v) => !v)}
          >
            TCI
          </button>
          <button
            type="button"
            className={`test-toggle-btn ${sctEnabled ? "on" : ""}`}
            onClick={() => setSctEnabled((v) => !v)}
          >
            SCT
          </button>
        </div>
      </div>

      <div className="tabs no-print">
        <button className={`tab-btn ${tab === "mmpi" ? "active" : ""}`} onClick={() => setTab("mmpi")}>MMPI-2</button>
        <button className={`tab-btn ${tab === "tci" ? "active" : ""}`} onClick={() => setTab("tci")}>TCI</button>
        <button className={`tab-btn ${tab === "sct" ? "active" : ""}`} onClick={() => setTab("sct")}>SCT</button>
      </div>

      {tab === "mmpi" && (
        <div className="no-print">
          {!mmpiEnabled ? (
            <p className="tab-disabled-note">
              위 "실시한 검사"에서 MMPI-2를 선택하면 입력란이 나타납니다.
            </p>
          ) : (
            <>
              <details className="section-group" open>
                <summary>타당도척도</summary>
                <div className="score-grid">
                  <div className="score-field">
                    <label htmlFor="VRIN">VRIN</label>
                    <input
                      id="VRIN"
                      type="number"
                      value={validity["VRIN"] ?? 50}
                      onChange={(e) => setValidity({ ...validity, VRIN: Number(e.target.value) })}
                    />
                  </div>
                  <div className="score-field">
                    <label htmlFor="trin-input">TRIN (예: 66T / 55F)</label>
                    <input
                      id="trin-input"
                      type="text"
                      placeholder="예: 66T"
                      value={trinText}
                      onChange={(e) => setTrinText(e.target.value)}
                    />
                  </div>
                  {MMPI_VALIDITY.filter((d) => d.key !== "VRIN").map((d) => (
                    <div className="score-field" key={d.key}>
                      <label htmlFor={d.key}>{d.label}</label>
                      <input
                        id={d.key}
                        type="number"
                        value={validity[d.key] ?? 50}
                        onChange={(e) => setValidity({ ...validity, [d.key]: Number(e.target.value) })}
                      />
                    </div>
                  ))}
                </div>
              </details>
              <ScoreGroup title="임상척도" defs={MMPI_CLINICAL} values={clinical} onChange={makeSetter(setClinical, clinical)} defaultOpen />
              <ScoreGroup title="재구성임상척도 (RC)" defs={MMPI_RC} values={rc} onChange={makeSetter(setRc, rc)} defaultOpen />
              <ScoreGroup title="성격병리5요인 (PSY-5)" defs={MMPI_PSY5} values={psy5} onChange={makeSetter(setPsy5, psy5)} defaultOpen />
              <ScoreGroup title="내용척도" defs={MMPI_CONTENT} values={content} onChange={makeSetter(setContent, content)} defaultOpen />
              <ScoreGroup title="보충척도" defs={MMPI_SUPPLEMENTARY} values={supplementary} onChange={makeSetter(setSupplementary, supplementary)} defaultOpen />
            </>
          )}
        </div>
      )}

      {tab === "tci" && (
        <div className="no-print">
          {!tciEnabled ? (
            <p className="tab-disabled-note">
              위 "실시한 검사"에서 TCI를 선택하면 입력란이 나타납니다.
            </p>
          ) : (
            <>
              <ScoreGroup title="기질척도 (백분위)" defs={TCI_TEMPERAMENT} values={temperament} onChange={makeSetter(setTemperament, temperament)} defaultOpen />
              <ScoreGroup title="성격척도 (백분위)" defs={TCI_CHARACTER} values={character} onChange={makeSetter(setCharacter, character)} defaultOpen />
            </>
          )}
        </div>
      )}

      {tab === "sct" && (
        <div className="no-print">
          {!sctEnabled ? (
            <p className="tab-disabled-note">
              위 "실시한 검사"에서 SCT를 선택하면 입력란이 나타납니다.
            </p>
          ) : (
            <div className="section-group" style={{ padding: 0 }}>
              <div style={{ padding: "14px 16px" }}>
                <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: 0 }}>
                  응답이 있는 문항만 입력하시면 됩니다. 빈 문항은 해석에서 제외됩니다.
                </p>
              </div>
              {SCT_ITEMS.map((stem, idx) => {
                const num = idx + 1;
                return (
                  <div className="sct-item" key={num}>
                    <span>{num}. {stem}</span>
                    <input
                      value={sctResponses[num] || ""}
                      onChange={(e) => setSctResponses({ ...sctResponses, [num]: e.target.value })}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {error && <div className="error-box no-print">{error}</div>}

      <div className="submit-bar no-print">
        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? "보고서 생성 중… (약 20~40초 소요)" : "통합 해석 보고서 생성"}
        </button>
      </div>
    </div>
  );
}

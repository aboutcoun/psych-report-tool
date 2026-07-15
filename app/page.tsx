"use client";

import { useState, useEffect, useRef } from "react";
import ScoreGroup from "@/components/ScoreGroup";
import ReportView from "@/components/ReportView";
import {
  MMPI_VALIDITY, MMPI_CLINICAL, MMPI_RC, MMPI_PSY5, MMPI_CONTENT, MMPI_SUPPLEMENTARY,
  TCI_TEMPERAMENT, TCI_CHARACTER, SCT_ITEMS, ScaleDef,
} from "@/lib/scales";
import { ClientInfo, MmpiInput, TciInput, SctInput, ReportResult, TrinInput } from "@/lib/types";

const DRAFT_KEY = "psych-report-tool:draft:v1";

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
  const [sctLookupPhone4, setSctLookupPhone4] = useState("");
  const [sctLookupLoading, setSctLookupLoading] = useState(false);
  const [sctLookupError, setSctLookupError] = useState<string | null>(null);
  const [sctLookupInfo, setSctLookupInfo] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReportResult | null>(null);

  const [showConfirm, setShowConfirm] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const hydrated = useRef(false);

  // ── 임시저장 불러오기 (최초 1회) ──────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.client) setClient(d.client);
        if (typeof d.mmpiEnabled === "boolean") setMmpiEnabled(d.mmpiEnabled);
        if (typeof d.tciEnabled === "boolean") setTciEnabled(d.tciEnabled);
        if (typeof d.sctEnabled === "boolean") setSctEnabled(d.sctEnabled);
        if (d.validity) setValidity(d.validity);
        if (d.trinText) setTrinText(d.trinText);
        if (d.clinical) setClinical(d.clinical);
        if (d.rc) setRc(d.rc);
        if (d.psy5) setPsy5(d.psy5);
        if (d.content) setContent(d.content);
        if (d.supplementary) setSupplementary(d.supplementary);
        if (d.temperament) setTemperament(d.temperament);
        if (d.character) setCharacter(d.character);
        if (d.sctResponses) setSctResponses(d.sctResponses);
        if (d.savedAt) setLastSavedAt(d.savedAt);
      }
    } catch {
      // 손상된 임시저장은 무시
    } finally {
      hydrated.current = true;
    }
  }, []);

  // ── 입력값이 바뀔 때마다 자동 임시저장 ────────────────────
  useEffect(() => {
    if (!hydrated.current) return; // 불러오기 완료 전에는 덮어쓰지 않음
    const savedAt = new Date().toLocaleTimeString("ko-KR");
    const draft = {
      client, mmpiEnabled, tciEnabled, sctEnabled,
      validity, trinText, clinical, rc, psy5, content, supplementary,
      temperament, character, sctResponses, savedAt,
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setLastSavedAt(savedAt);
    } catch {
      // 저장 공간 부족 등은 조용히 무시
    }
  }, [client, mmpiEnabled, tciEnabled, sctEnabled, validity, trinText, clinical, rc, psy5, content, supplementary, temperament, character, sctResponses]);

  // ── 실수로 창을 닫는 것 방지 ─────────────────────────────
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if ((mmpiEnabled || tciEnabled || sctEnabled) && !result) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [mmpiEnabled, tciEnabled, sctEnabled, result]);

  function handleReset() {
    if (!window.confirm("입력한 모든 내용을 초기화할까요? 이 작업은 되돌릴 수 없습니다.")) return;

    setClient({ name: "", gender: "", age: "", testDate: "" });
    setMmpiEnabled(false);
    setTciEnabled(false);
    setSctEnabled(false);
    setValidity(initScores(MMPI_VALIDITY));
    setTrinText("50T");
    setClinical(initScores(MMPI_CLINICAL));
    setRc(initScores(MMPI_RC));
    setPsy5(initScores(MMPI_PSY5));
    setContent(initScores(MMPI_CONTENT));
    setSupplementary(initScores(MMPI_SUPPLEMENTARY));
    setTemperament(initScores(TCI_TEMPERAMENT));
    setCharacter(initScores(TCI_CHARACTER));
    setSctResponses({});
    setError(null);
    setLastSavedAt(null);

    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // 무시
    }
  }

  async function handleSctLookup() {
    setSctLookupError(null);
    setSctLookupInfo(null);

    if (!client.name.trim()) {
      setSctLookupError("먼저 위 인적사항에 이름을 입력해주세요.");
      return;
    }
    if (!/^\d{4}$/.test(sctLookupPhone4)) {
      setSctLookupError("연락처 뒷 4자리를 숫자 4자리로 입력해주세요.");
      return;
    }

    setSctLookupLoading(true);
    try {
      const params = new URLSearchParams({ name: client.name, phone4: sctLookupPhone4 });
      const res = await fetch(`/api/sct-lookup?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setSctLookupError(data.error || "조회에 실패했습니다.");
        return;
      }
      const record = data.result;
      setSctResponses(record.responses || {});
      setSctLookupInfo(
        `불러왔습니다 · ${record.name} · ${record.gender || "-"} · 만 ${record.age || "-"}세 · 제출일 ${new Date(record.submittedAt).toLocaleString("ko-KR")}`
      );
    } catch (e: any) {
      setSctLookupError(e?.message || "네트워크 오류가 발생했습니다.");
    } finally {
      setSctLookupLoading(false);
    }
  }

  function makeSetter(setter: (v: Record<string, number>) => void, current: Record<string, number>) {
    return (key: string, value: number) => setter({ ...current, [key]: value });
  }

  function isAllDefault(scores: Record<string, number>, def = 50) {
    return Object.values(scores).every((v) => v === def);
  }

  // 실수로 아직 입력 안 한 것처럼 보이는 검사가 있는지 체크
  const suspiciouslyEmpty: string[] = [];
  if (mmpiEnabled) {
    const allDefault =
      isAllDefault(validity) && isAllDefault(clinical) && isAllDefault(rc) &&
      isAllDefault(psy5) && isAllDefault(content) && isAllDefault(supplementary);
    if (allDefault) suspiciouslyEmpty.push("MMPI-2");
  }
  if (tciEnabled) {
    if (isAllDefault(temperament) && isAllDefault(character)) suspiciouslyEmpty.push("TCI");
  }

  function openConfirm() {
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
    setShowConfirm(true);
  }

  async function handleSubmit() {
    setShowConfirm(false);
    setError(null);
    const trin = parseTrin(trinText) || { value: 50, direction: "T" as const };

    setLoading(true);
    try {
      const mmpi: MmpiInput = { enabled: mmpiEnabled, validity, trin, clinical, rc, psy5, content, supplementary };
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
          sctResponses={sctResponses}
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
        <div className="test-select-row">
          <div className="test-select-label">실시한 검사</div>
          <button type="button" className="reset-link-btn" onClick={handleReset}>전체 초기화</button>
        </div>
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
              <div className="sct-lookup-box">
                <div className="sct-lookup-label">내담자가 직접 제출한 응답 불러오기</div>
                <div className="sct-lookup-row">
                  <div className="sct-lookup-field">
                    <label>이름 (위 인적사항과 동일)</label>
                    <input value={client.name} readOnly />
                  </div>
                  <div className="sct-lookup-field">
                    <label>연락처 뒷 4자리</label>
                    <input
                      value={sctLookupPhone4}
                      maxLength={4}
                      placeholder="예: 1234"
                      onChange={(e) => setSctLookupPhone4(e.target.value.replace(/[^0-9]/g, ""))}
                    />
                  </div>
                  <button type="button" className="btn-secondary" onClick={handleSctLookup} disabled={sctLookupLoading}>
                    {sctLookupLoading ? "조회 중…" : "불러오기"}
                  </button>
                </div>
                {sctLookupError && <div className="sct-lookup-msg error">{sctLookupError}</div>}
                {sctLookupInfo && <div className="sct-lookup-msg ok">{sctLookupInfo}</div>}
              </div>

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
        {lastSavedAt && <div className="autosave-note">임시 저장됨 · {lastSavedAt}</div>}
        <button className="btn-primary" onClick={openConfirm} disabled={loading}>
          {loading ? "보고서 생성 중… (약 10~25초 소요)" : "통합 해석 보고서 생성"}
        </button>
      </div>

      {showConfirm && (
        <div className="modal-overlay no-print" onClick={() => setShowConfirm(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>이대로 보고서를 생성할까요?</h3>
            <ul className="modal-checklist">
              <li>실시 검사: {[mmpiEnabled && "MMPI-2", tciEnabled && "TCI", sctEnabled && "SCT"].filter(Boolean).join(", ") || "없음"}</li>
              <li>이름: {client.name || "(미입력)"}</li>
            </ul>

            {suspiciouslyEmpty.length > 0 && (
              <div className="modal-warning">
                ⚠ {suspiciouslyEmpty.join(", ")} 점수가 전부 기본값(50)으로 남아있어요. 아직 입력을 안 하신 건 아닌지 확인해보세요.
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowConfirm(false)}>다시 확인하기</button>
              <button className="btn-primary" style={{ width: "auto", padding: "10px 20px" }} onClick={handleSubmit}>
                네, 생성할게요
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

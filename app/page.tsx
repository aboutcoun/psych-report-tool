"use client";

import { useState, useEffect, useRef } from "react";
import ScoreGroup from "@/components/ScoreGroup";
import ReportView from "@/components/ReportView";
import {
  MMPI_VALIDITY, MMPI_CLINICAL, MMPI_RC, MMPI_PSY5, MMPI_CONTENT, MMPI_SUPPLEMENTARY,
  TCI_TEMPERAMENT, TCI_CHARACTER, SCT_ITEMS, ScaleDef,
} from "@/lib/scales";
import { ClientInfo, MmpiInput, TciInput, SctInput, ReportResult, TrinInput, SavedReport } from "@/lib/types";

const DRAFT_KEY = "psych-report-tool:draft:v1";

function initScores(defs: ScaleDef[], defaultVal = 50): Record<string, number> {
  const out: Record<string, number> = {};
  defs.forEach((d) => (out[d.key] = defaultVal));
  return out;
}

// 서버(route.ts)의 validateReportResult와 동일한 기준으로, 저장된 리포트를
// 불러올 때도 핵심 텍스트 필드가 실제로 채워져 있는지 확인.
// 객체 존재 여부만 얕게 보면, 필드가 빈 문자열인 "속은 텅 빈" 리포트를
// 걸러내지 못해 화면만 넘어가고 아무 내용도 안 보이는 것처럼 보임.
function isUsableReportResult(result: ReportResult | undefined | null, mmpiEnabled: boolean, tciEnabled: boolean): boolean {
  if (!result) return false;
  for (const section of [result.client, result.counselor] as any[]) {
    if (!section || typeof section.integration_recommendations !== "string" || !section.integration_recommendations.trim()) {
      return false;
    }
    if (mmpiEnabled && (!section.validity_summary?.trim() || !section.symptom_summary?.trim())) {
      return false;
    }
    if (tciEnabled && (!section.maturity_summary?.trim() || !section.temperament_character_summary?.trim())) {
      return false;
    }
  }
  const counselorNotes = (result.counselor as any)?.counselor_notes;
  if (!Array.isArray(counselorNotes) || counselorNotes.length === 0) return false;
  return true;
}

// "66t" / "55F" 또는 문자 없이 "66" 만도 허용해서 { value, direction } 으로 파싱
function parseTrin(raw: string): TrinInput | null {
  const m = raw.trim().match(/^(\d{1,3})\s*([tTfF])?$/);
  if (!m) return null;
  return { value: Number(m[1]), direction: (m[2] ? (m[2].toUpperCase() as "T" | "F") : "") };
}

type Tab = "mmpi" | "tci" | "sct";

export default function Home() {
  const [tab, setTab] = useState<Tab>("mmpi");
  const [client, setClient] = useState<ClientInfo>({ name: "", gender: "", age: "" });

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
  const [sctLookupInfo, setSctLookupInfo] = useState<string | null>(null);

  const [showSctList, setShowSctList] = useState(false);
  const [sctList, setSctList] = useState<Array<{
    key: string; name: string; gender: string; age: string; phone4?: string;
    responses: Record<number, string>; submittedAt: string;
  }>>([]);
  const [sctListLoading, setSctListLoading] = useState(false);
  const [sctListError, setSctListError] = useState<string | null>(null);
  const [sctListPage, setSctListPage] = useState(1);
  const SCT_LIST_PAGE_SIZE = 10;

  const [mmpiPdfLoading, setMmpiPdfLoading] = useState(false);
  const [mmpiPdfError, setMmpiPdfError] = useState<string | null>(null);
  const [mmpiPdfInfo, setMmpiPdfInfo] = useState<string | null>(null);
  const [mmpiPdfDebugSnippet, setMmpiPdfDebugSnippet] = useState<string | null>(null);

  const [tciPdfLoading, setTciPdfLoading] = useState(false);
  const [tciPdfError, setTciPdfError] = useState<string | null>(null);
  const [tciPdfInfo, setTciPdfInfo] = useState<string | null>(null);
  const [tciPdfDebugSnippet, setTciPdfDebugSnippet] = useState<string | null>(null);

  const [showReportList, setShowReportList] = useState(false);
  const [reportList, setReportList] = useState<SavedReport[]>([]);
  const [reportListLoading, setReportListLoading] = useState(false);
  const [reportListError, setReportListError] = useState<string | null>(null);
  const [reportListPage, setReportListPage] = useState(1);
  const REPORT_LIST_PAGE_SIZE = 10;

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
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

  // ── 생성 중 가상 진행률 표시 (실제 진행률을 알 수 없어 추정치로 채워줌) ──
  useEffect(() => {
    if (!loading) {
      setProgress(0);
      setProgressLabel("");
      return;
    }

    const stages = [
      { at: 0, label: "검사 결과를 분석하고 있어요" },
      { at: 30, label: "내담자용 해석을 작성하고 있어요" },
      { at: 60, label: "상담자용 해석을 작성하고 있어요" },
      { at: 85, label: "보고서를 정리하고 있어요" },
    ];

    setProgress(2);
    setProgressLabel(stages[0].label);

    const interval = setInterval(() => {
      setProgress((prev) => {
        // 92%까지는 서서히, 그 이후는 실제 응답이 올 때까지 대기
        if (prev >= 92) return prev;
        const next = prev + (92 - prev) * 0.05 + 0.4;
        const capped = Math.min(next, 92);

        const stage = [...stages].reverse().find((s) => capped >= s.at);
        if (stage) setProgressLabel(stage.label);

        return capped;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [loading]);

  function handleReset() {
    if (!window.confirm("입력한 모든 내용을 초기화할까요? 이 작업은 되돌릴 수 없습니다.")) return;

    setClient({ name: "", gender: "", age: "" });
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

  function applySctRecord(record: { name: string; gender: string; age: string; responses: Record<number, string>; submittedAt: string }) {
    setSctResponses(record.responses || {});
    setClient((prev) => ({
      ...prev,
      name: record.name || prev.name,
      gender: (record.gender as "남" | "여" | "") || prev.gender,
      age: record.age || prev.age,
    }));
    setSctLookupInfo(
      `불러왔습니다 · ${record.name} · ${record.gender || "-"} · 만 ${record.age || "-"}세 · 제출일 ${new Date(record.submittedAt).toLocaleString("ko-KR")} (인적사항에도 반영했어요)`
    );
  }

  async function handleMmpiPdfUpload(file: File) {
    setMmpiPdfError(null);
    setMmpiPdfInfo(null);
    setMmpiPdfDebugSnippet(null);
    setMmpiPdfLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-mmpi-pdf", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setMmpiPdfError(data.error || "분석에 실패했습니다.");
        if (data.debugSnippet) setMmpiPdfDebugSnippet(data.debugSnippet);
        return;
      }

      const { validity: v, clinical: c, rc: r, psy5: p5, content: ct, supplementary: sup, trin: tr, clientInfo: ci } = data.result;
      if (v && Object.keys(v).length) setValidity((prev) => ({ ...prev, ...v }));
      if (c && Object.keys(c).length) setClinical((prev) => ({ ...prev, ...c }));
      if (r && Object.keys(r).length) setRc((prev) => ({ ...prev, ...r }));
      if (p5 && Object.keys(p5).length) setPsy5((prev) => ({ ...prev, ...p5 }));
      if (ct && Object.keys(ct).length) setContent((prev) => ({ ...prev, ...ct }));
      if (sup && Object.keys(sup).length) setSupplementary((prev) => ({ ...prev, ...sup }));
      if (tr) setTrinText(tr.direction ? `${tr.value}${tr.direction}` : `${tr.value}`);
      if (ci) {
        setClient((prev) => ({
          name: ci.name || prev.name,
          gender: ci.gender || prev.gender,
          age: ci.age || prev.age,
        }));
      }

      const warnings: string[] = data.warnings || [];
      setMmpiPdfInfo(
        warnings.length > 0
          ? `자동 입력 완료했지만 일부 확인이 필요해요: ${warnings.join(" ")}`
          : "자동 입력이 완료됐어요. 값이 정확한지 한 번 확인해주세요."
      );
    } catch (e: any) {
      setMmpiPdfError(e?.message || "네트워크 오류가 발생했습니다.");
    } finally {
      setMmpiPdfLoading(false);
    }
  }

  async function toggleReportList() {
    const next = !showReportList;
    setShowReportList(next);
    if (!next) return;

    setReportListError(null);
    setReportListLoading(true);
    setReportListPage(1);
    try {
      const res = await fetch("/api/report-list");
      const data = await res.json();
      if (!res.ok) {
        setReportListError(data.error || "목록을 불러오지 못했습니다.");
        return;
      }
      setReportList(data.result || []);
    } catch (e: any) {
      setReportListError(e?.message || "네트워크 오류가 발생했습니다.");
    } finally {
      setReportListLoading(false);
    }
  }

  function openSavedReport(record: SavedReport) {
    setClient(record.client);
    setMmpiEnabled(record.mmpi.enabled);
    setValidity(record.mmpi.validity);
    setTrinText(record.mmpi.trin.direction ? `${record.mmpi.trin.value}${record.mmpi.trin.direction}` : `${record.mmpi.trin.value}`);
    setClinical(record.mmpi.clinical);
    setRc(record.mmpi.rc);
    setPsy5(record.mmpi.psy5);
    setContent(record.mmpi.content);
    setSupplementary(record.mmpi.supplementary);
    setTciEnabled(record.tci.enabled);
    setTemperament(record.tci.temperament);
    setCharacter(record.tci.character);
    setSctEnabled(record.sctEnabled);
    setSctResponses(record.sctResponses);
    if (!isUsableReportResult(record.result, record.mmpi.enabled, record.tci.enabled)) {
      // 수정 전에 생성되어 이미 서버에 저장된 옛 데이터는 client/counselor
      // 자체는 있어도 그 안의 텍스트 필드가 비어있을 수 있음 — 그대로
      // 화면에 넘기면 크래시하거나, 제목만 있고 본문이 텅 빈 리포트가 뜸
      setError("이 저장된 보고서는 형식이 올바르지 않아 불러올 수 없습니다. 입력값은 채워졌으니, 새로 '통합 해석 보고서 생성'을 눌러 다시 만들어주세요.");
      setResult(null);
      return;
    }
    setResult(record.result);
  }

  async function handleTciPdfUpload(file: File) {
    setTciPdfError(null);
    setTciPdfInfo(null);
    setTciPdfDebugSnippet(null);
    setTciPdfLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-tci-pdf", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setTciPdfError(data.error || "분석에 실패했습니다.");
        if (data.debugSnippet) setTciPdfDebugSnippet(data.debugSnippet);
        return;
      }

      const { temperament: t, character: c, clientInfo: ci } = data.result;
      if (t && Object.keys(t).length) setTemperament((prev) => ({ ...prev, ...t }));
      if (c && Object.keys(c).length) setCharacter((prev) => ({ ...prev, ...c }));
      if (ci) {
        setClient((prev) => ({
          name: ci.name || prev.name,
          gender: ci.gender || prev.gender,
          age: ci.age || prev.age,
        }));
      }

      const warnings: string[] = data.warnings || [];
      setTciPdfInfo(
        warnings.length > 0
          ? `자동 입력 완료했지만 일부 확인이 필요해요: ${warnings.join(" ")}`
          : "자동 입력이 완료됐어요. 값이 정확한지 한 번 확인해주세요."
      );
    } catch (e: any) {
      setTciPdfError(e?.message || "네트워크 오류가 발생했습니다.");
    } finally {
      setTciPdfLoading(false);
    }
  }

  async function toggleSctList() {
    const next = !showSctList;
    setShowSctList(next);
    if (!next) return;

    setSctListError(null);
    setSctListLoading(true);
    setSctListPage(1);
    try {
      const res = await fetch("/api/sct-list");
      const data = await res.json();
      if (!res.ok) {
        setSctListError(data.error || "목록을 불러오지 못했습니다.");
        return;
      }
      setSctList(data.result || []);
    } catch (e: any) {
      setSctListError(e?.message || "네트워크 오류가 발생했습니다.");
    } finally {
      setSctListLoading(false);
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

    if (!mmpiEnabled && !tciEnabled && !sctEnabled) {
      setError('"실시한 검사"에서 최소 하나는 선택해야 보고서를 생성할 수 있습니다.');
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
      if (!isUsableReportResult(data.result, mmpiEnabled, tciEnabled)) {
        // 서버 검증을 통과했더라도 혹시 모를 형식 이상에 대비한 이중 방어.
        // 여기서 걸러주지 않으면 리포트 화면에서 undefined 속성 접근으로
        // 화면 전체가 하얗게 크래시하거나, 본문이 텅 빈 채로 표시됨
        setError("보고서 생성 결과 형식이 올바르지 않습니다. 잠시 후 다시 시도해주세요.");
        return;
      }
      setResult(data.result);

      // 재출력을 위해 서버(30일 보관)에도 저장 — 실패해도 화면 결과에는 영향 없음(best-effort)
      fetch("/api/save-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client, mmpi, tci, sctEnabled, sctResponses, result: data.result }),
      }).catch(() => {
        // 저장 실패해도 조용히 무시 (화면에 보이는 보고서 자체는 이미 정상 생성됨)
      });

      // 보고서 생성이 끝나면 다음 상담사가 새로 시작할 수 있도록 임시저장 데이터를 지움
      // (인쇄/출력은 이 시점 이후 화면에서 이뤄지므로, 생성 완료를 "이번 건 작업 끝"으로 봄)
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // 무시
      }
      setLastSavedAt(null);
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

      <div className="report-list-box no-print">
        <button type="button" className="sct-list-toggle-btn" onClick={toggleReportList}>
          {showReportList ? "저장된 보고서 목록 닫기 ▲" : "저장된 보고서 목록 보기 (최근 30일) ▼"}
        </button>

        {showReportList && (
          <div className="sct-list-box">
            {reportListLoading && <p className="sct-list-msg">불러오는 중…</p>}
            {reportListError && <div className="sct-lookup-msg error">{reportListError}</div>}
            {!reportListLoading && !reportListError && reportList.length === 0 && (
              <p className="sct-list-msg">최근 30일 내 생성된 보고서가 없습니다.</p>
            )}
            {!reportListLoading && reportList.length > 0 && (
              <>
              <table className="sct-list-table">
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>성별</th>
                    <th>연령</th>
                    <th>실시 검사</th>
                    <th>생성일시</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {reportList
                    .slice((reportListPage - 1) * REPORT_LIST_PAGE_SIZE, reportListPage * REPORT_LIST_PAGE_SIZE)
                    .map((rec) => {
                      const tests = [rec.mmpi.enabled && "MMPI-2", rec.tci.enabled && "TCI", rec.sctEnabled && "SCT"].filter(Boolean).join(", ");
                      return (
                        <tr key={rec.id}>
                          <td>{rec.client.name || "-"}</td>
                          <td>{rec.client.gender || "-"}</td>
                          <td>{rec.client.age ? `만 ${rec.client.age}세` : "-"}</td>
                          <td>{tests || "-"}</td>
                          <td>{new Date(rec.generatedAt).toLocaleString("ko-KR")}</td>
                          <td>
                            <button type="button" className="sct-list-apply-btn" onClick={() => openSavedReport(rec)}>
                              열기
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>

              {reportList.length > REPORT_LIST_PAGE_SIZE && (
                <div className="sct-list-pagination">
                  <button
                    type="button"
                    className="sct-list-page-btn"
                    onClick={() => setReportListPage((p) => Math.max(1, p - 1))}
                    disabled={reportListPage === 1}
                  >
                    이전
                  </button>
                  <span className="sct-list-page-info">
                    {reportListPage} / {Math.ceil(reportList.length / REPORT_LIST_PAGE_SIZE)} 페이지 (총 {reportList.length}건)
                  </span>
                  <button
                    type="button"
                    className="sct-list-page-btn"
                    onClick={() => setReportListPage((p) => Math.min(Math.ceil(reportList.length / REPORT_LIST_PAGE_SIZE), p + 1))}
                    disabled={reportListPage >= Math.ceil(reportList.length / REPORT_LIST_PAGE_SIZE)}
                  >
                    다음
                  </button>
                </div>
              )}
              </>
            )}
          </div>
        )}
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
              <div className="mmpi-pdf-box">
                <div className="mmpi-pdf-label">MMPI-2 결과지 PDF로 자동 입력 (선택)</div>
                <p className="mmpi-pdf-desc">
                  검사 프로그램에서 나온 결과지 PDF(1페이지 요약표 포함)를 올리면 아래 척도 값이 자동으로 채워집니다.
                  자동 입력 후에도 값은 꼭 한 번 확인해주세요.
                </p>
                <input
                  type="file"
                  accept="application/pdf"
                  disabled={mmpiPdfLoading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleMmpiPdfUpload(file);
                    e.target.value = "";
                  }}
                />
                {mmpiPdfLoading && <div className="sct-lookup-msg ok">분석 중… 잠시만 기다려주세요.</div>}
                {mmpiPdfError && <div className="sct-lookup-msg error">{mmpiPdfError}</div>}
                {mmpiPdfInfo && <div className="sct-lookup-msg ok">{mmpiPdfInfo}</div>}
                {mmpiPdfDebugSnippet && (
                  <div className="mmpi-pdf-debug">
                    <div className="mmpi-pdf-debug-label">
                      자동 인식이 안 되면, 아래 내용을 복사해서 개발자에게 보내주세요.
                    </div>
                    <textarea readOnly value={mmpiPdfDebugSnippet} />
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => navigator.clipboard.writeText(mmpiPdfDebugSnippet)}
                    >
                      복사하기
                    </button>
                  </div>
                )}
              </div>

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
                    <label htmlFor="trin-input">TRIN (예: 66T / 55F / 66)</label>
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
              <div className="mmpi-pdf-box">
                <div className="mmpi-pdf-label">TCI 결과지 PDF로 자동 입력 (선택)</div>
                <p className="mmpi-pdf-desc">
                  검사 프로그램에서 나온 TCI-RS 결과지 PDF를 올리면 백분위 점수가 자동으로 채워집니다.
                  자동 입력 후에도 값은 꼭 한 번 확인해주세요.
                </p>
                <input
                  type="file"
                  accept="application/pdf"
                  disabled={tciPdfLoading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleTciPdfUpload(file);
                    e.target.value = "";
                  }}
                />
                {tciPdfLoading && <div className="sct-lookup-msg ok">분석 중… 잠시만 기다려주세요.</div>}
                {tciPdfError && <div className="sct-lookup-msg error">{tciPdfError}</div>}
                {tciPdfInfo && <div className="sct-lookup-msg ok">{tciPdfInfo}</div>}
                {tciPdfDebugSnippet && (
                  <div className="mmpi-pdf-debug">
                    <div className="mmpi-pdf-debug-label">
                      자동 인식이 안 되면, 아래 내용을 복사해서 개발자에게 보내주세요.
                    </div>
                    <textarea readOnly value={tciPdfDebugSnippet} />
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => navigator.clipboard.writeText(tciPdfDebugSnippet)}
                    >
                      복사하기
                    </button>
                  </div>
                )}
              </div>

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
                {sctLookupInfo && <div className="sct-lookup-msg ok">{sctLookupInfo}</div>}

                <button type="button" className="sct-list-toggle-btn" onClick={toggleSctList}>
                  {showSctList ? "제출자 목록 닫기 ▲" : "제출자 목록 보기 ▼"}
                </button>

                {showSctList && (
                  <div className="sct-list-box">
                    {sctListLoading && <p className="sct-list-msg">불러오는 중…</p>}
                    {sctListError && <div className="sct-lookup-msg error">{sctListError}</div>}
                    {!sctListLoading && !sctListError && sctList.length === 0 && (
                      <p className="sct-list-msg">아직 제출된 응답이 없습니다.</p>
                    )}
                    {!sctListLoading && sctList.length > 0 && (
                      <>
                      <table className="sct-list-table">
                        <thead>
                          <tr>
                            <th>이름</th>
                            <th>성별</th>
                            <th>연령</th>
                            <th>제출일시</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {sctList
                            .slice((sctListPage - 1) * SCT_LIST_PAGE_SIZE, sctListPage * SCT_LIST_PAGE_SIZE)
                            .map((rec) => (
                            <tr key={rec.key}>
                              <td>{rec.name}</td>
                              <td>{rec.gender || "-"}</td>
                              <td>{rec.age ? `만 ${rec.age}세` : "-"}</td>
                              <td>{new Date(rec.submittedAt).toLocaleString("ko-KR")}</td>
                              <td>
                                <button
                                  type="button"
                                  className="sct-list-apply-btn"
                                  onClick={() => applySctRecord(rec)}
                                >
                                  불러오기
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {sctList.length > SCT_LIST_PAGE_SIZE && (
                        <div className="sct-list-pagination">
                          <button
                            type="button"
                            className="sct-list-page-btn"
                            onClick={() => setSctListPage((p) => Math.max(1, p - 1))}
                            disabled={sctListPage === 1}
                          >
                            이전
                          </button>
                          <span className="sct-list-page-info">
                            {sctListPage} / {Math.ceil(sctList.length / SCT_LIST_PAGE_SIZE)} 페이지 (총 {sctList.length}명)
                          </span>
                          <button
                            type="button"
                            className="sct-list-page-btn"
                            onClick={() => setSctListPage((p) => Math.min(Math.ceil(sctList.length / SCT_LIST_PAGE_SIZE), p + 1))}
                            disabled={sctListPage >= Math.ceil(sctList.length / SCT_LIST_PAGE_SIZE)}
                          >
                            다음
                          </button>
                        </div>
                      )}
                      </>
                    )}
                  </div>
                )}
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
        {lastSavedAt && !loading && <div className="autosave-note">임시 저장됨 · {lastSavedAt}</div>}
        {loading && (
          <div className="progress-wrap">
            <div className="progress-label">
              <span>{progressLabel || "생성 중이에요"}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="progress-hint">보통 40~50초 정도 걸려요. 이 화면을 벗어나지 말고 잠시만 기다려주세요.</div>
          </div>
        )}
        <button className="btn-primary" onClick={openConfirm} disabled={loading}>
          {loading ? "보고서 생성 중…" : "통합 해석 보고서 생성"}
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

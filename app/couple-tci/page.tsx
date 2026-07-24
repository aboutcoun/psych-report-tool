"use client";

import { useState, useEffect } from "react";
import ScoreGroup from "@/components/ScoreGroup";
import CoupleReportView from "@/components/CoupleReportView";
import { TCI_TEMPERAMENT, COUPLE_TCI_CHARACTER, ScaleDef } from "@/lib/scales";
import { CoupleReportRequestBody, CoupleReportResult, CouplePerson } from "@/lib/types";

function initScores(defs: ScaleDef[], defaultVal = 50): Record<string, number> {
  const out: Record<string, number> = {};
  defs.forEach((d) => (out[d.key] = defaultVal));
  return out;
}

function PersonForm({
  title, name, setName, gender, setGender, temperament, setTemperament, character, setCharacter,
}: {
  title: string;
  name: string;
  setName: (v: string) => void;
  gender: "남" | "여" | "";
  setGender: (v: "남" | "여" | "") => void;
  temperament: Record<string, number>;
  setTemperament: (v: Record<string, number>) => void;
  character: Record<string, number>;
  setCharacter: (v: Record<string, number>) => void;
}) {
  return (
    <div className="couple-person-card" style={{ marginBottom: 20 }}>
      <div className="couple-person-title">{title}</div>
      <div className="client-info-grid" style={{ marginBottom: 14 }}>
        <div>
          <label>이름</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label>성별</label>
          <select value={gender} onChange={(e) => setGender(e.target.value as any)}>
            <option value="">선택</option>
            <option value="남">남</option>
            <option value="여">여</option>
          </select>
        </div>
      </div>
      <ScoreGroup
        title="기질척도 (백분위)"
        defs={TCI_TEMPERAMENT}
        values={temperament}
        onChange={(k, v) => setTemperament({ ...temperament, [k]: v })}
        defaultOpen
      />
      <ScoreGroup
        title="성격척도 (백분위)"
        defs={COUPLE_TCI_CHARACTER}
        values={character}
        onChange={(k, v) => setCharacter({ ...character, [k]: v })}
        defaultOpen
      />
    </div>
  );
}

export default function CoupleTciPage() {
  const [name1, setName1] = useState("");
  const [gender1, setGender1] = useState<"남" | "여" | "">("");
  const [temperament1, setTemperament1] = useState(initScores(TCI_TEMPERAMENT));
  const [character1, setCharacter1] = useState(initScores(COUPLE_TCI_CHARACTER));

  const [name2, setName2] = useState("");
  const [gender2, setGender2] = useState<"남" | "여" | "">("");
  const [temperament2, setTemperament2] = useState(initScores(TCI_TEMPERAMENT));
  const [character2, setCharacter2] = useState(initScores(COUPLE_TCI_CHARACTER));

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CoupleReportResult | null>(null);
  const [requestBody, setRequestBody] = useState<CoupleReportRequestBody | null>(null);

  // ── 생성 중 가상 진행률 표시 ─────────────────────────
  useEffect(() => {
    if (!loading) {
      setProgress(0);
      setProgressLabel("");
      return;
    }

    const stages = [
      { at: 0, label: "두 분의 기질/성격 패턴을 분석하고 있어요" },
      { at: 25, label: "어울리는 동물 유형을 찾고 있어요" },
      { at: 50, label: "갈등 시나리오와 처방전을 작성하고 있어요" },
      { at: 80, label: "보고서를 정리하고 있어요" },
    ];

    setProgress(2);
    setProgressLabel(stages[0].label);

    const interval = setInterval(() => {
      setProgress((prev) => {
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

  async function handleSubmit() {
    setError(null);

    if (!name1.trim() || !name2.trim()) {
      setError("두 분의 이름을 모두 입력해주세요.");
      return;
    }

    const person1: CouplePerson = { name: name1.trim(), gender: gender1, temperament: temperament1, character: character1 };
    const person2: CouplePerson = { name: name2.trim(), gender: gender2, temperament: temperament2, character: character2 };
    const body: CoupleReportRequestBody = { person1, person2 };

    setLoading(true);
    try {
      const res = await fetch("/api/generate-couple-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "보고서 생성에 실패했습니다.");
        return;
      }
      setRequestBody(body);
      setResult(data.result);
    } catch (e: any) {
      setError(e?.message || "네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  if (result && requestBody) {
    return (
      <div className="app-shell">
        <CoupleReportView
          request={requestBody}
          result={result}
          onPrint={() => window.print()}
          onBack={() => setResult(null)}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="top-nav no-print">
        <a className="top-nav-link" href="/">개인 통합 보고서</a>
      </div>

      <header className="app-header no-print">
        <h1>커플/부부 TCI 해석상담보고서 생성</h1>
        <p>두 분의 이름·성별과 TCI 기질(4개)·성격(3개) 척도를 입력하면 커플 해석상담보고서를 생성합니다.</p>
      </header>

      <div className="no-print">
        <PersonForm
          title="피검자 1"
          name={name1} setName={setName1}
          gender={gender1} setGender={setGender1}
          temperament={temperament1} setTemperament={setTemperament1}
          character={character1} setCharacter={setCharacter1}
        />
        <PersonForm
          title="피검자 2"
          name={name2} setName={setName2}
          gender={gender2} setGender={setGender2}
          temperament={temperament2} setTemperament={setTemperament2}
          character={character2} setCharacter={setCharacter2}
        />
      </div>

      {error && <div className="error-box no-print">{error}</div>}

      <div className="submit-bar no-print">
        {loading && (
          <div className="progress-wrap">
            <div className="progress-label">
              <span>{progressLabel || "생성 중이에요"}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="progress-hint">보통 30~50초 정도 걸려요. 이 화면을 벗어나지 말고 잠시만 기다려주세요.</div>
          </div>
        )}
        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? "보고서 생성 중…" : "커플 해석상담보고서 생성"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SCT_ITEMS } from "@/lib/scales";

function SctResponseForm() {
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"남" | "여" | "">("");
  const [age, setAge] = useState("");
  const [phone4, setPhone4] = useState("");
  const [responses, setResponses] = useState<Record<number, string>>({});

  useEffect(() => {
    const prefillName = searchParams.get("name");
    if (prefillName) setName(prefillName);
  }, [searchParams]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    setError(null);

    if (!name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }
    if (!/^\d{4}$/.test(phone4)) {
      setError("연락처 뒷 4자리를 숫자 4자리로 정확히 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/sct-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, gender, age, phone4, responses }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "제출에 실패했습니다.");
        return;
      }
      setDone(true);
    } catch (e: any) {
      setError(e?.message || "네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="app-shell">
        <div className="sct-done-box">
          <h2>제출이 완료되었습니다</h2>
          <p>응답해주셔서 감사합니다. 담당 상담자에게 안내받은 절차를 따라주세요.</p>
          <div className="sct-done-brand">어바웃심리상담센터 · aboutcounsel.com</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header no-print">
        <h1>문장완성검사 (SCT)</h1>
        <p>
          다음에 기술된 문장은 뒷부분이 빠져 있습니다. 각 문장을 읽으면서 맨 먼저 떠오르는 생각으로
          뒷부분을 이어 문장이 완성되도록 적어주세요. 시간 제한은 없으나 되도록 빨리 응답해주세요.
        </p>
      </header>

      <div className="client-info-grid no-print">
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
        <div>
          <label>연령(만)</label>
          <input value={age} onChange={(e) => setAge(e.target.value)} />
        </div>
        <div>
          <label>연락처 뒷 4자리</label>
          <input
            value={phone4}
            maxLength={4}
            placeholder="예: 1234"
            onChange={(e) => setPhone4(e.target.value.replace(/[^0-9]/g, ""))}
          />
        </div>
      </div>

      <div className="section-group" style={{ padding: 0 }}>
        {SCT_ITEMS.map((stem, idx) => {
          const num = idx + 1;
          return (
            <div className="sct-item" key={num}>
              <span>{num}. {stem}</span>
              <input
                value={responses[num] || ""}
                onChange={(e) => setResponses({ ...responses, [num]: e.target.value })}
              />
            </div>
          );
        })}
      </div>

      {error && <div className="error-box no-print">{error}</div>}

      <div className="submit-bar no-print">
        <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "제출 중…" : "제출하기"}
        </button>
      </div>
    </div>
  );
}

export default function SctResponsePage() {
  return (
    <Suspense fallback={null}>
      <SctResponseForm />
    </Suspense>
  );
}

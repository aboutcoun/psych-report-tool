"use client";

import { useState } from "react";

export default function SendInvitePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSend() {
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("올바른 이메일 주소를 입력해주세요.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/send-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "발송에 실패했습니다.");
        return;
      }
      setSuccess(`${name}님(${email})에게 SCT 응답 링크를 발송했습니다.`);
      setName("");
      setEmail("");
    } catch (e: any) {
      setError(e?.message || "네트워크 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="app-shell" style={{ maxWidth: 480 }}>
      <header className="app-header no-print">
        <h1>SCT 응답 링크 발송</h1>
        <p>이름과 이메일 주소를 입력하면 문장완성검사(SCT) 응답 링크를 이메일로 보냅니다.</p>
      </header>

      <div className="invite-form-box">
        <div className="score-field" style={{ marginBottom: 14 }}>
          <label>이름</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="내담자 이름"
            style={{ width: "100%", padding: "9px 10px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 14 }}
          />
        </div>
        <div className="score-field" style={{ marginBottom: 18 }}>
          <label>이메일 주소</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            style={{ width: "100%", padding: "9px 10px", border: "1px solid var(--line)", borderRadius: 6, fontSize: 14 }}
          />
        </div>

        {error && <div className="error-box no-print">{error}</div>}
        {success && <div className="sct-lookup-msg ok">{success}</div>}

        <button className="btn-primary" onClick={handleSend} disabled={sending}>
          {sending ? "발송 중…" : "발송하기"}
        </button>
      </div>
    </div>
  );
}

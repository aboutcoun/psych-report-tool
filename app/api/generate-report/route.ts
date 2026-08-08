import { NextRequest, NextResponse } from "next/server";
import { buildPrompt } from "@/lib/promptBuilder";
import { ReportRequestBody, ReportResult } from "@/lib/types";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// 일시적으로 서버가 바쁠 때(503) 또는 요청이 몰릴 때(429) 재시도할 최대 횟수
const MAX_RETRIES = 3;

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) return fenced[1];
  return raw;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Gemini가 문법적으로는 올바른 JSON을 돌려주더라도, 특정 입력(긴 SCT 응답,
// 민감한 내용 등)에서는 기대한 필드가 통째로 빠진 채로 올 수 있음.
// 이 경우 프론트엔드에서 undefined 속성 접근으로 화면이 통째로 크래시남.
// → 서버에서 최소한의 필수 필드가 채워져 있는지 확인하고, 아니면
//   에러로 응답해서 프론트엔드가 "다시 시도" 메시지를 보여줄 수 있게 함.
function validateReportResult(parsed: any, body: ReportRequestBody): string | null {
  if (!parsed || typeof parsed !== "object") {
    return "응답이 객체 형식이 아닙니다.";
  }

  for (const key of ["client", "counselor"] as const) {
    const section = parsed[key];
    if (!section || typeof section !== "object") {
      return `"${key}" 섹션이 비어있습니다.`;
    }
    if (typeof section.integration_recommendations !== "string" || !section.integration_recommendations.trim()) {
      return `"${key}.integration_recommendations" 값이 비어있습니다.`;
    }
    if (body.mmpi?.enabled) {
      if (typeof section.validity_summary !== "string" || !section.validity_summary.trim()) {
        return `"${key}.validity_summary" 값이 비어있습니다.`;
      }
      if (typeof section.symptom_summary !== "string" || !section.symptom_summary.trim()) {
        return `"${key}.symptom_summary" 값이 비어있습니다.`;
      }
    }
    if (body.tci?.enabled) {
      if (typeof section.maturity_summary !== "string" || !section.maturity_summary.trim()) {
        return `"${key}.maturity_summary" 값이 비어있습니다.`;
      }
      if (typeof section.temperament_character_summary !== "string" || !section.temperament_character_summary.trim()) {
        return `"${key}.temperament_character_summary" 값이 비어있습니다.`;
      }
    }
  }

  const counselor = parsed.counselor;
  if (!Array.isArray(counselor.counselor_notes) || counselor.counselor_notes.length === 0) {
    return `"counselor.counselor_notes" 값이 비어있습니다.`;
  }

  return null;
}

async function callGeminiWithRetry(apiKey: string, prompt: string) {
  let lastErrorText = "";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json",
          maxOutputTokens: 16384,
          // 응답 형식이 명확하지 않던 채로 기본값에 맡기면, SCT 응답이 길거나
          // 검사를 여러 개 함께 실시해 출력이 길어지는 케이스에서 중간에
          // 잘려 JSON이 불완전해질 수 있어 여유 있게 상향
        },
      }),
    });

    if (geminiRes.ok) {
      return geminiRes;
    }

    lastErrorText = await geminiRes.text();

    // 503(서버 과부하), 429(요청 과다) 는 시간을 두고 재시도하면 성공하는 경우가 많음
    const isRetryable = geminiRes.status === 503 || geminiRes.status === 429;
    if (!isRetryable || attempt === MAX_RETRIES) {
      throw new Error(`Gemini API 오류(${geminiRes.status}): ${lastErrorText}`);
    }

    // 1초 → 2초 → 4초 순으로 대기 후 재시도
    await sleep(1000 * Math.pow(2, attempt));
  }

  throw new Error(`Gemini API 오류: ${lastErrorText}`);
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "서버에 GEMINI_API_KEY 환경변수가 설정되어 있지 않습니다." },
        { status: 500 }
      );
    }

    const body = (await req.json()) as ReportRequestBody;
    const prompt = buildPrompt(body);

    const geminiRes = await callGeminiWithRetry(apiKey, prompt);

    const data = await geminiRes.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return NextResponse.json(
        { error: "Gemini 응답에서 텍스트를 찾을 수 없습니다.", raw: data },
        { status: 502 }
      );
    }

    let parsed: ReportResult;
    try {
      parsed = JSON.parse(extractJson(text));
    } catch (e) {
      return NextResponse.json(
        { error: "Gemini 응답을 JSON으로 파싱하지 못했습니다.", raw: text },
        { status: 502 }
      );
    }

    const validationError = validateReportResult(parsed, body);
    if (validationError) {
      return NextResponse.json(
        {
          error: `AI 응답에 필요한 내용이 일부 누락되었습니다 (${validationError}). 잠시 후 다시 시도해주세요.`,
          raw: parsed,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ result: parsed });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 502 }
    );
  }
}

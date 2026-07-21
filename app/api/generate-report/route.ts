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

    return NextResponse.json({ result: parsed });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 502 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { buildCouplePrompt } from "@/lib/couplePromptBuilder";
import { CoupleReportRequestBody, CoupleReportResult } from "@/lib/types";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
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
          temperature: 0.5,
          responseMimeType: "application/json",
        },
      }),
    });

    if (geminiRes.ok) {
      return geminiRes;
    }

    lastErrorText = await geminiRes.text();
    const isRetryable = geminiRes.status === 503 || geminiRes.status === 429;
    if (!isRetryable || attempt === MAX_RETRIES) {
      throw new Error(`Gemini API 오류(${geminiRes.status}): ${lastErrorText}`);
    }
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

    const body = (await req.json()) as CoupleReportRequestBody;
    const prompt = buildCouplePrompt(body);

    const geminiRes = await callGeminiWithRetry(apiKey, prompt);

    const data = await geminiRes.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return NextResponse.json(
        { error: "Gemini 응답에서 텍스트를 찾을 수 없습니다.", raw: data },
        { status: 502 }
      );
    }

    let parsed: CoupleReportResult;
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

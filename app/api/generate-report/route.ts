import { NextRequest, NextResponse } from "next/server";
import { buildPrompt } from "@/lib/promptBuilder";
import { ReportRequestBody, ReportResult } from "@/lib/types";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) return fenced[1];
  return raw;
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

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return NextResponse.json(
        { error: `Gemini API 오류: ${errText}` },
        { status: 502 }
      );
    }

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
      { error: err?.message || "알 수 없는 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

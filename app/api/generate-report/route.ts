import { NextRequest, NextResponse } from "next/server";
import { buildPrompt, PromptTarget } from "@/lib/promptBuilder";
import { ReportRequestBody, ReportSection, CounselorSection } from "@/lib/types";

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) return fenced[1];
  return raw;
}

async function generateSection(apiKey: string, body: ReportRequestBody, target: PromptTarget) {
  const prompt = buildPrompt(body, target);

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
    throw new Error(`Gemini API 오류(${target}): ${errText}`);
  }

  const data = await geminiRes.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error(`Gemini 응답(${target})에서 텍스트를 찾을 수 없습니다.`);
  }

  try {
    return JSON.parse(extractJson(text));
  } catch {
    throw new Error(`Gemini 응답(${target})을 JSON으로 파싱하지 못했습니다.`);
  }
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

    // 내담자용 / 상담자용을 한 번의 큰 요청 대신, 두 개의 요청으로 나눠 동시에(병렬로) 생성
    // → 총 대기 시간이 대략 절반으로 줄어듦
    const [client, counselor] = await Promise.all([
      generateSection(apiKey, body, "client") as Promise<ReportSection>,
      generateSection(apiKey, body, "counselor") as Promise<CounselorSection>,
    ]);

    return NextResponse.json({ result: { client, counselor } });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "알 수 없는 오류가 발생했습니다." },
      { status: 502 }
    );
  }
}

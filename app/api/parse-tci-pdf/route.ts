import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { extractClientInfoFromPdfText } from "@/lib/pdfClientInfo";

export const runtime = "nodejs";

// 마음사랑(Maumsarang) TCI-RS 결과지 "TCI-RS 프로파일" 표의 척도 라벨 (이름+약자 그대로)
const LABELS: { key: string; group: "temperament" | "character"; texts: string[] }[] = [
  { key: "NS", group: "temperament", texts: ["자극추구(NS)"] },
  { key: "HA", group: "temperament", texts: ["위험회피(HA)"] },
  { key: "RD", group: "temperament", texts: ["사회적민감성(RD)", "사회적 민감성(RD)"] },
  { key: "P", group: "temperament", texts: ["인내력(PS)", "인내력(P)"] },
  // "자율성+연대감(SC)"을 먼저 찾아야 "자율성(SD)"/"연대감(CO)"과 헷갈리지 않음
  { key: "SC", group: "character", texts: ["자율성+연대감(SC)", "자율성＋연대감(SC)"] },
  { key: "SD", group: "character", texts: ["자율성(SD)"] },
  { key: "CO", group: "character", texts: ["연대감(CO)"] },
  { key: "ST", group: "character", texts: ["자기초월(ST)"] },
];

/**
 * 자릿수 기반 백트래킹: 숫자 뭉치를 (원점수, T점수, 백분위) 3개로 나눈다.
 * T점수는 15~130, 백분위는 0~100 범위라는 현실적 제약으로 후보를 좁힌다.
 */
function splitDigitsIntoThree(blob: string): number[] | null {
  const n = blob.length;
  const widths = [2, 1, 3];
  for (const a of widths) {
    if (a >= n) continue;
    for (const b of widths) {
      const c = n - a - b;
      if (c < 1 || c > 3 || a + b >= n) continue;
      const raw = blob.slice(0, a);
      const t = blob.slice(a, a + b);
      const pct = blob.slice(a + b);
      const rawN = Number(raw), tN = Number(t), pctN = Number(pct);
      if (pctN >= 0 && pctN <= 100 && tN >= 15 && tN <= 130) {
        return [rawN, tN, pctN];
      }
    }
  }
  return null;
}

/**
 * 라벨 뒤에 오는 (원점수, T점수, 백분위) 3개 숫자를 찾는다.
 * 공백/줄바꿈으로 흩어진 경우와, 구분자 없이 붙어버린 경우(뒤에 그래프용
 * 약자 라벨이 그대로 붙는 경우 포함) 둘 다 지원한다.
 */
function extractThreeNumbersAfter(text: string, startIndex: number): number[] | null {
  const window = text.slice(startIndex, startIndex + 60);
  const tokens = window.split(/\s+/).filter(Boolean);
  const nums: number[] = [];

  for (const tok of tokens) {
    if (nums.length >= 3) break;
    const m = tok.match(/^(\d+)(\D.*)?$/);
    if (!m) {
      if (nums.length > 0) break; // 숫자를 얻던 중 비숫자 토큰을 만나면 그 행은 끝난 것
      continue;
    }
    nums.push(Number(m[1]));
    if (m[2] && /[A-Za-z가-힣]/.test(m[2])) {
      // 트레일링에 문자가 섞여있으면(그래프 라벨 등) 이 숫자 뭉치가 실은
      // 3개 값이 전부 붙어있는 것일 수 있으므로 자릿수 기반 재분해 시도
      if (nums.length < 3) {
        const decoded = splitDigitsIntoThree(m[1]);
        if (decoded) return decoded;
      }
      break;
    }
  }

  return nums.length === 3 ? nums : null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "PDF 파일을 업로드해주세요." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await pdfParse(buffer);
    const text: string = data.text || "";

    const temperament: Record<string, number> = {};
    const character: Record<string, number> = {};
    const warnings: string[] = [];

    for (const label of LABELS) {
      let found = false;
      for (const t of label.texts) {
        const idx = text.indexOf(t);
        if (idx === -1) continue;
        const nums = extractThreeNumbersAfter(text, idx + t.length);
        if (nums) {
          if (label.group === "temperament") temperament[label.key] = nums[2];
          else character[label.key] = nums[2];
          found = true;
        }
        break;
      }
      if (!found) warnings.push(`${label.key} 백분위 값을 찾지 못했습니다.`);
    }

    const clientInfo = extractClientInfoFromPdfText(text);

    const hasAnything = Object.keys(temperament).length > 0 || Object.keys(character).length > 0;
    if (!hasAnything) {
      return NextResponse.json(
        {
          error: "PDF에서 TCI 척도 표를 찾지 못했습니다. 형식이 다른 결과지일 수 있어요. 값을 직접 입력해주세요.",
          debugSnippet: text.slice(0, 1500),
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ result: { temperament, character, clientInfo }, warnings });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "PDF 분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { extractClientInfoFromPdfText } from "@/lib/pdfClientInfo";

export const runtime = "nodejs";

// 마음사랑(Maumsarang) TCI-RS 결과지 "TCI-RS 프로파일" 표의 척도 라벨.
// PDF 추출 시 라벨 구성요소 사이에 공백/줄바꿈이 끼어들 수 있어 정규식으로 유연하게 매칭한다.
const LABELS: { key: string; group: "temperament" | "character"; pattern: RegExp }[] = [
  { key: "NS", group: "temperament", pattern: /자극\s*추구\s*\(\s*NS\s*\)/ },
  { key: "HA", group: "temperament", pattern: /위험\s*회피\s*\(\s*HA\s*\)/ },
  { key: "RD", group: "temperament", pattern: /사회적\s*민감성\s*\(\s*RD\s*\)/ },
  { key: "P", group: "temperament", pattern: /인내력\s*\(\s*P[Ss]?\s*\)/ },
  // "자율성+연대감(SC)"의 괄호 안이 "SC"이므로 "자율성(SD)"/"연대감(CO)"과는 절대 헷갈리지 않음
  { key: "SC", group: "character", pattern: /자율성\s*[+＋]\s*연대감\s*\(\s*SC\s*\)/ },
  { key: "SD", group: "character", pattern: /자율성\s*\(\s*SD\s*\)/ },
  { key: "CO", group: "character", pattern: /연대감\s*\(\s*CO\s*\)/ },
  { key: "ST", group: "character", pattern: /자기\s*초월\s*\(\s*ST\s*\)/ },
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
    const digits = m[1];
    const trailing = m[2];

    // 첫 토큰부터 자릿수가 유난히 길면(3개 값이 구분자 없이 다 붙어있을 가능성) 우선 분해 시도
    if (nums.length === 0 && digits.length > 3) {
      const decoded = splitDigitsIntoThree(digits);
      if (decoded) return decoded;
    }

    nums.push(Number(digits));
    if (trailing && /[A-Za-z가-힣]/.test(trailing)) {
      // 트레일링에 문자가 섞여있으면(그래프 라벨 등) 이 숫자 뭉치가 실은
      // 3개 값이 전부 붙어있는 것일 수 있으므로 자릿수 기반 재분해 시도
      if (nums.length < 3) {
        const decoded = splitDigitsIntoThree(digits);
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
      const m = label.pattern.exec(text);
      if (!m) {
        warnings.push(`${label.key} 백분위 값을 찾지 못했습니다.`);
        continue;
      }
      const nums = extractThreeNumbersAfter(text, m.index + m[0].length);
      if (nums) {
        if (label.group === "temperament") temperament[label.key] = nums[2];
        else character[label.key] = nums[2];
      } else {
        warnings.push(`${label.key} 백분위 값을 찾지 못했습니다.`);
      }
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

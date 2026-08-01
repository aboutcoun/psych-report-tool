import { NextRequest, NextResponse } from "next/server";
// pdf-parse의 index.js에는 디버그용 코드가 섞여 있어 서버리스 환경에서 문제가 될 수 있어
// 실제 파싱 로직만 담긴 내부 모듈을 직접 불러옴
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export const runtime = "nodejs";

// 마음사랑(Maumsarang) MMPI-2 결과지 1페이지 요약표의 척도 순서 (고정 순서)
const TABLE1_KEYS = ["VRIN", "TRIN", "F", "FB", "FP", "FBS", "L", "K", "S", "Hs", "D", "Hy", "Pd", "Mf", "Pa", "Pt", "Sc", "Ma", "Si"];
const VALIDITY_ONLY = new Set(["F", "FB", "FP", "FBS", "L", "K", "S"]);
const TABLE2_KEYS = ["RCd", "RC1", "RC2", "RC3", "RC4", "RC6", "RC7", "RC8", "RC9", "AGGR", "PSYC", "DISC", "NEGE", "INTR"];
const PSY5_ONLY = new Set(["AGGR", "PSYC", "DISC", "NEGE", "INTR"]);
const TABLE3_KEYS = ["ANX", "FRS", "OBS", "DEP", "HEA", "BIZ", "ANG", "CYN", "ASP", "TPA", "LSE", "SOD", "FAM", "WRK", "TRT"];
const TABLE4_KEYS = ["A", "R", "Es", "Do", "Re", "Mt", "PK", "MDS", "Ho", "OH", "MACR", "AAS", "APS", "GM", "GF"];

// "전체규준T" 라벨 뒤에 오는 숫자(또는 TRIN처럼 T/F가 붙은) 토큰들을 뽑아냄.
// PDF 추출기에 따라 라벨과 숫자 사이, 숫자와 숫자 사이에 줄바꿈이 끼어들 수 있어
// 줄 단위가 아니라 전체 텍스트를 공백/줄바꿈 기준으로 토큰화한 뒤 순서대로 훑는다.
function findScoreLines(text: string): string[][] {
  const tokens = text.split(/\s+/).filter(Boolean);
  const results: string[][] = [];

  for (let i = 0; i < tokens.length; i++) {
    if (!tokens[i].includes("전체규준T")) continue;

    const nums: string[] = [];
    let j = i + 1;
    while (j < tokens.length && /^\d+[TF]?$/i.test(tokens[j])) {
      nums.push(tokens[j]);
      j++;
    }
    if (nums.length > 0) {
      results.push(nums);
      i = j - 1; // 이미 소비한 토큰은 건너뜀
    }
  }
  return results;
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

    const lines = findScoreLines(text);
    const table1 = lines.find((l) => l.length === TABLE1_KEYS.length);
    const table2 = lines.find((l) => l.length === TABLE2_KEYS.length);
    const len15Matches = lines.filter((l) => l.length === TABLE3_KEYS.length);
    // 내용척도와 보충척도 둘 다 15개 값이라 개수만으론 구분 안 됨 → 문서 내 등장 순서로 구분
    // (마음사랑 결과지 기준: 내용척도표가 보충척도표보다 항상 먼저 나옴)
    const table3 = len15Matches[0];
    const table4 = len15Matches[1];

    const warnings: string[] = [];
    const validity: Record<string, number> = {};
    const clinical: Record<string, number> = {};
    const rc: Record<string, number> = {};
    const psy5: Record<string, number> = {};
    const content: Record<string, number> = {};
    const supplementary: Record<string, number> = {};
    let trin: { value: number; direction: "T" | "F" } | null = null;

    if (table1) {
      TABLE1_KEYS.forEach((key, i) => {
        const raw = table1[i];
        if (key === "TRIN") {
          const m2 = raw.match(/^(\d+)([TF])$/i);
          if (m2) trin = { value: Number(m2[1]), direction: m2[2].toUpperCase() as "T" | "F" };
        } else if (key === "VRIN") {
          validity.VRIN = Number(raw);
        } else if (VALIDITY_ONLY.has(key)) {
          validity[key] = Number(raw);
        } else {
          clinical[key] = Number(raw);
        }
      });
    } else {
      warnings.push("타당도/임상척도 표를 찾지 못했습니다.");
    }

    if (table2) {
      TABLE2_KEYS.forEach((key, i) => {
        const val = Number(table2[i]);
        if (PSY5_ONLY.has(key)) psy5[key] = val;
        else rc[key] = val;
      });
    } else {
      warnings.push("재구성임상척도/PSY-5 표를 찾지 못했습니다.");
    }

    if (table3) {
      TABLE3_KEYS.forEach((key, i) => { content[key] = Number(table3[i]); });
    } else {
      warnings.push("내용척도 표를 찾지 못했습니다.");
    }

    if (table4) {
      TABLE4_KEYS.forEach((key, i) => { supplementary[key] = Number(table4[i]); });
    } else {
      warnings.push("보충척도 표를 찾지 못했습니다.");
    }

    if (!trin) {
      warnings.push("TRIN 값을 자동으로 찾지 못해 기본값(50T)으로 두었습니다. 직접 확인해주세요.");
    }

    const hasAnything = table1 || table2 || table3 || table4;
    if (!hasAnything) {
      return NextResponse.json(
        {
          error: "PDF에서 MMPI-2 척도 표를 찾지 못했습니다. 형식이 다른 결과지일 수 있어요. 값을 직접 입력해주세요.",
          debugSnippet: text.slice(0, 1500),
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      result: { validity, clinical, rc, psy5, content, supplementary, trin },
      warnings,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "PDF 분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}

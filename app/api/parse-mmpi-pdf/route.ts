import { NextRequest, NextResponse } from "next/server";
// pdf-parse의 index.js에는 디버그용 코드가 섞여 있어 서버리스 환경에서 문제가 될 수 있어
// 실제 파싱 로직만 담긴 내부 모듈을 직접 불러옴
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { extractClientInfoFromPdfText } from "@/lib/pdfClientInfo";

export const runtime = "nodejs";

// 마음사랑(Maumsarang) MMPI-2 결과지 1페이지 요약표의 척도 순서 (고정 순서)
const TABLE1_KEYS = ["VRIN", "TRIN", "F", "FB", "FP", "FBS", "L", "K", "S", "Hs", "D", "Hy", "Pd", "Mf", "Pa", "Pt", "Sc", "Ma", "Si"];
const VALIDITY_ONLY = new Set(["F", "FB", "FP", "FBS", "L", "K", "S"]);
const TABLE2_KEYS = ["RCd", "RC1", "RC2", "RC3", "RC4", "RC6", "RC7", "RC8", "RC9", "AGGR", "PSYC", "DISC", "NEGE", "INTR"];
const PSY5_ONLY = new Set(["AGGR", "PSYC", "DISC", "NEGE", "INTR"]);
const TABLE3_KEYS = ["ANX", "FRS", "OBS", "DEP", "HEA", "BIZ", "ANG", "CYN", "ASP", "TPA", "LSE", "SOD", "FAM", "WRK", "TRT"];
const TABLE4_KEYS = ["A", "R", "Es", "Do", "Re", "Mt", "PK", "MDS", "Ho", "OH", "MACR", "AAS", "APS", "GM", "GF"];

/**
 * "전체규준T" 뒤에 오는 값 뭉치를 찾는다.
 * PDF 추출 방식에 따라 두 가지 형태로 나올 수 있음:
 *  1) 공백/줄바꿈으로 구분된 토큰들 ("45 53F 55 ...")
 *  2) 구분자 없이 통째로 붙은 문자열 ("4553F5551...") ← 셀 사이 공백이 아예 사라지는 PDF 추출기에서 흔함
 * 두 형태 모두 "숫자+선택적 T/F 문자" 뭉치 목록(candidates)으로 우선 수집해두고,
 * 이후 자릿수 기반 디코딩으로 정확한 값 개수를 맞춰본다.
 */
function findCandidateBlobs(text: string): string[] {
  const blobs: string[] = [];

  // 형태 2: 라벨 직후 공백 없이 바로 붙은 숫자+문자 뭉치
  const glued = /전체규준\s*T\s*([0-9TFtf]{6,})/g;
  let m: RegExpExecArray | null;
  while ((m = glued.exec(text)) !== null) {
    blobs.push(m[1]);
  }

  // 형태 1: 공백/줄바꿈으로 흩어진 토큰들 → 하나의 문자열로 이어붙여 후보에 추가
  const tokens = text.split(/\s+/).filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    if (!tokens[i].includes("전체규준")) continue;
    // "전체규준", "T" 가 분리된 토큰일 수도 있으므로 다음 몇 개 토큰 중 T로 시작하거나
    // 숫자로 시작하는 지점부터 숫자/문자 토큰을 이어붙인다.
    let j = i + 1;
    // 라벨 자체에 "T"가 없다면(예: "전체규준"만 있고 다음 토큰이 "T") 건너뛴다.
    if (!tokens[i].includes("T") && tokens[j] === "T") j++;
    const collected: string[] = [];
    while (j < tokens.length && /^\d+[TF]?$/i.test(tokens[j])) {
      collected.push(tokens[j]);
      j++;
    }
    if (collected.length > 0) blobs.push(collected.join(""));
  }

  return blobs;
}

/**
 * 자릿수 기반 백트래킹 디코더.
 * blob을 정확히 `count`개의 조각으로 나눈다. 각 조각은 보통 2자리 숫자이지만
 * (T점수가 드물게 한 자리·세 자리인 경우도 있어) 1~3자리를 허용하며,
 * letterIndex로 지정된 위치(TRIN)는 숫자 뒤에 T/F 한 글자가 더 붙을 수 있다.
 * blob 전체를 정확히 소진하면서 count개로 나눠지는 경우만 성공으로 인정한다.
 */
function decodeFixedCount(blob: string, count: number, letterIndex: number | null): string[] | null {
  const n = blob.length;

  // 1) 가장 흔한 경우: 전부 2자리 숫자, 문자(T/F) 없음 → 확정적으로 바로 분해.
  //    (곧바로 백트래킹으로 넘기면 blob 어딘가의 우연한 문자를 letterIndex 자리에
  //     잘못 끼워맞출 위험이 있어, 이 케이스는 반드시 먼저 확정적으로 처리한다)
  if (n === count * 2 && /^\d+$/.test(blob)) {
    const vals: string[] = [];
    for (let i = 0; i < count; i++) vals.push(blob.slice(i * 2, i * 2 + 2));
    return vals;
  }

  // 2) TRIN처럼 특정 슬롯에 방향 문자(T/F)가 붙어 길이가 1 늘어난 경우.
  //    blob 안에서 유일한 문자의 위치가 letterIndex 슬롯 자리와 정확히 일치할 때만 채택
  if (letterIndex !== null && n === count * 2 + 1) {
    const letterMatch = blob.match(/[TF]/i);
    if (letterMatch && letterMatch.index !== undefined) {
      const letterPos = letterMatch.index;
      const expectedLetterPos = letterIndex * 2 + 2; // 그 앞 슬롯들(2자리씩) + 현재 슬롯의 숫자 2자리
      if (letterPos === expectedLetterPos) {
        const before = blob.slice(0, letterPos);
        const letter = blob[letterPos];
        const after = blob.slice(letterPos + 1);
        if (/^\d+$/.test(before) && /^\d+$/.test(after)) {
          const vals: string[] = [];
          let pos = 0;
          for (let i = 0; i < count; i++) {
            if (i === letterIndex) {
              vals.push(blob.slice(pos, pos + 2) + letter.toUpperCase());
              pos += 3;
            } else {
              vals.push(blob.slice(pos, pos + 2));
              pos += 2;
            }
          }
          if (pos === n) return vals;
        }
      }
    }
  }

  // 3) 위 두 확정적 케이스에 해당하지 않는 특수한 경우(드물게 한 자리·세 자리 T점수 등)만
  //    백트래킹으로 보조 시도
  const memo = new Map<string, string[] | null>();

  function helper(pos: number, idx: number): string[] | null {
    if (idx === count) return pos === n ? [] : null;
    const key = `${pos}:${idx}`;
    if (memo.has(key)) return memo.get(key)!;

    const isLetterSlot = idx === letterIndex;
    for (const w of [2, 1, 3]) {
      if (pos + w > n) continue;
      const seg = blob.slice(pos, pos + w);
      if (!/^\d+$/.test(seg)) continue;

      let consumed = w;
      let finalSeg = seg;
      if (isLetterSlot && pos + w < n && /[TF]/i.test(blob[pos + w])) {
        finalSeg = seg + blob[pos + w].toUpperCase();
        consumed = w + 1;
      }

      const rest = helper(pos + consumed, idx + 1);
      if (rest !== null) {
        const result = [finalSeg, ...rest];
        memo.set(key, result);
        return result;
      }
    }
    memo.set(key, null);
    return null;
  }

  return helper(0, 0);
}

function pickTable(
  blobs: string[],
  used: Set<number>,
  count: number,
  letterIndex: number | null
): string[] | null {
  for (let i = 0; i < blobs.length; i++) {
    if (used.has(i)) continue;
    const decoded = decodeFixedCount(blobs[i], count, letterIndex);
    if (decoded) {
      used.add(i);
      return decoded;
    }
  }
  return null;
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

    const blobs = findCandidateBlobs(text);
    const used = new Set<number>();

    const table1 = pickTable(blobs, used, TABLE1_KEYS.length, 1); // TRIN이 index 1
    const table2 = pickTable(blobs, used, TABLE2_KEYS.length, null);
    const table3 = pickTable(blobs, used, TABLE3_KEYS.length, null);
    const table4 = pickTable(blobs, used, TABLE4_KEYS.length, null);

    const warnings: string[] = [];
    const validity: Record<string, number> = {};
    const clinical: Record<string, number> = {};
    const rc: Record<string, number> = {};
    const psy5: Record<string, number> = {};
    const content: Record<string, number> = {};
    const supplementary: Record<string, number> = {};
    let trin: { value: number; direction: "T" | "F" | "" } | null = null;

    if (table1) {
      TABLE1_KEYS.forEach((key, i) => {
        const raw = table1[i];
        if (key === "TRIN") {
          const m2 = raw.match(/^(\d+)([TF])$/i);
          if (m2) {
            trin = { value: Number(m2[1]), direction: m2[2].toUpperCase() as "T" | "F" };
          } else if (/^\d+$/.test(raw)) {
            // 방향 문자(T/F) 표시가 없는 경우 — 값만 있는 그대로 인식하고 방향은 비워둔다
            trin = { value: Number(raw), direction: "" };
          }
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
    const resolvedTrin = trin as { value: number; direction: "T" | "F" | "" } | null;

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

    if (!resolvedTrin) {
      warnings.push("TRIN 값을 자동으로 찾지 못했습니다. 직접 입력해주세요.");
    } else if (resolvedTrin.direction === "") {
      warnings.push(`TRIN 값(${resolvedTrin.value})에는 방향(T/F) 표시가 없어 숫자만 입력했습니다.`);
    }

    const clientInfo = extractClientInfoFromPdfText(text);

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
      result: { validity, clinical, rc, psy5, content, supplementary, trin: resolvedTrin, clientInfo },
      warnings,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "PDF 분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}

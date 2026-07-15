import { ReportRequestBody } from "./types";
import { SCT_ITEMS, SCT_DOMAINS } from "./scales";

function formatScores(scores: Record<string, number>): string {
  return Object.entries(scores)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
}

function formatTrin(trin: ReportRequestBody["mmpi"]["trin"]): string {
  const dirNote =
    trin.direction === "T"
      ? "T방향(모든 문항에 '그렇다'로 응답하는 경향의 고정반응)"
      : "F방향(모든 문항에 '아니다'로 응답하는 경향의 고정반응)";
  return `TRIN=${trin.value} ${dirNote}`;
}

function formatSctByDomain(sct: ReportRequestBody["sct"]): string {
  if (!sct.enabled) return "(SCT 미실시)";
  const blocks: string[] = [];
  SCT_DOMAINS.forEach((domain) => {
    const lines: string[] = [];
    domain.items.forEach((num) => {
      const resp = sct.responses[num];
      const stem = SCT_ITEMS[num - 1];
      if (resp && resp.trim().length > 0) {
        lines.push(`  ${num}. ${stem} → ${resp.trim()}`);
      }
    });
    if (lines.length > 0) {
      blocks.push(`[${domain.label}]\n${lines.join("\n")}`);
    }
  });
  if (blocks.length === 0) return "(SCT 응답 없음)";
  return blocks.join("\n\n");
}

function maturityBranch(sc: number): string {
  if (sc >= 70) {
    return `SC(자율성+연대감)=${sc}로 성격 성숙도가 "성숙" 수준입니다. 이 경우 다음 전략을 따르십시오.
- TCI에서 드러나는 타고난 기질적 특성(예: 위험회피가 높거나 자극추구가 높은 것 등)을 설명하되, 이 기질을 스스로 잘 조절해서 삶에 적응적으로 활용하고 있을 가능성에 무게를 두어 서술하십시오.
- (MMPI를 함께 실시한 경우) MMPI에서 나타나는 심리적 고통이나 증상은 성격적으로 뿌리깊은 문제라기보다, 최근 스트레스나 상황에 의한 일시적인 어려움일 가능성이 높고 회복 가능성이 좋다는 점을 분명히 포함하십시오.`;
  }
  if (sc <= 30) {
    return `SC(자율성+연대감)=${sc}로 성격 성숙도가 "미성숙" 수준입니다. 이 경우 다음 전략을 따르십시오.
- TCI에서 드러나는 타고난 기질적 특성을 설명하되, 이 기질이 스스로 잘 조절되지 못하고 부적응적인 방식으로 드러나고 있을 가능성에 무게를 두어 서술하십시오.
- (MMPI를 함께 실시한 경우) MMPI에서 나타나는 심리적 고통이나 증상은 일시적인 것이라기보다, 오래 지속되어 온 만성적인 어려움이거나 성격적인 취약성에서 비롯되었을 가능성에 무게를 두어 서술하십시오.`;
  }
  return `SC(자율성+연대감)=${sc}로 성격 성숙도가 "중간" 수준입니다. 이 경우 위 두 관점(성숙/미성숙) 중 어느 한쪽으로 단정하지 말고, 두 가능성을 균형있게 담아 중간 정도의 어조로 서술하십시오.`;
}

export function buildPrompt(body: ReportRequestBody): string {
  const { client, mmpi, tci, sct } = body;
  const sc = tci.character["SC"] ?? 50;

  const testsAdministered: string[] = [];
  if (mmpi.enabled) testsAdministered.push("MMPI-2");
  if (tci.enabled) testsAdministered.push("TCI");
  if (sct.enabled) testsAdministered.push("SCT");

  const dataBlocks: string[] = [];
  if (mmpi.enabled) {
    dataBlocks.push(`## MMPI-2 결과 (T점수, 평균 50 / 표준편차 10)
- 기타 타당도척도: ${formatScores(mmpi.validity)}
- ${formatTrin(mmpi.trin)}
- 임상척도: ${formatScores(mmpi.clinical)}
- 재구성임상척도(RC): ${formatScores(mmpi.rc)}
- 성격병리5요인(PSY-5): ${formatScores(mmpi.psy5)}
- 내용척도: ${formatScores(mmpi.content)}
- 보충척도: ${formatScores(mmpi.supplementary)}`);
  }
  if (tci.enabled) {
    dataBlocks.push(`## TCI 결과 (백분위점수, 50=평균)
- 기질척도: ${formatScores(tci.temperament)}
- 성격척도: ${formatScores(tci.character)}`);
  }
  dataBlocks.push(`## SCT (문장완성검사) 응답 (영역별로 그룹핑됨)\n${formatSctByDomain(sct)}`);

  const instructionBlocks: string[] = [];
  let stepNum = 1;

  if (mmpi.enabled) {
    instructionBlocks.push(`**${stepNum++}) 타당도 판정 (가장 먼저 수행)**
MMPI-2 타당도척도를 검토하여 프로파일 신뢰도(과장응답, 축소응답, 무선/고정반응 여부)를 판정하십시오. TRIN은 방향성이 중요합니다 — T방향으로 높으면 무분별하게 "그렇다"로 반응하는 경향을, F방향으로 높으면 무분별하게 "아니다"로 반응하는 경향을 의미하므로 각 방향에 맞게 해석하십시오. 만약 무효 프로파일이 시사된다면, 이후의 모든 해석은 신뢰하기 어렵다는 점을 반드시 명시하고, 나머지 해석은 조심스러운 어조로 최소화하십시오.`);
  }

  if (tci.enabled) {
    instructionBlocks.push(`**${stepNum++}) 성격적 성숙도 판정 (TCI SC 점수 기준)**\n${maturityBranch(sc)}`);
  }

  if (mmpi.enabled) {
    instructionBlocks.push(`**${stepNum++}) 핵심 가설 수립 및 검증**
MMPI 임상척도와 재구성임상척도(RC)를 근거로 핵심 가설(내담자가 겪고 있을 것으로 보이는 심리적 어려움의 핵심 주제)을 수립하십시오. 이 가설을, 내용척도·보충척도${tci.enabled ? "·TCI 결과" : ""}·SCT 응답을 참고하여 뒷받침되는지 검토하십시오. 여러 자료로 뒷받침되지 않거나 근거가 약한 가설은 보고서에 포함하지 말거나, 조심스러운 표현으로 제한적으로 제시하십시오.`);
  }

  instructionBlocks.push(`**${stepNum++}) "client" 버전 작성 원칙**
- 문장 뒤에 "(D척도 71점으로 보아)"처럼 검사 결과 수치나 척도명을 근거로 붙이는 방식은 쓰지 마십시오. 척도명, T점수, 백분위 등 검사 용어를 노출하지 말고 의미만 풀어서 자연스러운 문장으로 전달하십시오.
- 전문용어나 어려운 개념어를 쓰지 말고 중학생도 이해할 수 있는 쉬운 일상적 표현을 사용하십시오.
- 따뜻하고 공감적이되 근거 없이 단정하지 않는 어조를 유지하십시오.
- 풍성하고 구체적으로 서술하십시오. 추상적인 문장 하나로 끝내지 말고, 그 특성이 일상에서 어떻게 드러날 수 있는지 구체적인 예시나 장면을 들어 설명하십시오.
- 종합 소견에서는 상담을 받는다면 어떤 도움을 받을 수 있을지 다양한 방식으로 폭넓게 제시하고, 특정 상담 기법(예: 인지행동치료) 하나만 반복해서 언급하지 마십시오.`);

  instructionBlocks.push(`**${stepNum++}) "counselor" 버전 작성 원칙**
- client 버전과 달리, 실제 척도명과 점수${mmpi.enabled ? ", 2-point code, RC/PSY-5/내용척도/보충척도 상승 패턴" : ""}을 구체적으로 인용하며 전문적으로 서술하십시오.
- 임상적 가설과 그 근거, 감별이 필요한 지점, 추가로 확인하면 좋을 부분을 포함하십시오.
- client 버전보다도 더 상세하고 근거 중심적으로 작성하십시오.
- "counselor_notes"는 상담자가 실제 상담 장면에서 바로 참고할 수 있도록, 하나의 긴 문단이 아니라 **5~7개의 개별 포인트로 나누어 개조식으로** 작성하십시오. 각 포인트는 {"title": 짧은 소제목, "detail": 그 포인트에 대한 풍성하고 구체적인 설명(실제 개입 방법이나 접근 방식, 필요하면 구체적 문구 예시 포함, 3~5문장)} 형태입니다. 다뤄야 할 주제 예시: 라포 형성 시 유의점, 예상되는 저항/방어 패턴, 상담 초기 우선순위, 중기 상담 전략, 치료적 관계에서 주의할 점, (SCT를 실시한 경우) 위험 신호 유무와 대응. 각 포인트의 detail은 짧게 요약만 하지 말고 실제 상담 계획에 바로 쓸 수 있을 만큼 구체적으로 풀어서 작성하십시오.`);

  if (sct.enabled) {
    instructionBlocks.push(`**${stepNum++}) SCT 영역별 해석 (counselor 버전에만 해당)**
위에 영역별로 그룹핑된 SCT 응답을 검토하여, 각 영역별로 짧은 해석을 작성하십시오("sct_domain_notes"). 단, **모든 영역에 억지로 해석을 만들어내지 마십시오** — 그 영역의 응답에서 실제로 눈에 띄는 태도, 감정, 패턴이 발견될 때만 해당 영역을 포함하고, 특별히 주목할 점이 없거나 응답이 형식적/무난한 영역은 아예 결과에서 제외하십시오. 포함하는 경우 각 해석은 2~3문장으로 간결하게, 그 영역의 구체적인 응답 내용을 근거로 작성하십시오. client 버전에는 이 항목이 없습니다.`);
  }

  if (!mmpi.enabled) {
    instructionBlocks.push(`**참고** MMPI-2는 실시하지 않았습니다. validity_summary와 symptom_summary 관련 내용은 만들어내지 말고, 이 두 항목 자체를 출력 JSON에서 제외하십시오.`);
  }
  if (!tci.enabled) {
    instructionBlocks.push(`**참고** TCI는 실시하지 않았습니다. maturity_summary와 temperament_character_summary 관련 내용은 만들어내지 말고, 이 두 항목 자체를 출력 JSON에서 제외하십시오. 성격 성숙도에 대한 언급도 하지 마십시오.`);
  }

  const partLines: string[] = [];
  if (tci.enabled) partLines.push("- 성격적 성숙도: TCI SC 기준 판정 결과");
  if (tci.enabled) partLines.push("- 기질/성격적 특성: TCI 결과 기반 타고난 기질과 성격");
  if (mmpi.enabled) partLines.push("- 증상/심리적 고통: MMPI 기반 심리적 어려움" + (tci.enabled ? ", 성격적 성숙도 판정과 연결지어 설명" : ""));
  partLines.push("- 종합 소견: 실시한 검사들을 아우르는 종합적 이해와 상담 방향 제안 (client 버전은 다양한 도움 방식을 폭넓게 제시하고 특정 기법 하나만 반복하지 말 것)");

  const clientFields: string[] = [];
  const counselorFields: string[] = [];
  if (mmpi.enabled) {
    clientFields.push(`"validity_summary": "타당도 판정 결과, 쉬운 말로 (220자 내외, 무효 프로파일이면 그 사실을 분명히 명시)"`);
    counselorFields.push(`"validity_summary": "타당도척도 수치 및 판정 근거 (300자 내외)"`);
  }
  if (tci.enabled) {
    clientFields.push(`"maturity_summary": "성격적 성숙도 (500자 내외)"`);
    clientFields.push(`"temperament_character_summary": "기질/성격적 특성 (600자 내외)"`);
    counselorFields.push(`"maturity_summary": "성격적 성숙도의 임상적 근거와 함의 (550자 내외)"`);
    counselorFields.push(`"temperament_character_summary": "TCI 기반 기질/성격 분석 (650자 내외)"`);
  }
  if (mmpi.enabled) {
    clientFields.push(`"symptom_summary": "증상/심리적 고통 (650자 내외)"`);
    counselorFields.push(`"symptom_summary": "핵심가설-검증 구조에 따른 증상 분석 (750자 내외)"`);
  }
  clientFields.push(`"integration_recommendations": "종합 소견 (600자 내외)"`);
  counselorFields.push(`"integration_recommendations": "통합 해석 및 감별 포인트 (650자 내외)"`);
  counselorFields.push(`"counselor_notes": [{"title": "포인트 소제목", "detail": "상세 설명 (150자 내외)"}, "... 총 5~7개"]`);
  if (sct.enabled) {
    counselorFields.push(`"sct_domain_notes": [{"domain": "영역명 (가족/아버지/어머니/남자/여자/성, 이성, 결혼/과거/미래/대인관계/권위자/자아상/두려움/기타 중 실제 특이사항이 있는 것만)", "note": "그 영역에 대한 간결한 해석 (2~3문장)"}, "... 특이사항이 있는 영역만 포함, 없으면 빈 배열"]`);
  }

  return `당신은 15년 이상의 임상 경험을 가진 임상심리전문가입니다. 아래 심리검사 결과(실시한 검사: ${testsAdministered.join(", ")})를 통합 분석하여 두 가지 버전의 보고서를 동시에 작성하십시오.

- "client" 버전: 내담자 본인이 읽고 스스로를 이해하도록 돕는 버전
- "counselor" 버전: 담당 상담자가 상담 계획을 세우는 데 참고하는 전문가용 버전

## 내담자 정보
이름: ${client.name || "(비공개)"} / 성별: ${client.gender || "미상"} / 연령: 만 ${client.age || "미상"}세 / 검사일: ${client.testDate || "미상"}

${dataBlocks.join("\n\n")}

## 해석 지침

${instructionBlocks.join("\n\n")}

## 보고서 구성
${partLines.join("\n")}

## 출력 형식
다른 설명이나 마크다운 없이, 아래 JSON 스키마와 정확히 동일한 키 구조를 가진 순수 JSON 객체만 반환하십시오. 실시하지 않은 검사와 관련된 키는 절대 포함하지 마십시오.

{
  "client": {
    ${clientFields.join(",\n    ")}
  },
  "counselor": {
    ${counselorFields.join(",\n    ")}
  }
}`;
}

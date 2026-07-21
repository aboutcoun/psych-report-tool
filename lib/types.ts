export type ScoreMap = Record<string, number>;

export interface ClientInfo {
  name: string;
  gender: "남" | "여" | "";
  age: string;
}

export interface TrinInput {
  value: number;       // 0~100 사이 T점수 절대값
  direction: "T" | "F"; // T방향(그렇다 방향 고정반응) / F방향(아니다 방향 고정반응)
}

export interface MmpiInput {
  enabled: boolean;
  validity: ScoreMap;  // TRIN 제외 나머지 타당도척도
  trin: TrinInput;
  clinical: ScoreMap;
  rc: ScoreMap;
  psy5: ScoreMap;
  content: ScoreMap;
  supplementary: ScoreMap;
}

export interface TciInput {
  enabled: boolean;
  temperament: ScoreMap;
  character: ScoreMap;
}

export interface SctInput {
  enabled: boolean;
  responses: Record<number, string>; // 1-indexed item number -> 응답
}

export interface ReportRequestBody {
  client: ClientInfo;
  mmpi: MmpiInput;
  tci: TciInput;
  sct: SctInput;
}

// 내담자가 공개 링크(/sct)에서 직접 제출하는 SCT 응답 레코드
export interface SctSubmission {
  name: string;
  gender: "남" | "여" | "";
  age: string;
  phone4: string;
  responses: Record<number, string>;
  submittedAt: string;
}

// 하나의 관점(내담자용 또는 상담자용)에 대한 4파트 해석 섹션
// 실시하지 않은 검사와 관련된 필드는 생략될 수 있음
export interface ReportSection {
  validity_summary?: string;             // MMPI 실시 시에만
  maturity_summary?: string;             // TCI 실시 시에만 (Part. 성격적 성숙도)
  temperament_character_summary?: string; // TCI 실시 시에만 (Part. 기질/성격적 특성)
  symptom_summary?: string;              // MMPI 실시 시에만 (Part. 증상/심리적 고통)
  integration_recommendations: string;    // 항상 포함 (통합 해석 및 제언)
}

export interface CounselorPoint {
  title: string;  // 포인트 소제목 (예: "라포 형성 시 유의점")
  detail: string; // 그 포인트에 대한 풍성한 설명
}

export interface SctDomainNote {
  domain: string; // 예: "가족", "아버지" 등 (SCT_DOMAINS의 label과 일치)
  note: string;   // 해당 영역에 대한 간단한 해석
}

export interface CounselorSection extends ReportSection {
  counselor_notes: CounselorPoint[]; // 상담 전략, 라포 형성, 예상 저항 등을 개조식 포인트로 정리
  sct_domain_notes?: SctDomainNote[]; // SCT를 영역별로 분석한 결과 (특이사항이 있는 영역만 포함)
}

export interface ReportResult {
  client: ReportSection;
  counselor: CounselorSection;
}

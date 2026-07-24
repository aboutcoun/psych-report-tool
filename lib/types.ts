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
  integration_recommendations: string;    // 항상 포함 (종합 소견)
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

// ── 커플/부부 TCI 검사 ──────────────────────────────────────────
export interface CouplePerson {
  name: string;
  gender: "남" | "여" | "";
  temperament: ScoreMap; // NS, HA, RD, P
  character: ScoreMap;   // SD, CO, ST
}

export interface CoupleReportRequestBody {
  person1: CouplePerson;
  person2: CouplePerson;
}

export interface CoupleConflictScenario {
  title: string;
  story: string;
}

export interface CouplePrescription {
  forName: string;
  title: string;
  detail: string;
}

export interface CoupleReportResult {
  person1_animal: string;         // 예: "안전한 숲을 좋아하는 다정다감한 사슴"
  person2_animal: string;
  person1_summary: string;        // 기질(타고난 본성)+성격(가꿔온 내면) 요약, 동물 비유 녹여서
  person2_summary: string;
  person1_strength: string;       // 하위척도 심층분석 - 강점
  person1_weakness: string;       // 하위척도 심층분석 - 약점 및 특이지표
  person2_strength: string;
  person2_weakness: string;
  person1_animal_desc: string;    // 동물 유형 정의 설명문
  person2_animal_desc: string;
  temperament_analysis: string;   // 기질 차원 비교 분석 (척도별)
  character_analysis: string;     // 성격 차원 비교 분석 (척도별)
  conflict_scenarios: CoupleConflictScenario[];
  prescriptions: CouplePrescription[];
  strengths: string;              // 관계의 강점
  cautions: string;                // 주의가 필요한 영역
  action_items: string[];          // 구체적 실천 제언
  counselor_comment: string;       // 상담자 코멘트
}

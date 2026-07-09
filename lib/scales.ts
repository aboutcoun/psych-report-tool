// ── MMPI-2 척도 정의 (T점수 입력, 기본값 50) ─────────────────────────
export type ScaleDef = { key: string; label: string };

export const MMPI_VALIDITY: ScaleDef[] = [
  { key: "VRIN", label: "VRIN" },
  // TRIN은 방향성(T/F)이 있어 별도 입력으로 처리
  { key: "F", label: "F" },
  { key: "FB", label: "F(B)" },
  { key: "FP", label: "F(P)" },
  { key: "FBS", label: "FBS" },
  { key: "L", label: "L" },
  { key: "K", label: "K" },
  { key: "S", label: "S" },
];

export const MMPI_CLINICAL: ScaleDef[] = [
  { key: "Hs", label: "Hs" },
  { key: "D", label: "D" },
  { key: "Hy", label: "Hy" },
  { key: "Pd", label: "Pd" },
  { key: "Mf", label: "Mf" },
  { key: "Pa", label: "Pa" },
  { key: "Pt", label: "Pt" },
  { key: "Sc", label: "Sc" },
  { key: "Ma", label: "Ma" },
  { key: "Si", label: "Si" },
];

export const MMPI_RC: ScaleDef[] = [
  { key: "RCd", label: "RCd" },
  { key: "RC1", label: "RC1" },
  { key: "RC2", label: "RC2" },
  { key: "RC3", label: "RC3" },
  { key: "RC4", label: "RC4" },
  { key: "RC6", label: "RC6" },
  { key: "RC7", label: "RC7" },
  { key: "RC8", label: "RC8" },
  { key: "RC9", label: "RC9" },
];

export const MMPI_PSY5: ScaleDef[] = [
  { key: "AGGR", label: "AGGR" },
  { key: "PSYC", label: "PSYC" },
  { key: "DISC", label: "DISC" },
  { key: "NEGE", label: "NEGE" },
  { key: "INTR", label: "INTR" },
];

export const MMPI_CONTENT: ScaleDef[] = [
  { key: "ANX", label: "ANX" },
  { key: "FRS", label: "FRS" },
  { key: "OBS", label: "OBS" },
  { key: "DEP", label: "DEP" },
  { key: "HEA", label: "HEA" },
  { key: "BIZ", label: "BIZ" },
  { key: "ANG", label: "ANG" },
  { key: "CYN", label: "CYN" },
  { key: "ASP", label: "ASP" },
  { key: "TPA", label: "TPA" },
  { key: "LSE", label: "LSE" },
  { key: "SOD", label: "SOD" },
  { key: "FAM", label: "FAM" },
  { key: "WRK", label: "WRK" },
  { key: "TRT", label: "TRT" },
];

export const MMPI_SUPPLEMENTARY: ScaleDef[] = [
  { key: "A", label: "A" },
  { key: "R", label: "R" },
  { key: "Es", label: "Es" },
  { key: "Do", label: "Do" },
  { key: "Re", label: "Re" },
  { key: "Mt", label: "Mt" },
  { key: "PK", label: "PK" },
  { key: "MDS", label: "MDS" },
  { key: "Ho", label: "Ho" },
  { key: "OH", label: "O-H" },
  { key: "MACR", label: "MAC-R" },
  { key: "AAS", label: "AAS" },
  { key: "APS", label: "APS" },
  { key: "GM", label: "GM" },
  { key: "GF", label: "GF" },
];

// ── TCI 척도 정의 (백분위점수 입력, 기본값 50) ─────────────────────
export const TCI_TEMPERAMENT: ScaleDef[] = [
  { key: "NS", label: "NS (자극추구)" },
  { key: "HA", label: "HA (위험회피)" },
  { key: "RD", label: "RD (사회적 민감성)" },
  { key: "P", label: "P (인내력)" },
];

export const TCI_CHARACTER: ScaleDef[] = [
  { key: "SD", label: "SD (자율성)" },
  { key: "CO", label: "CO (연대감)" },
  { key: "ST", label: "ST (자기초월)" },
  { key: "SC", label: "SC (자율성+연대감)" },
];

// 그래프에 척도 약자 대신 표기할 한글 전체 명칭
export const TCI_TEMPERAMENT_KO: Record<string, string> = {
  NS: "자극추구",
  HA: "위험회피",
  RD: "사회적 민감성",
  P: "인내력",
};

export const TCI_CHARACTER_KO: Record<string, string> = {
  SD: "자율성",
  CO: "연대감",
  ST: "자기초월",
  SC: "자율성+연대감",
};

// ── SCT (문장완성검사, 일반용 50문항) ────────────────────────────────
export const SCT_ITEMS: string[] = [
  "나에게 이상한 일이 생겼을 때",
  "내 생각에 가끔 아버지는",
  "우리 윗사람은",
  "나의 장래는",
  "어리석게도 내가 두려워하는 것은",
  "내 생각에 참다운 친구는",
  "내가 어렸을 때는",
  "남자에 대해서 무엇보다 좋지 않게 생각하는 것은",
  "내가 바라는 여인상은",
  "남녀가 같이 있는 것을 볼 때",
  "내가 늘 원하기는",
  "다른 가정과 비교해서 우리 집안은",
  "나의 어머니는",
  "무슨 일을 해서라도 잊고 싶은 것은",
  "내가 믿고 있는 내 능력은",
  "내가 정말 행복할 수 있으려면",
  "어렸을 때 잘못했다고 느끼는 것은",
  "내가 보는 나의 앞날은",
  "대개 아버지들이란",
  "내 생각에 남자들이란",
  "다른 친구들이 모르는 나만의 두려움은",
  "내가 싫어하는 사람은",
  "결혼 생활에 대한 나의 생각은",
  "우리 가족이 나에 대해서",
  "내 생각에 여자들이란",
  "어머니와 나는",
  "내가 저지른 가장 큰 잘못은",
  "언젠가 나는",
  "내가 바라기에 아버지는",
  "나의 야망은",
  "윗사람이 오는 것을 보면 나는",
  "내가 제일 좋아하는 사람은",
  "내가 다시 젊어진다면",
  "나의 가장 큰 결점은",
  "내가 아는 대부분의 집안은",
  "완전한 남성상은",
  "내가 성교를 했다면",
  "행운이 나를 외면했을 때",
  "대개 어머니들이란",
  "내가 잊고 싶은 두려움은",
  "나의 평생 가장 하고 싶은 일은",
  "내가 늙으면",
  "때때로 두려운 생각에 내가 휩싸일 때",
  "내가 없을 때 친구들은",
  "생생한 어린 시절의 기억은",
  "무엇보다도 좋지 않게 여기는 것은",
  "나의 성생활은",
  "내가 어렸을 때 우리 가족은",
  "나는 어머니를 좋아했지만",
  "아버지와 나는",
];

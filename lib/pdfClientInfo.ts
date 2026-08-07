// MMPI-2/TCI 결과지 PDF의 "DATA SUMMARY" 영역에서 이름/성별/연령을 뽑아내는 공용 유틸.
// 두 검사 결과지 모두 마음사랑(Maumsarang) 소프트웨어 양식이라 형식이 유사하지만,
// 연령 표기가 "나이 : 30" / "연령 : 만 27 세"처럼 검사마다 조금씩 달라 둘 다 지원한다.
export interface ExtractedClientInfo {
  name?: string;
  gender?: "남" | "여";
  age?: string;
}

export function extractClientInfoFromPdfText(text: string): ExtractedClientInfo {
  const info: ExtractedClientInfo = {};

  const nameMatch = text.match(/이름\s*[:：]\s*([^\s·:：]+)/);
  if (nameMatch) info.name = nameMatch[1].trim();

  const genderMatch = text.match(/성별\s*[:：]\s*(남자|여자|남|여)/);
  if (genderMatch) info.gender = genderMatch[1].startsWith("남") ? "남" : "여";

  const ageMatch =
    text.match(/연령\s*[:：]\s*만?\s*(\d{1,3})\s*세/) ||
    text.match(/나이\s*[:：]\s*(\d{1,3})/);
  if (ageMatch) info.age = ageMatch[1];

  return info;
}

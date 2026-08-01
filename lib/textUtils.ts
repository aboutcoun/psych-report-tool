// Gemini가 간혹 마크다운 문법(**굵게**, *기울임*, # 제목 등)을 텍스트에 섞어 보낼 때가 있어,
// 화면에 그대로 노출되지 않도록 렌더링 직전에 제거해주는 안전장치.
export function stripMarkdown(text: string | undefined | null): string {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/`/g, "")
    .trim();
}

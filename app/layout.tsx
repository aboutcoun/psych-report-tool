import "./globals.css";

export const metadata = {
  title: "심리검사 통합 해석 보고서",
  description: "MMPI-2 · TCI · SCT 통합 분석 도구",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

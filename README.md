# 심리검사 통합 해석 보고서 생성 도구

MMPI-2 · TCI · SCT 결과를 입력하면 Gemini API로 3개 검사를 통합 분석해
2~3장 분량의 HTML 보고서(인쇄/PDF 저장 가능)를 생성합니다.

## 1. 로컬 실행

```bash
npm install
cp .env.example .env.local   # GEMINI_API_KEY 값 채워넣기
npm run dev
```

http://localhost:3000 접속

## 2. Gemini API 키 발급

https://aistudio.google.com/apikey 에서 발급 후 `.env.local`의 `GEMINI_API_KEY`에 입력.

## 2-1. (SCT 온라인 응답 기능을 쓰려면) Upstash Redis 설정

내담자가 `/sct` 링크에서 직접 SCT에 응답하고, 상담자가 이름+연락처 뒷4자리로 조회해서
불러오는 기능은 별도의 데이터 저장소(Redis)가 필요합니다.

1. https://upstash.com 무료 가입 (또는 Vercel 대시보드 → Storage → Marketplace → Upstash 연동)
2. Redis 데이터베이스 하나 생성
3. 생성된 데이터베이스의 **REST URL**과 **REST TOKEN**을 복사
4. `.env.local`에 추가:
   ```
   UPSTASH_REDIS_REST_URL=여기에_URL
   UPSTASH_REDIS_REST_TOKEN=여기에_TOKEN
   ```
5. Vercel에 배포할 때도 Vercel 프로젝트 Settings → Environment Variables에 동일하게 추가

이 기능을 쓰지 않으면 이 단계는 건너뛰어도 되고, 나머지 기능(보고서 생성)은 정상 동작합니다.
저장된 응답은 **90일 후 자동 삭제**됩니다 (`lib/kv.ts`의 `SCT_RECORD_TTL_SECONDS`에서 조정 가능).

## 3. Vercel 배포

1. GitHub 레포에 push
2. Vercel에서 Import Project
3. Vercel 프로젝트 Settings → Environment Variables 에 `GEMINI_API_KEY` 추가
4. Deploy

## 4. Imweb iframe 임베드

배포된 URL(`https://your-app.vercel.app`)을 Imweb HTML 위젯에서:

```html
<iframe
  src="https://your-app.vercel.app"
  style="width:100%; height: 1400px; border: none;"
></iframe>
```

높이는 실제 콘텐츠 길이에 맞춰 조정하세요. (내부 페이지 스크롤이 생기면 height를 늘리면 됩니다)

## 5. 커스터마이징 포인트

- `lib/scales.ts` : MMPI-2 / TCI 척도 목록, SCT 50문항 — 척도 추가/삭제는 여기서
- `lib/promptBuilder.ts` : Gemini에게 보내는 해석 지침 프롬프트 — 해석 톤/분량/로직 수정은 여기서
- `app/api/generate-report/route.ts` : Gemini 모델명(`GEMINI_MODEL`), temperature 등 API 호출 설정
- `components/ReportView.tsx` : 보고서 페이지 구성 (현재 3페이지: ①타당도+임상 ②RC/PSY5/내용/보충+TCI ③SCT+종합소견)
- `app/globals.css` : 색상/타이포그래피 (`--accent` 등 CSS 변수로 관리)

## 6. 주의사항

- Gemini 응답은 JSON 강제(`responseMimeType: application/json`)이지만, 만에 하나 파싱 실패 시
  API가 원본 텍스트(`raw`)를 함께 반환하니 서버 로그로 확인 가능합니다.
- 보고서 하단에 "AI 생성 초안이며 전문가 검토 필요" 문구가 고정으로 들어갑니다 (`ReportView.tsx` 하단).
- 내담자 개인정보(이름 등)는 클라이언트→서버(Gemini API) 요청 바디에 그대로 포함되어 전송되니,
  민감한 실명 대신 이니셜/코드명 입력을 권장합니다.

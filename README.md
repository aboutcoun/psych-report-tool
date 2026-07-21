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

## 2-2. 상담자 화면 비밀번호 보호 (강력 추천)

`/sct`(내담자 응답 페이지)는 링크를 아는 누구나 접속해야 하지만, 그 외 나머지 페이지
(루트 페이지 = 보고서 생성 화면, 보고서 생성 API 등)는 상담자만 접근해야 합니다.
내담자가 링크에서 `/sct` 부분만 지우고 루트 주소로 들어오는 것을 막기 위해,
`/sct`와 그 제출 API만 빼고 나머지 전체에 브라우저 기본 인증(비밀번호 창)을 걸어뒀습니다.

1. `.env.local`에 추가:
   ```
   BASIC_AUTH_USER=admin
   BASIC_AUTH_PASSWORD=원하는_비밀번호
   ```
2. Vercel 배포 시에도 Settings → Environment Variables에 동일하게 추가
3. 이 두 값을 설정하지 않으면 보호 기능이 꺼진 채로(로컬 개발 편의를 위해) 동작하니,
   실제 서비스에 배포할 때는 반드시 설정해주세요.
4. 설정 후 루트 주소로 접속하면 브라우저가 자체적으로 아이디/비밀번호 입력창을 띄웁니다.
   내담자에게 보내는 `/sct` 링크는 이 인증 없이 그대로 접속됩니다.

## 2-3. SCT 링크 이메일 발송 기능 설정

`/send-invite` 페이지(상담자용, 비밀번호 보호 적용됨)에서 이름+이메일을 입력하면
`/sct` 응답 링크를 이메일로 보내주는 기능입니다. [Resend](https://resend.com)를 사용합니다.

1. https://resend.com 무료 가입 (월 3,000통까지 무료)
2. API Key 발급 (Dashboard → API Keys → Create)
3. 발신 도메인 인증: Dashboard → Domains에서 `aboutcounsel.com` 추가하고 안내에 따라
   DNS 레코드(도메인 관리 페이지)에 등록 → 인증되면 `send@aboutcounsel.com`처럼
   실제 센터 도메인으로 발송 가능 (인증 전에는 Resend 제공 테스트 주소로만 발송 가능)
4. `.env.local`에 추가:
   ```
   RESEND_API_KEY=여기에_API_키
   RESEND_FROM_EMAIL=About심리상담센터 <send@aboutcounsel.com>
   ```
5. Vercel에도 동일하게 환경변수 추가 후 재배포

이메일에는 `/sct?name=이름` 형태의 링크가 담기고, 내담자가 그 링크로 들어가면
이름 칸이 자동으로 채워진 채로 응답 화면이 뜹니다 (성별/연령/연락처는 직접 입력).

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

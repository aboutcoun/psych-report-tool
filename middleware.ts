import { NextRequest, NextResponse } from "next/server";

// 내담자가 실수로 /sct 를 지우고 상담자용 도구(루트 페이지, 보고서 생성 API 등)로
// 들어오는 것을 막기 위해, /sct(응답 페이지)와 그 제출 API만 빼고
// 나머지 전체 경로에 기본 인증(브라우저 로그인 창)을 겁니다.
const PUBLIC_PATHS = ["/sct", "/api/sct-submit"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASSWORD;

  // 인증 정보를 아직 설정하지 않았다면(로컬 개발 등) 보호 없이 통과시킴
  if (!user || !pass) {
    return NextResponse.next();
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Basic ")) {
    const decoded = atob(authHeader.slice(6));
    const separatorIndex = decoded.indexOf(":");
    const suppliedUser = decoded.slice(0, separatorIndex);
    const suppliedPass = decoded.slice(separatorIndex + 1);
    if (suppliedUser === user && suppliedPass === pass) {
      return NextResponse.next();
    }
  }

  return new NextResponse("인증이 필요합니다.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="psych-report-tool"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

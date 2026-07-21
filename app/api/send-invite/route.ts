import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

function buildEmailHtml(name: string, link: string) {
  return `
  <div style="font-family: -apple-system, 'Noto Sans KR', sans-serif; max-width: 480px; margin: 0 auto; color: #1c2430;">
    <div style="border-bottom: 3px solid #1c2430; padding-bottom: 12px; margin-bottom: 20px;">
      <div style="font-size: 12px; color: #2f5d62; font-weight: 700; letter-spacing: 0.05em;">ABOUT PSYCHOLOGICAL COUNSELING CENTER</div>
      <div style="font-size: 20px; font-weight: 700; margin-top: 4px;">문장완성검사(SCT) 참여 안내</div>
    </div>
    <p style="font-size: 14px; line-height: 1.7;">${name ? `${name}님, ` : ""}안녕하세요.<br/>어바웃심리상담센터입니다.</p>
    <p style="font-size: 14px; line-height: 1.7;">
      아래 링크로 접속하셔서 문장완성검사(SCT)에 응답해주시기 바랍니다.
      시간 제한은 없으나, 각 문장을 읽으면서 맨 먼저 떠오르는 생각으로 편하게 답변해주세요.
    </p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="${link}" style="display: inline-block; background: #2f5d62; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 700; font-size: 14px;">
        문장완성검사 응답하러 가기
      </a>
    </div>
    <p style="font-size: 12px; color: #4a5568; line-height: 1.6;">
      버튼이 눌리지 않으면 아래 주소를 브라우저에 직접 붙여넣어 주세요.<br/>
      <span style="word-break: break-all;">${link}</span>
    </p>
    <div style="margin-top: 28px; padding-top: 12px; border-top: 1px solid #d8dde3; font-size: 11px; color: #7a8391;">
      어바웃심리상담센터 · aboutcounsel.com
    </div>
  </div>`;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (!apiKey || !fromEmail) {
      return NextResponse.json(
        { error: "서버에 RESEND_API_KEY / RESEND_FROM_EMAIL 환경변수가 설정되어 있지 않습니다." },
        { status: 500 }
      );
    }

    const { name, email } = (await req.json()) as { name: string; email: string };

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "")) {
      return NextResponse.json({ error: "올바른 이메일 주소를 입력해주세요." }, { status: 400 });
    }

    const origin = req.nextUrl.origin;
    const link = `${origin}/sct?name=${encodeURIComponent(name.trim())}`;

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "[어바웃심리상담센터] 문장완성검사(SCT) 참여 안내",
      html: buildEmailHtml(name.trim(), link),
    });

    if (error) {
      return NextResponse.json({ error: `이메일 발송 실패: ${error.message}` }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "알 수 없는 오류가 발생했습니다." }, { status: 500 });
  }
}

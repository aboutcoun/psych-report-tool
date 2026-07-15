import { NextRequest, NextResponse } from "next/server";
import { redis, buildSctKey } from "@/lib/kv";
import { SctSubmission } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name") || "";
    const phone4 = searchParams.get("phone4") || "";

    if (!name.trim() || !/^\d{4}$/.test(phone4)) {
      return NextResponse.json({ error: "이름과 연락처 뒷 4자리를 정확히 입력해주세요." }, { status: 400 });
    }

    const key = buildSctKey(name, phone4);
    const record = await redis.get<SctSubmission>(key);

    if (!record) {
      return NextResponse.json({ error: "일치하는 응답을 찾을 수 없습니다. 이름/연락처를 다시 확인해주세요." }, { status: 404 });
    }

    return NextResponse.json({ result: record });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "조회 중 오류가 발생했습니다." }, { status: 500 });
  }
}

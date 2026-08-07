import { NextRequest, NextResponse } from "next/server";
import { redis, buildSctRandomKey, SCT_RECORD_TTL_SECONDS, SCT_INDEX_KEY } from "@/lib/kv";
import { SctSubmission } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SctSubmission;
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "이름을 입력해주세요." }, { status: 400 });
    }

    const record: SctSubmission = {
      name: name.trim(),
      gender: body.gender || "",
      age: body.age || "",
      responses: body.responses || {},
      submittedAt: new Date().toISOString(),
    };

    const key = buildSctRandomKey();
    await redis.set(key, record, { ex: SCT_RECORD_TTL_SECONDS });
    // 목록 조회용 색인에도 등록
    await redis.zadd(SCT_INDEX_KEY, { score: Date.now(), member: key });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "제출 중 오류가 발생했습니다." }, { status: 500 });
  }
}

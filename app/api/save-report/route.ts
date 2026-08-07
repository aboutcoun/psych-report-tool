import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { redis, REPORT_RECORD_TTL_SECONDS, REPORT_INDEX_KEY } from "@/lib/kv";
import { SavedReport } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const record: SavedReport = {
      id: randomUUID(),
      client: body.client,
      mmpi: body.mmpi,
      tci: body.tci,
      sctEnabled: !!body.sctEnabled,
      sctResponses: body.sctResponses || {},
      result: body.result,
      generatedAt: new Date().toISOString(),
    };

    const key = `report:${record.id}`;
    await redis.set(key, record, { ex: REPORT_RECORD_TTL_SECONDS });
    await redis.zadd(REPORT_INDEX_KEY, { score: Date.now(), member: key });

    return NextResponse.json({ ok: true, id: record.id });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "저장 중 오류가 발생했습니다." }, { status: 500 });
  }
}

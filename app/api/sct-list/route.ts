import { NextResponse } from "next/server";
import { redis, SCT_INDEX_KEY } from "@/lib/kv";
import { SctSubmission } from "@/lib/types";

// 주의: 이 라우트는 middleware.ts의 기본 인증으로 보호됩니다 (공개 경로 아님)
export async function GET() {
  try {
    const keys = await redis.zrange<string[]>(SCT_INDEX_KEY, 0, -1, { rev: true });

    const records: (SctSubmission & { key: string })[] = [];
    const staleKeys: string[] = [];

    for (const key of keys) {
      const record = await redis.get<SctSubmission>(key);
      if (record) {
        records.push({ ...record, key });
      } else {
        // TTL로 이미 삭제된 항목은 색인에서도 정리
        staleKeys.push(key);
      }
    }

    if (staleKeys.length > 0) {
      await redis.zrem(SCT_INDEX_KEY, ...staleKeys);
    }

    return NextResponse.json({ result: records });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "목록 조회 중 오류가 발생했습니다." }, { status: 500 });
  }
}

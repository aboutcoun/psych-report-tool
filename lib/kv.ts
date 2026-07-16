import { Redis } from "@upstash/redis";

// Upstash Redis REST API 사용 — Vercel Marketplace에서 Upstash 연동 시
// UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN 이 자동으로 주입됨
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

// SCT 응답 저장 시 90일 후 자동 삭제 (초 단위)
export const SCT_RECORD_TTL_SECONDS = 60 * 60 * 24 * 90;

// 제출된 SCT 응답들의 목록(색인) — 상담자 화면에서 제출자 목록을 보여줄 때 사용
export const SCT_INDEX_KEY = "sct:index";

export function buildSctKey(name: string, phone4: string) {
  const normalizedName = name.replace(/\s+/g, "");
  return `sct:${normalizedName}:${phone4}`;
}

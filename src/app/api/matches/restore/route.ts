import { createClient as createServerClient } from "../../../../../supabase/server";
import { NextResponse } from "next/server";
import { getRedis, removedMatchesKey } from "@/lib/redis";

// Restores a previously removed study buddy by clearing the pair from both
// users' Redis hashes (mutual, mirrors the remove route).
export async function POST(req: Request) {
  let otherUserId: string | undefined;
  try {
    ({ otherUserId } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!otherUserId) {
    return NextResponse.json({ error: "Missing otherUserId" }, { status: 400 });
  }

  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      {
        error:
          "Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
      },
      { status: 500 }
    );
  }

  const uid = user.id;

  try {
    await Promise.all([
      redis.hdel(removedMatchesKey(uid), otherUserId),
      redis.hdel(removedMatchesKey(otherUserId), uid),
    ]);
  } catch (e) {
    console.error("matches/restore:", e);
    return NextResponse.json(
      { error: "Failed to restore match" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

import { createClient as createServerClient } from "../../../../../supabase/server";
import { NextResponse } from "next/server";
import { getRedis, removedMatchesKey } from "@/lib/redis";

// Removes a study buddy from BOTH users' match tabs by recording the pair
// in each user's Redis hash. Mutual: A removing B also removes A for B.
export async function POST(req: Request) {
  let otherUserId: string | undefined;
  try {
    ({ otherUserId } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!otherUserId) {
    return NextResponse.json(
      { error: "Missing otherUserId" },
      { status: 400 }
    );
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
  const ts = new Date().toISOString();

  try {
    await Promise.all([
      redis.hset(removedMatchesKey(uid), { [otherUserId]: ts }),
      redis.hset(removedMatchesKey(otherUserId), { [uid]: ts }),
    ]);
  } catch (e) {
    console.error("matches/remove:", e);
    return NextResponse.json(
      { error: "Failed to remove match" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

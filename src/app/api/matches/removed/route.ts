import { createClient as createServerClient } from "../../../../../supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getRedis, removedMatchesKey } from "@/lib/redis";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

// Lists the study buddies the current user has removed, so they can restore them.
export async function GET() {
  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({ removed: [] });
  }

  const uid = user.id;
  const hash = await redis.hgetall<Record<string, string>>(
    removedMatchesKey(uid)
  );
  const entries = hash ? Object.entries(hash) : [];
  if (entries.length === 0) {
    return NextResponse.json({ removed: [] });
  }

  let userMap: Record<string, any> = {};
  if (supabaseUrl && serviceKey) {
    const admin = createSupabaseAdmin(supabaseUrl, serviceKey);
    const ids = entries.map(([id]) => id);
    const { data: users } = await admin
      .from("users")
      .select("user_id, full_name, email")
      .in("user_id", ids);
    (users || []).forEach((u) => {
      userMap[u.user_id] = u;
    });
  }

  const removed = entries
    .map(([id, ts]) => ({
      otherId: id,
      removedAt: ts,
      otherUser: userMap[id] ?? null,
    }))
    .sort(
      (a, b) =>
        new Date(b.removedAt).getTime() - new Date(a.removedAt).getTime()
    );

  return NextResponse.json({ removed });
}

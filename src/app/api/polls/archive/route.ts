import { createClient as createServerClient } from "../../../../../supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getRedis, archivedPollsKey } from "@/lib/redis";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

async function requireUser() {
  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  return user;
}

// Archive a poll for the current user (hides it from their feed).
export async function POST(req: Request) {
  let pollId: string | undefined;
  try {
    ({ pollId } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!pollId) {
    return NextResponse.json({ error: "Missing pollId" }, { status: 400 });
  }

  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { error: "Redis is not configured." },
      { status: 500 }
    );
  }

  try {
    await redis.hset(archivedPollsKey(user.id), {
      [pollId]: new Date().toISOString(),
    });
  } catch (e) {
    console.error("polls/archive:", e);
    return NextResponse.json({ error: "Failed to archive poll" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// Unarchive (restore) a poll for the current user.
export async function DELETE(req: Request) {
  let pollId: string | undefined;
  try {
    ({ pollId } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!pollId) {
    return NextResponse.json({ error: "Missing pollId" }, { status: 400 });
  }

  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { error: "Redis is not configured." },
      { status: 500 }
    );
  }

  try {
    await redis.hdel(archivedPollsKey(user.id), pollId);
  } catch (e) {
    console.error("polls/unarchive:", e);
    return NextResponse.json(
      { error: "Failed to restore poll" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

// List the current user's archived polls (with details) for the Settings tab.
export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({ archived: [] });
  }

  const hash = await redis.hgetall<Record<string, string>>(
    archivedPollsKey(user.id)
  );
  const entries = hash ? Object.entries(hash) : [];
  if (entries.length === 0) {
    return NextResponse.json({ archived: [] });
  }

  let pollMap: Record<string, any> = {};
  if (supabaseUrl && serviceKey) {
    const admin = createSupabaseAdmin(supabaseUrl, serviceKey);
    const ids = entries.map(([id]) => id);
    const { data: polls } = await admin
      .from("polls")
      .select("id, title, poll_type, created_at")
      .in("id", ids);
    (polls || []).forEach((p) => {
      pollMap[p.id] = p;
    });
  }

  const archived = entries
    .map(([id, ts]) => ({
      id,
      archivedAt: ts,
      poll: pollMap[id] ?? null,
    }))
    // Skip items whose poll was deleted entirely.
    .filter((a) => a.poll)
    .sort(
      (a, b) =>
        new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime()
    );

  return NextResponse.json({ archived });
}

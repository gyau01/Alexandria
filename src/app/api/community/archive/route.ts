import { createClient as createServerClient } from "../../../../../supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getRedis, archivedPostsKey } from "@/lib/redis";

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

// Archive a community post for the current user (hides it from their board).
export async function POST(req: Request) {
  let postId: string | undefined;
  try {
    ({ postId } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!postId) {
    return NextResponse.json({ error: "Missing postId" }, { status: 400 });
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
    await redis.hset(archivedPostsKey(user.id), {
      [postId]: new Date().toISOString(),
    });
  } catch (e) {
    console.error("community/archive:", e);
    return NextResponse.json({ error: "Failed to archive post" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// Unarchive (restore) a post for the current user.
export async function DELETE(req: Request) {
  let postId: string | undefined;
  try {
    ({ postId } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!postId) {
    return NextResponse.json({ error: "Missing postId" }, { status: 400 });
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
    await redis.hdel(archivedPostsKey(user.id), postId);
  } catch (e) {
    console.error("community/unarchive:", e);
    return NextResponse.json(
      { error: "Failed to restore post" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

// List the current user's archived posts (with details) for the Settings tab.
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
    archivedPostsKey(user.id)
  );
  const entries = hash ? Object.entries(hash) : [];
  if (entries.length === 0) {
    return NextResponse.json({ archived: [] });
  }

  let postMap: Record<string, any> = {};
  if (supabaseUrl && serviceKey) {
    const admin = createSupabaseAdmin(supabaseUrl, serviceKey);
    const ids = entries.map(([id]) => id);
    const { data: posts } = await admin
      .from("community_posts")
      .select("id, title, created_at")
      .in("id", ids);
    (posts || []).forEach((p) => {
      postMap[p.id] = p;
    });
  }

  const archived = entries
    .map(([id, ts]) => ({
      id,
      archivedAt: ts,
      post: postMap[id] ?? null,
    }))
    .filter((a) => a.post)
    .sort(
      (a, b) =>
        new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime()
    );

  return NextResponse.json({ archived });
}

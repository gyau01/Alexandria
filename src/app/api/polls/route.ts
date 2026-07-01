import { createClient as createServerClient } from "../../../../supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getRedis, archivedPollsKey } from "@/lib/redis";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

// Returns all polls with their author's display name + avatar. Uses the
// service client because the `users` table RLS only exposes the caller's own
// row and matched buddies, but poll authors can be anyone.
export async function GET() {
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      {
        error:
          "Server misconfigured: set SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY",
      },
      { status: 500 }
    );
  }

  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdmin(supabaseUrl, serviceKey);

  const { data: polls, error } = await admin
    .from("polls")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("polls GET:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load polls" },
      { status: 500 }
    );
  }

  let rows = polls || [];

  // Hide polls the current user has archived (personal, stored in Redis).
  const redis = getRedis();
  if (redis) {
    try {
      const archived = await redis.hgetall<Record<string, string>>(
        archivedPollsKey(user.id)
      );
      const archivedIds = archived ? Object.keys(archived) : [];
      if (archivedIds.length > 0) {
        rows = rows.filter((p) => !archivedIds.includes(p.id));
      }
    } catch (e) {
      console.error("polls feed archive filter:", e);
    }
  }

  // The current user's own votes, so the UI can highlight / allow switching.
  const myVotes: Record<string, string> = {};
  {
    const { data: votes } = await admin
      .from("poll_votes")
      .select("poll_id, selected_option")
      .eq("user_id", user.id);
    (votes || []).forEach((v) => {
      myVotes[v.poll_id] = v.selected_option;
    });
  }

  const authorIds = Array.from(
    new Set(rows.map((p) => p.user_id).filter(Boolean))
  );

  const authorMap: Record<string, { full_name: string | null; profile_picture_url: string | null }> = {};
  if (authorIds.length > 0) {
    const { data: users } = await admin
      .from("users")
      .select("user_id, full_name, profile_picture_url")
      .in("user_id", authorIds);
    (users || []).forEach((u) => {
      authorMap[u.user_id] = {
        full_name: u.full_name,
        profile_picture_url: u.profile_picture_url,
      };
    });
  }

  const withAuthors = rows.map((p) => ({
    ...p,
    author: authorMap[p.user_id] ?? null,
    myVote: myVotes[p.id] ?? null,
  }));

  return NextResponse.json({ polls: withAuthors });
}

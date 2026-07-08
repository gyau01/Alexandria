import { createClient as createServerClient } from "../../../../supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getRedis, archivedPostsKey } from "@/lib/redis";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

// Returns published community posts and their comments, each with the
// author's current name + avatar resolved from the users table. Uses the
// service client because the `users` table RLS only exposes the caller's own
// row and matched buddies, while post/comment authors can be anyone.
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

  const { data: postData, error: postError } = await admin
    .from("community_posts")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (postError) {
    console.error("community GET posts:", postError);
    return NextResponse.json(
      { error: postError.message || "Failed to load posts" },
      { status: 500 }
    );
  }

  let posts = postData || [];

  // Hide posts the current user has archived (personal, stored in Redis).
  const redis = getRedis();
  if (redis) {
    try {
      const archived = await redis.hgetall<Record<string, string>>(
        archivedPostsKey(user.id)
      );
      const archivedIds = archived ? Object.keys(archived) : [];
      if (archivedIds.length > 0) {
        posts = posts.filter((p) => !archivedIds.includes(p.id));
      }
    } catch (e) {
      console.error("community feed archive filter:", e);
    }
  }

  const postIds = posts.map((p) => p.id);

  let comments: any[] = [];
  if (postIds.length > 0) {
    const { data: commentData } = await admin
      .from("community_comments")
      .select("*")
      .in("post_id", postIds)
      .order("created_at", { ascending: true });
    comments = commentData || [];
  }

  // Resolve author display info for everyone referenced.
  const userIds = Array.from(
    new Set(
      [...posts, ...comments].map((r) => r.user_id).filter(Boolean)
    )
  );

  const authorMap: Record<
    string,
    { full_name: string | null; profile_picture_url: string | null }
  > = {};
  if (userIds.length > 0) {
    const { data: users } = await admin
      .from("users")
      .select("user_id, full_name, profile_picture_url")
      .in("user_id", userIds);
    (users || []).forEach((u) => {
      authorMap[u.user_id] = {
        full_name: u.full_name,
        profile_picture_url: u.profile_picture_url,
      };
    });
  }

  const attach = (row: any) => ({
    ...row,
    author: authorMap[row.user_id] ?? null,
  });

  return NextResponse.json({
    posts: posts.map(attach),
    comments: comments.map(attach),
  });
}

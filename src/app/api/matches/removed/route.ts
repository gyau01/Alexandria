import { createClient as createServerClient } from "../../../../../supabase/server";
import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/removed-matches";

// Lists the study buddies the current user has removed, so they can restore them.
export async function GET() {
  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json({ removed: [] });
  }

  const uid = user.id;
  const { data: rows, error } = await admin
    .from("removed_matches")
    .select("other_user_id, removed_at")
    .eq("user_id", uid)
    .order("removed_at", { ascending: false });

  if (error) {
    console.error("matches/removed:", error);
    return NextResponse.json({ removed: [] });
  }

  const entries = rows ?? [];
  if (entries.length === 0) {
    return NextResponse.json({ removed: [] });
  }

  const ids = entries.map((r) => r.other_user_id);
  const { data: users } = await admin
    .from("users")
    .select("user_id, full_name, email")
    .in("user_id", ids);

  const userMap: Record<string, { full_name: string | null; email: string | null }> =
    {};
  (users || []).forEach((u) => {
    userMap[u.user_id] = { full_name: u.full_name, email: u.email };
  });

  const removed = entries.map((row) => ({
    otherId: row.other_user_id,
    removedAt: row.removed_at,
    otherUser: userMap[row.other_user_id] ?? null,
  }));

  return NextResponse.json({ removed });
}

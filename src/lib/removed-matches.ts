import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

export function getAdminClient() {
  if (!supabaseUrl || !serviceKey) return null;
  return createSupabaseAdmin(supabaseUrl, serviceKey);
}

/** Returns other user ids the given user has removed from their match list. */
export async function getRemovedOtherUserIds(
  admin: ReturnType<typeof createSupabaseAdmin>,
  userId: string
): Promise<string[]> {
  const { data, error } = await admin
    .from("removed_matches")
    .select("other_user_id")
    .eq("user_id", userId);

  if (error) {
    console.error("removed_matches select:", error);
    return [];
  }

  return (data ?? []).map((row) => row.other_user_id);
}

/** Records a mutual removal for both users. */
export async function recordMutualRemoval(
  admin: ReturnType<typeof createSupabaseAdmin>,
  userId: string,
  otherUserId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ts = new Date().toISOString();
  const rows = [
    { user_id: userId, other_user_id: otherUserId, removed_at: ts },
    { user_id: otherUserId, other_user_id: userId, removed_at: ts },
  ];

  const { error } = await admin
    .from("removed_matches")
    .upsert(rows, { onConflict: "user_id,other_user_id" });

  if (error) {
    console.error("removed_matches upsert:", error);
    return { ok: false, message: error.message || "Failed to remove match" };
  }

  return { ok: true };
}

/** Clears a mutual removal for both users. */
export async function clearMutualRemoval(
  admin: ReturnType<typeof createSupabaseAdmin>,
  userId: string,
  otherUserId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error: e1 } = await admin
    .from("removed_matches")
    .delete()
    .eq("user_id", userId)
    .eq("other_user_id", otherUserId);

  const { error: e2 } = await admin
    .from("removed_matches")
    .delete()
    .eq("user_id", otherUserId)
    .eq("other_user_id", userId);

  if (e1 || e2) {
    console.error("removed_matches delete:", e1 || e2);
    return {
      ok: false,
      message: (e1 || e2)?.message || "Failed to restore match",
    };
  }

  return { ok: true };
}

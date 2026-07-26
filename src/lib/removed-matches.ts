import {
  createClient as createSupabaseAdmin,
  type SupabaseClient,
} from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Loose client type so callers using createClient(url, key) type-check in CI. */
type AdminClient = SupabaseClient<any, "public", any>;

export function getAdminClient(): AdminClient | null {
  if (!supabaseUrl || !serviceKey) return null;
  return createSupabaseAdmin(supabaseUrl, serviceKey);
}

/** Returns other user ids the given user has removed from their match list. */
export async function getRemovedOtherUserIds(
  admin: AdminClient,
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

function chatImageStoragePath(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  const marker = "/chat-images/";
  const idx = imageUrl.indexOf(marker);
  if (idx === -1) return null;
  return imageUrl.slice(idx + marker.length).split("?")[0] || null;
}

/** Permanently deletes all DM messages (and chat images) between two users. */
export async function deleteConversationForPair(
  admin: AdminClient,
  userId: string,
  otherUserId: string
): Promise<{ ok: true; deletedMessages: number } | { ok: false; message: string }> {
  const { data: matchRows, error: matchError } = await admin
    .from("matches")
    .select("id, user1_id, user2_id")
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

  if (matchError) {
    console.error("deleteConversationForPair matches:", matchError);
    return {
      ok: false,
      message: matchError.message || "Failed to find match conversation",
    };
  }

  const matchIds = (matchRows ?? [])
    .filter(
      (m) =>
        (m.user1_id === userId && m.user2_id === otherUserId) ||
        (m.user1_id === otherUserId && m.user2_id === userId)
    )
    .map((m) => m.id);

  if (matchIds.length === 0) return { ok: true, deletedMessages: 0 };

  const imagePaths: string[] = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data: batch, error: selectError } = await admin
      .from("messages")
      .select("image_url")
      .in("match_id", matchIds)
      .not("image_url", "is", null)
      .range(offset, offset + pageSize - 1);

    if (selectError) {
      console.error("deleteConversationForPair messages select:", selectError);
      return {
        ok: false,
        message: selectError.message || "Failed to load messages",
      };
    }

    if (!batch?.length) break;

    for (const row of batch) {
      const path = chatImageStoragePath(row.image_url);
      if (path) imagePaths.push(path);
    }

    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  const uniqueImagePaths = Array.from(new Set(imagePaths));
  if (uniqueImagePaths.length > 0) {
    const { error: storageError } = await admin.storage
      .from("chat-images")
      .remove(uniqueImagePaths);
    if (storageError) {
      console.error("deleteConversationForPair storage:", storageError);
    }
  }

  const { data: deletedRows, error: deleteError } = await admin
    .from("messages")
    .delete()
    .in("match_id", matchIds)
    .select("id");

  if (deleteError) {
    console.error("deleteConversationForPair messages delete:", deleteError);
    return {
      ok: false,
      message: deleteError.message || "Failed to delete messages",
    };
  }

  return { ok: true, deletedMessages: deletedRows?.length ?? 0 };
}

/** Records a mutual removal for both users. */
export async function recordMutualRemoval(
  admin: AdminClient,
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
  admin: AdminClient,
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

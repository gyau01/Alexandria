import { createClient as createServerClient } from "../../../../../supabase/server";
import { NextResponse } from "next/server";
import {
  deleteConversationForPair,
  getAdminClient,
  recordMutualRemoval,
} from "@/lib/removed-matches";

// Removes a study buddy from BOTH users' match and chat tabs, and permanently
// deletes their DM history in Supabase.
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

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json(
      {
        error:
          "Server misconfigured: set SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY",
      },
      { status: 500 }
    );
  }

  const removal = await recordMutualRemoval(admin, user.id, otherUserId);
  if (!removal.ok) {
    return NextResponse.json({ error: removal.message }, { status: 500 });
  }

  const deleted = await deleteConversationForPair(
    admin,
    user.id,
    otherUserId
  );
  if (!deleted.ok) {
    return NextResponse.json({ error: deleted.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    deletedMessages: deleted.deletedMessages,
  });
}

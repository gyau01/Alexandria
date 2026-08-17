import { createClient as createServerClient } from "../../../../supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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

// List the current user's group chats, with member info + last activity.
export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ groups: [] });
  }

  const admin = createSupabaseAdmin(supabaseUrl, serviceKey);

  const { data: myMemberships } = await admin
    .from("group_chat_members")
    .select("group_id")
    .eq("user_id", user.id);

  const groupIds = (myMemberships ?? []).map((m) => m.group_id);
  if (groupIds.length === 0) {
    return NextResponse.json({ groups: [] });
  }

  const [groupsRes, membersRes] = await Promise.all([
    admin
      .from("group_chats")
      .select("id, name, created_by, created_at")
      .in("id", groupIds),
    admin
      .from("group_chat_members")
      .select("group_id, user_id")
      .in("group_id", groupIds),
  ]);

  const memberRows = membersRes.data ?? [];
  const userIds = Array.from(new Set(memberRows.map((m) => m.user_id)));

  const userMap: Record<string, { full_name: string; profile_picture_url: string | null }> = {};
  if (userIds.length > 0) {
    const { data: users } = await admin
      .from("users")
      .select("user_id, full_name, profile_picture_url")
      .in("user_id", userIds);
    (users ?? []).forEach((u) => {
      userMap[u.user_id] = {
        full_name: u.full_name,
        profile_picture_url: u.profile_picture_url,
      };
    });
  }

  // Last message time + unread counts per group.
  const [{ data: lastMsgs }, { data: unreadMsgs }] = await Promise.all([
    admin
      .from("messages")
      .select("group_id, created_at")
      .in("group_id", groupIds)
      .order("created_at", { ascending: false }),
    admin
      .from("messages")
      .select("group_id")
      .in("group_id", groupIds)
      .eq("read", false)
      .neq("sender_id", user.id),
  ]);

  const lastTimeByGroup: Record<string, string> = {};
  (lastMsgs ?? []).forEach((m) => {
    if (m.group_id && !lastTimeByGroup[m.group_id]) {
      lastTimeByGroup[m.group_id] = m.created_at;
    }
  });

  const unreadByGroup: Record<string, number> = {};
  (unreadMsgs ?? []).forEach((m) => {
    if (!m.group_id) return;
    unreadByGroup[m.group_id] = (unreadByGroup[m.group_id] || 0) + 1;
  });

  const groups = (groupsRes.data ?? []).map((g) => {
    const members = memberRows
      .filter((m) => m.group_id === g.id)
      .map((m) => ({
        userId: m.user_id,
        fullName: userMap[m.user_id]?.full_name ?? "User",
        avatarUrl: userMap[m.user_id]?.profile_picture_url ?? null,
      }));
    return {
      id: g.id,
      name: g.name,
      createdBy: g.created_by,
      members,
      lastMessageTime: lastTimeByGroup[g.id] ?? g.created_at,
      unreadCount: unreadByGroup[g.id] || 0,
    };
  });

  return NextResponse.json({ groups });
}

// Create a new group chat with the current user + selected matched buddies.
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
	if (!supabaseUrl || !serviceKey) {
  	return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }


	const supabase = await createServerClient();
	/*
	const { data, error } = await supabase
		.from("users")
		.select("subscription")
		.eq("user_id", user.id)
		.single();

	if (error || !data) {
		return NextResponse.json(
			{ error: "couldn't verify the sub" },
			{ status: 400 }
		);
	}
	const sub_id = data.subscription;
	const BIT = 0;
	if ((sub_id & BIT) === 0) {
		return NextResponse.json({ error: "not subbed" }, { status: 400 });
	} 
	*/
  let name: string | undefined;
  let memberIds: string[] = [];
  try {
    const body = await req.json();
    name = typeof body.name === "string" ? body.name.trim() : undefined;
    memberIds = Array.isArray(body.memberIds) ? body.memberIds : [];
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const requested = Array.from(
    new Set(memberIds.filter((id) => id && id !== user.id))
  );
  if (requested.length === 0) {
    return NextResponse.json(
      { error: "Pick at least one person to start a group." },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdmin(supabaseUrl, serviceKey);

  // Only allow adding people the creator is actually matched with.
  const { data: matchRows } = await admin
    .from("matches")
    .select("user1_id, user2_id")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

  const matchedIds = new Set<string>();
  (matchRows ?? []).forEach((m) => {
    matchedIds.add(m.user1_id === user.id ? m.user2_id : m.user1_id);
  });

  const validMembers = requested.filter((id) => matchedIds.has(id));
  if (validMembers.length === 0) {
    return NextResponse.json(
      { error: "You can only add your matched study buddies." },
      { status: 400 }
    );
  }

  const { data: group, error: groupErr } = await admin
    .from("group_chats")
    .insert({ name: name || null, created_by: user.id })
    .select("id, name, created_by, created_at")
    .single();

  if (groupErr || !group) {
    console.error("create group:", groupErr);
    const missingTable =
      groupErr?.code === "PGRST205" ||
      /group_chats/i.test(groupErr?.message ?? "");
    return NextResponse.json(
      {
        error: missingTable
          ? "Group chats aren't set up in the database yet. Apply the group_chats migration in Supabase."
          : groupErr?.message || "Failed to create group",
      },
      { status: 500 }
    );
  }

  const memberInserts = [user.id, ...validMembers].map((uid) => ({
    group_id: group.id,
    user_id: uid,
  }));

  const { error: memberErr } = await admin
    .from("group_chat_members")
    .insert(memberInserts);

  if (memberErr) {
    console.error("add group members:", memberErr);
    await admin.from("group_chats").delete().eq("id", group.id);
    return NextResponse.json(
      { error: "Failed to add members" },
      { status: 500 }
    );
  }

  return NextResponse.json({ group: { ...group, memberIds: [user.id, ...validMembers] } });
}

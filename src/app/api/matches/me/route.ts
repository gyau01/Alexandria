import { createClient as createServerClient } from "../../../../../supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getRemovedOtherUserIds } from "@/lib/removed-matches";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  const uid = user.id;

  const pairKey = (a: string, b: string) => [a, b].sort().join("|");

  const { data: matchesRes, error: matchesError } = await admin
    .from("matches")
    .select("*")
    .or(`user1_id.eq.${uid},user2_id.eq.${uid}`)
    .order("compatibility_score", { ascending: false });

  if (matchesError) {
    console.error("matches/me:", matchesError);
    return NextResponse.json(
      { error: matchesError.message || "Failed to load matches" },
      { status: 500 }
    );
  }

  const rows = matchesRes || [];
  const byPair = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!row.user1_id || !row.user2_id) continue;
    const key = pairKey(row.user1_id, row.user2_id);
    const list = byPair.get(key) ?? [];
    list.push(row);
    byPair.set(key, list);
  }

  const mergedMatches = Array.from(byPair.values()).map((group) => {
    const canonical = group.find((g) => g.user1_id === uid) ?? group[0];
    const restIds = group.filter((g) => g.id !== canonical.id).map((g) => g.id);
    return { ...canonical, allMatchIds: [canonical.id, ...restIds] };
  });

  mergedMatches.sort(
    (a, b) => (b.compatibility_score ?? 0) - (a.compatibility_score ?? 0)
  );

  let removedIds: string[] = [];
  try {
    removedIds = await getRemovedOtherUserIds(admin, uid);
  } catch (e) {
    console.error("matches/me removed_matches:", e);
  }

  const visibleMatches = mergedMatches.filter((match) => {
    const otherId = match.user1_id === uid ? match.user2_id : match.user1_id;
    return !removedIds.includes(otherId);
  });

  const otherIds = Array.from(
    new Set(
      visibleMatches.map((match) =>
        match.user1_id === uid ? match.user2_id : match.user1_id
      )
    )
  );

  // Batch-fetch like /api/groups (avoids per-row .single() failures).
  const userMap: Record<
    string,
    { full_name: string | null; email: string | null; profile_picture_url: string | null }
  > = {};
  const profileMap: Record<
    string,
    { major: string | null; year_of_study: string | null }
  > = {};
  const classesMap: Record<string, { class_code: string; class_name: string }[]> =
    {};

  if (otherIds.length > 0) {
    const [usersRes, profilesRes, classesRes] = await Promise.all([
      admin
        .from("users")
        .select("user_id, full_name, email, profile_picture_url")
        .in("user_id", otherIds),
      admin
        .from("student_profiles")
        .select("user_id, major, year_of_study")
        .in("user_id", otherIds),
      admin
        .from("student_classes")
        .select("user_id, class_code, class_name")
        .in("user_id", otherIds),
    ]);

    (usersRes.data ?? []).forEach((u) => {
      if (!u.user_id) return;
      userMap[u.user_id] = {
        full_name: u.full_name,
        email: u.email,
        profile_picture_url: u.profile_picture_url,
      };
    });
    (profilesRes.data ?? []).forEach((p) => {
      if (!p.user_id) return;
      profileMap[p.user_id] = {
        major: p.major,
        year_of_study: p.year_of_study,
      };
    });
    (classesRes.data ?? []).forEach((c) => {
      if (!c.user_id) return;
      const list = classesMap[c.user_id] ?? [];
      if (list.length < 3) {
        list.push({ class_code: c.class_code, class_name: c.class_name });
        classesMap[c.user_id] = list;
      }
    });
  }

  const matchDetails = visibleMatches.map((match) => {
    const otherId =
      match.user1_id === uid ? match.user2_id : match.user1_id;
    return {
      ...match,
      otherUser: userMap[otherId] ?? null,
      profile: profileMap[otherId] ?? null,
      classes: classesMap[otherId] ?? [],
      otherId,
    };
  });

  return NextResponse.json({ matches: matchDetails });
}

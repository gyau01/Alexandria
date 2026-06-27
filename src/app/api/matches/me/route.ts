import { createClient as createServerClient } from "../../../../../supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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

  const matchDetails = await Promise.all(
    mergedMatches.map(async (match) => {
      const otherId =
        match.user1_id === uid ? match.user2_id : match.user1_id;
      const [otherUserRes, profileRes, classesRes] = await Promise.all([
        admin.from("users").select("full_name, email").eq("user_id", otherId).single(),
        admin
          .from("student_profiles")
          .select("major, year_of_study")
          .eq("user_id", otherId)
          .single(),
        admin
          .from("student_classes")
          .select("class_code, class_name")
          .eq("user_id", otherId)
          .limit(3),
      ]);

      return {
        ...match,
        otherUser: otherUserRes.data ?? null,
        profile: profileRes.data ?? null,
        classes: classesRes.data ?? [],
        otherId,
      };
    })
  );

  return NextResponse.json({ matches: matchDetails });
}

import { createClient as createServerClient } from "../../../../../supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

// Defaults must match the client (settings-view.tsx) so that users who have
// never opened Settings behave as "share everything / public".
const DEFAULT_PRIVACY = {
  profile_visibility: "public" as "public" | "matches" | "private",
  share_classes: true,
  share_activity: true,
};

// Returns another student's profile, honoring their privacy / data-sharing
// settings stored in `user_settings.privacy`.
export async function GET(
  _req: Request,
  { params }: { params: { userId: string } }
) {
  const targetId = params.userId;
  if (!targetId) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

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

  const viewerId = user.id;
  const isSelf = viewerId === targetId;
  const admin = createSupabaseAdmin(supabaseUrl, serviceKey);

  // Base user record + privacy settings + academic profile in parallel.
  const [userRes, settingsRes, profileRes] = await Promise.all([
    admin
      .from("users")
      .select("user_id, full_name, email, profile_picture_url")
      .eq("user_id", targetId)
      .maybeSingle(),
    admin
      .from("user_settings")
      .select("privacy")
      .eq("user_id", targetId)
      .maybeSingle(),
    admin
      .from("student_profiles")
      .select("university, major, year_of_study, bio")
      .eq("user_id", targetId)
      .maybeSingle(),
  ]);

  if (!userRes.data) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const privacy = { ...DEFAULT_PRIVACY, ...(settingsRes.data?.privacy || {}) };

  // Determine whether the viewer is matched with the target.
  let isMatched = false;
  if (!isSelf) {
    const { data: matchRows } = await admin
      .from("matches")
      .select("id")
      .or(
        `and(user1_id.eq.${viewerId},user2_id.eq.${targetId}),and(user1_id.eq.${targetId},user2_id.eq.${viewerId})`
      )
      .limit(1);
    isMatched = !!(matchRows && matchRows.length > 0);
  }

  // Resolve overall access based on the target's profile visibility setting.
  // - public  : anyone signed in can view
  // - matches : only matched study buddies (or self)
  // - private : only the owner
  const visibility = privacy.profile_visibility;
  let canView = true;
  if (!isSelf) {
    if (visibility === "private") canView = false;
    else if (visibility === "matches") canView = isMatched;
  }

  const baseUser = userRes.data;
  const profile = profileRes.data;

  // When the profile can't be viewed, return just enough to render a
  // "this profile is private" state (name + avatar are already visible in
  // the matches / chat lists anyway).
  if (!canView) {
    return NextResponse.json({
      profile: {
        userId: targetId,
        fullName: baseUser.full_name,
        avatarUrl: baseUser.profile_picture_url,
        isSelf,
        isMatched,
        visibility,
        canView: false,
      },
    });
  }

  // Data-sharing toggles. The owner always sees their own data.
  const shareClasses = isSelf || privacy.share_classes;
  const shareActivity = isSelf || privacy.share_activity;

  // Classes (gated by "Share my classes").
  let classes: any[] | null = null;
  if (shareClasses) {
    const { data } = await admin
      .from("student_classes")
      .select("class_code, class_name, semester")
      .eq("user_id", targetId);
    classes = data ?? [];
  }

  // Study preferences are helpful context for study buddies and aren't
  // separately gated, so we include them whenever the profile is viewable.
  const { data: prefs } = await admin
    .from("study_preferences")
    .select(
      "study_time_preference, study_location_preference, group_size_preference, study_style"
    )
    .eq("user_id", targetId)
    .maybeSingle();

  // Recent activity (gated by "Share my activity"): latest community posts
  // and comments, merged and sorted by recency.
  let activity: any[] | null = null;
  if (shareActivity) {
    const [postsRes, commentsRes] = await Promise.all([
      admin
        .from("community_posts")
        .select("id, title, created_at")
        .eq("user_id", targetId)
        .order("created_at", { ascending: false })
        .limit(5),
      admin
        .from("community_comments")
        .select("id, content, created_at, post_id")
        .eq("user_id", targetId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const posts = (postsRes.data ?? []).map((p) => ({
      id: p.id,
      type: "post" as const,
      title: p.title,
      created_at: p.created_at,
    }));
    const comments = (commentsRes.data ?? []).map((c) => ({
      id: c.id,
      type: "comment" as const,
      title: c.content,
      created_at: c.created_at,
    }));

    activity = [...posts, ...comments]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 6);
  }

  return NextResponse.json({
    profile: {
      userId: targetId,
      fullName: baseUser.full_name,
      // Only reveal email to matched buddies or the owner.
      email: isSelf || isMatched ? baseUser.email : null,
      avatarUrl: baseUser.profile_picture_url,
      university: profile?.university ?? null,
      major: profile?.major ?? null,
      yearOfStudy: profile?.year_of_study ?? null,
      bio: profile?.bio ?? null,
      isSelf,
      isMatched,
      visibility,
      canView: true,
      classes,
      classesHidden: !shareClasses,
      preferences: prefs ?? null,
      activity,
      activityHidden: !shareActivity,
    },
  });
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { SCORING, applyScore } from "@/lib/matchScoring";

function normalizeClassCode(code: string): string {
  return code.replace(/\s+/g, "").toUpperCase();
}

export type MatchCalculationResult =
  | { ok: true; matchCount: number }
  | { ok: false; code: "incomplete_profile" }
  | { ok: false; code: "upsert_failed"; message: string };

export async function runMatchCalculation(
  supabase: SupabaseClient,
  userId: string
): Promise<MatchCalculationResult> {
  const { data: userProfile } = await supabase
    .from("student_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  const { data: userClasses } = await supabase
    .from("student_classes")
    .select("class_code")
    .eq("user_id", userId);

  const { data: userPreferences } = await supabase
    .from("study_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!userProfile || !userClasses || !userPreferences) {
    return { ok: false, code: "incomplete_profile" };
  }

  const userClassCodes = userClasses.map((c) => normalizeClassCode(c.class_code));

  const { data: allProfiles } = await supabase
    .from("student_profiles")
    .select("*")
    .eq("profile_completed", true)
    .neq("user_id", userId);

  if (!allProfiles || allProfiles.length === 0) {
    return { ok: true, matchCount: 0 };
  }

  const matches: {
    user1_id: string;
    user2_id: string;
    compatibility_score: number;
  }[] = [];

  for (const profile of allProfiles) {
    const { data: theirClasses } = await supabase
      .from("student_classes")
      .select("class_code")
      .eq("user_id", profile.user_id);

    const { data: theirPreferences } = await supabase
      .from("study_preferences")
      .select("*")
      .eq("user_id", profile.user_id)
      .single();

    if (!theirClasses || !theirPreferences) continue;

    const theirClassCodes = theirClasses.map((c) => normalizeClassCode(c.class_code));

    let classMatch = false;
    const userPref = userPreferences.class_matching_preference || "specific";
    const theirPref = theirPreferences.class_matching_preference || "specific";

    const classWeight =
    userPref === "specific"
      ? SCORING.classes.weight * SCORING.priorityMultiplier
      : SCORING.classes.weight;

    if (userPref === "generic" || theirPref === "generic") {
      const extractSubject = (code: string) =>
        code.match(/^([A-Z]+)/)?.[1] || "";

      const userSubjects = new Set(userClassCodes.map(extractSubject));
      const theirSubjects = new Set(theirClassCodes.map(extractSubject));

      classMatch =
        Array.from(userSubjects).some((s) => theirSubjects.has(s)) ||
        userProfile.major === profile.major;
    } else {
      if (userPreferences.selected_class_code) {
        classMatch = theirClassCodes.includes(
          normalizeClassCode(userPreferences.selected_class_code)
        );
      } else if (theirPreferences.selected_class_code) {
        classMatch = userClassCodes.includes(
          normalizeClassCode(theirPreferences.selected_class_code)
        );
      } else {
        classMatch = userClassCodes.some((c) =>
          theirClassCodes.includes(c)
        );
      }
    }

    const matchCriteria = {
      classes: classMatch,
      major: userProfile.major === profile.major,
      year: userProfile.year_of_study === profile.year_of_study,
      studyTime: (userPreferences.study_time_preference || []).some((t: string) =>
        (theirPreferences.study_time_preference || []).includes(t)
      ),
      location: (userPreferences.study_location_preference || []).some((l: string) =>
        (theirPreferences.study_location_preference || []).includes(l)
      ),
      style: (userPreferences.study_style || []).some((s: string) =>
        (theirPreferences.study_style || []).includes(s)
      ),
    };

    let scoreTotal = 0;

    scoreTotal += applyScore(
      matchCriteria.classes,
      SCORING.classes.points,
      classWeight,
      userPreferences.class_priority
    );

    scoreTotal += applyScore(
      matchCriteria.major,
      SCORING.major.points,
      SCORING.major.weight,
      userPreferences.major_priority
    );

    scoreTotal += applyScore(
      matchCriteria.year,
      SCORING.year.points,
      SCORING.year.weight,
      userPreferences.year_priority
    );

    scoreTotal += applyScore(
      matchCriteria.studyTime,
      SCORING.studyTime.points,
      SCORING.studyTime.weight,
      userPreferences.time_priority
    );

    scoreTotal += applyScore(
      matchCriteria.location,
      SCORING.location.points,
      SCORING.location.weight,
      userPreferences.location_priority
    );

    scoreTotal += applyScore(
      matchCriteria.style,
      SCORING.style.points,
      SCORING.style.weight,
      userPreferences.style_priority
    );

    if (scoreTotal >= SCORING.minTotal) {
      const rounded = Math.round(scoreTotal);
      matches.push(
        { user1_id: userId, user2_id: profile.user_id, compatibility_score: rounded },
        { user1_id: profile.user_id, user2_id: userId, compatibility_score: rounded }
      );
    }
  }

  if (matches.length > 0) {
    const { error: upsertError } = await supabase.from("matches").upsert(matches, {
      onConflict: "user1_id,user2_id",
    });
    if (upsertError) {
      console.error("matches upsert:", upsertError);
      return {
        ok: false,
        code: "upsert_failed",
        message: upsertError.message || "Failed to save matches",
      };
    }
  }

  return { ok: true, matchCount: matches.length / 2 };
}

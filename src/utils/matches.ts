import { createClient } from "../../supabase/server";
import { redirect } from "next/navigation";

export default async function matchingCheck() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: userData, error } = await supabase
    .from("users")
    .select("subscription")
    .eq("user_id", user.id)
    .single();

  if (error || !userData) {
    redirect("/sign-in");
  }

  const allowedTiers = [12, 10, 9, 14, 13, 11, 15];
  const tier = Number(userData.subscription) || 0;
  if (!allowedTiers.includes(tier)) {
    redirect("/pricing");
  }

  return null;
}

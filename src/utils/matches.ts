import { createClient } from "../../supabase/server";
import { redirect } from "next/navigation";
export default async function matchingCheck() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: userData, error } = await supabase
    .from("users")
    .select("subscription")
    .eq("id", user.id)
    .single();

  if (error || !userData) {
    redirect("/sign-in"); // or handle error appropriately
  }

  const allowedTiers = [12, 10, 9, 14, 13, 11, 15];
  if (!allowedTiers.includes(userData.subscription)) {
    redirect("/upgrade"); // or wherever non-subscribers should go
  }

  return (
    <div>
      {/* actual community page content */}
    </div>
  );
}

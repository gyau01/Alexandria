import DashboardNavbar from "@/components/dashboard-navbar";
import { createClient } from "../../../supabase/server";
import { redirect } from "next/navigation";
import ProfileSetup from "@/components/profile-setup";
import DashboardContent from "@/components/dashboard-content";

export default async function Dashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Check if profile is completed
  const { data: profile } = await supabase
    .from("student_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const profileCompleted = profile?.profile_completed;

  return (
    <div className="min-h-screen bg-muted/40">
      {!profileCompleted ? (
        <ProfileSetup />
      ) : (
        <>
          <DashboardNavbar />
          <DashboardContent userId={user.id} />
        </>
      )}
    </div>
  );
}
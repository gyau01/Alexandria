import { createClient as createServerClient } from "../../../../../supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

// Returns the current user's most recent subscription for the Billing section.
export async function GET() {
  const authClient = await createServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ subscription: null });
  }

  const admin = createSupabaseAdmin(supabaseUrl, serviceKey);
  const { data: subscription } = await admin
    .from("subscriptions")
    .select(
      "status, amount, currency, interval, current_period_end, cancel_at_period_end, customer_id"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ subscription: subscription ?? null });
}

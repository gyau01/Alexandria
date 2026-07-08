import { createClient as createServerClient } from "../../../../../supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

// Opens the Stripe Customer Portal so users manage payment method,
// invoices, and cancel/upgrade on Stripe's hosted page.
export async function POST(req: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json(
      { error: "Billing is not configured. Set STRIPE_SECRET_KEY." },
      { status: 500 }
    );
  }
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Server misconfigured" },
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
  const { data: subscription } = await admin
    .from("subscriptions")
    .select("customer_id")
    .eq("user_id", user.id)
    .not("customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!subscription?.customer_id) {
    return NextResponse.json(
      { error: "No billing account found. Subscribe to a plan first." },
      { status: 400 }
    );
  }

  const origin = new URL(req.url).origin;
  const stripe = new Stripe(stripeKey, { apiVersion: "2025-01-27.acacia" });

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.customer_id,
      return_url: `${origin}/dashboard?tab=settings`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("billing/portal:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to open billing portal" },
      { status: 500 }
    );
  }
}

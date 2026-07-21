import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "../../../../../supabase/server";
import { runMatchCalculation } from "@/lib/runMatchCalculation";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        {
          error:
            "Server misconfigured: set SUPABASE_SERVICE_KEY or SUPABASE_SERVICE_ROLE_KEY",
        },
        { status: 500 }
      );
    }

    const { userId } = await request.json();

    const authClient = await createServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user || user.id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

		const { data: subbed, error: subError } = await supabase
			.from("users")
			.select("subscription")
			.eq("user_id", user.id)
			.single();

		if ( subError || !subbed ) {
			return NextResponse.json({error: " could not access subscription" },{status: 401});
		}

		let flag = 0;
		const sub_id = subbed.subscription ?? 0;

		const BIT = 1 << 1;

		if ((BIT & sub_id) === 0 ) {
			const { data, error } = await supabase.from("user_usage")
				. select("max_match")
				.eq("user_id", user.id)
				.single();

			if ( error || !data ){
				return NextResponse.json({error: " error checking usage "}, {status: 401});
			}

			let check = data.max_match;

			if ( check !== 0 ){
				check -= 1;

				await supabase.from("user_usage").update({max_match:check}).eq("user_id", user.id).single();
			}
			else {
				return NextResponse.json({error: " out of matches"}, {status: 401});
			}
		}

    const result = await runMatchCalculation(supabase, userId);

    if (!result.ok) {
      if (result.code === "incomplete_profile") {
        return NextResponse.json({ error: "Profile incomplete" }, { status: 400 });
      }
      return NextResponse.json(
        { error: result.message || "Failed to save matches" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      matchCount: result.matchCount,
    });
  } catch (error) {
    console.error("Error calculating matches:", error);
    return NextResponse.json(
      { error: "Failed to calculate matches" },
      { status: 500 }
    );
  }
}

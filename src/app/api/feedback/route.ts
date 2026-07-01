import { createClient } from "../../../../supabase/server";
import { NextResponse } from "next/server";

const VALID_CATEGORIES = ["general", "bug", "feature", "account", "other"];

export async function POST(request: Request) {
  try {
    const { name, email, category, message } = await request.json();

    // Message is the only required field.
    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Please enter your feedback message" },
        { status: 400 }
      );
    }

    if (message.trim().length > 5000) {
      return NextResponse.json(
        { error: "Feedback is too long (max 5000 characters)" },
        { status: 400 }
      );
    }

    // If an email was provided, make sure it looks valid.
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        );
      }
    }

    const supabase = await createClient();

    // Attach the user id when the submitter is signed in (optional).
    let userId: string | null = null;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      /* anonymous submission is fine */
    }

    const safeCategory =
      typeof category === "string" && VALID_CATEGORIES.includes(category)
        ? category
        : "general";

    const { data, error } = await supabase
      .from("feedback")
      .insert({
        user_id: userId,
        name: name?.trim() || null,
        email: email?.trim().toLowerCase() || null,
        category: safeCategory,
        message: message.trim(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(
      { message: "Thanks for your feedback!", data },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error submitting feedback:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit feedback" },
      { status: 500 }
    );
  }
}

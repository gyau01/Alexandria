import { createClient as createServerClient } from "../../../../supabase/server";
import { NextResponse } from "next/server";
import sanitizeHtml from "sanitize-html";

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, title, content, status } = await req.json();

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }
  if (typeof content !== "string") {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }
  if (status !== "draft" && status !== "published") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const cleanContent = sanitizeHtml(content);

  const { data: subData, error: subError } = await supabase
    .from("users")
    .select("subscription")
    .eq("id", user.id)
    .single();
  if (subError || !subData) {
    return NextResponse.json({ error: "Error checking sub level" }, { status: 400 });
  }

  const sub_id = subData.subscription;
  const bit = 1 << 3;
  if ((sub_id & bit) === 0) {
    return NextResponse.json(
      { ok: false, error: "You need an active subscription to post to the community board." },
      { status: 403 }
    );
  }

  const payload = {
    user_id: user.id,
    title: title.trim(),
    content: cleanContent,
    status,
    updated_at: new Date().toISOString(),
  };

  const { data: writeData, error: writeError } = id
    ? await supabase
        .from("community_posts")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
    : await supabase.from("community_posts").insert(payload).select();

  if (writeError) {
    return NextResponse.json({ error: writeError.message }, { status: 500 });
  }
  if (id && (!writeData || writeData.length === 0)) {
    return NextResponse.json({ error: "Post not found or not yours to edit" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

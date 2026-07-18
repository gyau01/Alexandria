import { createClient } from "../../../../../supabase/server";
import { NextResponse } from "next/server";
import sanitizeHtml from "sanitize-html";
 
export async function POST(req: Request){
	const supabase = await createClient();
	const { data: { user }, error: { error_auth } } = await supabase.auth.getUser();
	
	if ( error_auth || !user ){
		return NextResponse.json({error: "error fetching profile"}, {status: 401});
	}
	
	const {created_by, title, description, poll_type, options } = await req.json();

	if ( user.id !== created_by ) {
		return NextResponse.json({error: " err: ids do not match"}, {status: 401});
	}

	if ( typeof description !== "string" && !description.trim() ) {
		return NextResponse.json({error: "description is invalid"}, {status: 400});
	}
	if ( typeof title !== "string" && !title.trim() ) {
		return NextResponse.json({error: " title is not valid"}, {status: 400});
	}
	if (!Array.isArray(options) || options.length < 2 || options.length > 20 ){
		return NextResponse.json({error: " options are not valid"}, {status: 400});
	}
	const cleanTitle = sanitizeHtml(title, {allowedTags: [], allowedAttributes: {} });

	const cleanDescription = description ? sanitizeHtml(description, { allowedTags: [], allowedAttributes: {} }) : null;
const cleanOptions = options.map((opt: unknown) => typeof opt === "string" ? sanitizeHtml(opt, { allowedTags: [], allowedAttributes: {} }).trim() : "" ).filter((opt: string) => opt.length > 0);

	if (cleanOptions.length < 2) {
    return NextResponse.json({ error: "Please provide at least 2 valid options" }, { status: 400 });
  }
	const initialVotes = cleanOptions.reduce((acc: Record<string, number>, option: string) => { 
		acc[option] = 0;
    return acc;
  }, {});

	const { data: check, error } = await supabase.from("user_usage").select("subscription").eq("id", user.id).single();

	if (error || !check ){
		return NextResponse.json({ error: "Error checking sub level" }, { status: 400 });
	}

	const sub_id = check.subscription;

	const bit = 1 << 2;

	if ((sub_id & bit)===0){
		return NextResponse.json(
      { ok: false, error: "You need an active subscription to post to the community board." },
      { status: 403 }
    );	
	}
	
	const { data, error: err } = await supabase.from("polls").insert({
		user_id: user.id,
		title: cleanTitle,
		description: cleanDescription,
		poll_type: poll_type,
		options: cleanOptions,
		votes: initialVotes,
		}).select().single();

	if (err){
		console.error("Poll insert failed:", err);
		return NextResponse.json({ error: "hey its me" }, { status: 500 });
	}

	return NextResponse.json({ ok:true })

}

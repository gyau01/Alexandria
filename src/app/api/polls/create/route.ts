import { createClient } from "../../../../../supabase/server";
import { NextResponse } from "next/server";
import sanitizeHtml from "sanitize-html";
 
export async function POST(req: Request){
	const supabase = await createClient();
	const { data: user } = await supabase.auth.getUser();
	
	if ( !user ){
		return NextResponse.json({error: "error fetching profile"}, {status: 401});
	}
	
	const {created_by, title, description, poll_type, options } = await req.json();

	if ( user.id !== id ) {
		return NextResponse.json({error: " err: ids do not match"}, {status: 401});
	}
	
	const initVotes = Array()_

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
		title: title,
		description: description,
		poll_type: poll_type,
		options: options,
		votes: 0,
		}).eq("user_id", user.id).select();

	if (err){
		return NextResponse.json({ error: err.message }, { status: 500 });
	}

	return NextResponse.json({ok:true})

}

import { createClient } from "../../../../../supabase/server";
import { NextResponse } from "next/server";
import sanitizeHtml from "sanitize-html";
 
export async function POST(req: Request){
	const supabase = await createClient();
	const { data: { user }, error: authError} = await supabase.auth.getUser();
	
	if ( authError || !user ){
		return NextResponse.json({error: "error fetching profile"}, {status: 401});
	}
	
	const {created_by, title, description, poll_type, options } = await req.json();


if (typeof title !== "string" || !title.trim()) {
  return NextResponse.json({ error: "title is not valid" }, { status: 400 });
}

let cleanDescription: string | null = null;

if (description != null ) {
	if (typeof description !== "string") {
  	return NextResponse.json({ error: "description is invalid" }, { status: 400 });
  }

	if (description.trim() === ""){
		cleanDescription = null;
	}
	else {
		cleanDescription = sanitizeHtml(description, {allowedTags: [], allowedAttributes: {},}).trim();
	}

}

if (!Array.isArray(options) || options.length < 2 || options.length > 20 ){
		return NextResponse.json({error: " options are not valid"}, {status: 400});
	}
	const cleanTitle = sanitizeHtml(title, {allowedTags: [], allowedAttributes: {} });

const cleanOptions = options
	.map((opt: unknown) => typeof opt === "string" ? sanitizeHtml(opt, { allowedTags: [], allowedAttributes: {} })
	.trim(): "" )
	.filter((opt: string) => opt.length > 0);

	if (cleanOptions.length < 2) {
    return NextResponse.json({ error: "Please provide at least 2 valid options" }, { status: 400 });
  }
	const initialVotes = cleanOptions.reduce((acc: Record<string, number>, option: string) => { 
		acc[option] = 0;
    return acc;
  }, {});

	const { data: check, error: usageError } = await supabase
		.from("users")
		.select("subscription")
		.eq("user_id", user.id)
		.single();
	
	console.log(" look at me ", {check, usageError, userId:user.id});

	if (usageError || !check ){
		console.error("error checking the usage table")
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
		return NextResponse.json({ error: "hey its me" }, { status: 500 });
	}

	return NextResponse.json({ ok:true })

}

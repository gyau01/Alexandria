"use server"
import { createClient } from "../../../supabase/server";
import { redirect } from "next/navigation";

export default async function checkSub( option: number ) {
	const supabase = await createClient();

	const { data: { user } } = await supabase.auth.getUser();

	if ( !user ) {
		return redirect("/sign-in");
	}

	const { data: active } = await supabase.from("users").select("subscription").eq("user_id",user.id).single();
	let flag: number = 0;
	const sub_id = active.toString(2);
	if (sub_id[option] === '1' ){
			flag = 1;
	}

	switch( option ) {
		case 0:
			if ( flag === 1 ){
				//allow user to access
			}
			//todo
		case 1:
			//todo
		case 2:
			//todo
		case 3:
			//todo
		default: 
			//todo
			break;
	} 

}

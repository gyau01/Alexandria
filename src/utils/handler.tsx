import { createClient } from "../../../supabase/server";
import { redirect } from "next/navigation";
import CommunityBoard from "@/components/community-board";
import PollsView from "@/components/polls-view";


export default async function CheckSub({ option }: { option: number }) {
	const supabase = await createClient();

	const { data: { user } } = await supabase.auth.getUser();

	if ( !user ) {
		return redirect("/sign-in");
	}

	const { data: active, error } = await supabase.from("users").select("subscription").eq("user_id", user.id).single();
	if (error || !active) {
 	 return <p>Could not verify subscription.</p>;
	}
	let flag: number = 0;
	const sub_id = active.subscription;

	const bit = 1 << option;

	if ( (sub_id & bit) !== 0 ){
		flag = 1;
	}

	switch( option ) {
		case 2:
			if( flag === 1 ) {
				return (
					<PollsView userId={user.id}/>
				)
			}
			else {
				//gate shit 
				return <p> please subscribe </p>;
			}
		case 3:
			if( flag ===1 ) {
				return(
					<CommunityBoard userId={user.id}/>
				)
			}
			else {
				//gate shit
				return <p> PLease subscribe</p>;
			}
						
		default: 
				return null;
	} 

}

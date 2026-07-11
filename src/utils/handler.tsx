import { createClient } from "../../supabase/server";
import { redirect } from "next/navigation";
import CommunityBoard from "@/components/community-board";
import PollsView from "@/components/polls-view";
import NoSub from "@/components/nosub";

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
			else{
				const { data } = await supabase.from("user_usage")
					.select("polls_usage")
					.eq("user_id", user.id)
					.single();

					let check = data.polls_usage

					if ( check != 0 ) {
						check -= 1;

						await supabase.from("user_usage").update({polls_usage: check })
							.eq("user_id",user.id).single();

						return (<PollsView userId={user.id}/>)
					}
					else{
						return (<NoSub/>)
					}
			}
		case 3:
			if( flag ===1 ) {
				return(
					<CommunityBoard userId={user.id}/>
				)
			}
			else {
				const { data } = await supabase.from("user_usage")
					.select("board_usage").eq("user_id", user.id).single();

					let check = data.board_usage;
					if ( check !=0 ) {
						check-=1;
						await supabase.from("board_usage").update({board_usage: check })
							.eq("user_id",user.id).single();
					}
					else {
						return <NoSub/>
					}
			}
						
		default: 
				return null;
	} 

}

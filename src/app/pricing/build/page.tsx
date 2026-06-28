"use client";

import { useState } from "react";

import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import PricingCard from "@/components/pricing-card";
import { createClient } from "../../../supabase/server";
import { supabase } from "../../supabase/supabase";
import { User } from "@supabase/supabase-js";

type Option = {
		id: number;
		name: string;
		description: string;
};

const Options: Option[] = [
		{
				id: 8,
				name: "unlimited chats",
				description: "as many chats as you want",
		},
		{
				id:4,
				name:"unlimited matching",
				description: "as many matches as you want",
		},
		{
				id:2,
				name:"10 total matches",
				description:"Up to 10 total matches",
		},
		{
				id:1,
				name:"unlimited discussion board posts",
				description:"As many discussion board posts as you want",
		},
];

const MIN = 2;
const BASE_AMOUNT = 199;


export default function makePlan ({item, user}: {item:any, user: User | null}){
	const supabase = await createClient();
	const { data: { users }} = await supabase.auth.getUser();

	const handleCheckout = async ( planKey: number )=> {
		if(!user) {
			window.location.href = "/sign-in?redirect=pricing";
			return;
		}

		try {
			const { data, error } = await supabase.functions.invoke('supabase-functions-create-checkout', {
				body: {
					plan_key: planKey,
					user_id:user.id,
					return_url:`${window.location.origin}/dashboard`,
				},
				headers: {
					'X-Customer-Email':user.email || '',
				}
			});

			if (error) {
				throw error;
			}

			if ( data?.url ) {
					window.location.href = data.url;
			}
			else {
					throw new Error('No Checkout URL returned');
			}
		}
		catch (error) {
			console.error('Error creating checkout session:',error);
		}
	};

		const hasEnough = selected.size>=MIN;
		const 

}

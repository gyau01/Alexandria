"use client";

import { useState } from "react";

import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import PricingCard from "@/components/pricing-card";
import { supabase } from "../../supabase/supabase";
import { User } from "@supabase/supabase-js";

type Option = {
		id: number;
		name: string;
		description: string;
};

const OPTIONS: Option[] = [
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


export default function MakePlan ({item, user}: {item:any, user: User | null}){
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

		const [selected, setSelected] = useState<Set<number>>(new Set());
    const toggle = (id: number) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const hasEnough = selected.size >= MIN;

    const selectedOptions = OPTIONS.filter(o => selected.has(o.id));

    const optionsTotal = selectedOptions.reduce((sum, o) => sum + o.amount, 0);

    const grandTotal = ((BASE_AMOUNT + optionsTotal) / 100).toFixed(2);

       return (
        <div>
            {/* Options grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {OPTIONS.map(option => {
                    const isSelected = selected.has(option.id);
                    return (
                        <button
                            key={option.id}
                            onClick={() => toggle(option.id)}
                            className={`text-left p-4 rounded-xl border-2 transition-all ${
                                isSelected
                                    ? "border-blue-400 bg-blue-600/20"
                                    : "border-blue-700 bg-blue-900/40 hover:border-blue-500"
                            }`}
                        >
                            <p className="text-white font-semibold">{option.name}</p>
                            <p className="text-blue-200 text-sm">{option.description}</p>
                            <p className="text-cyan-300 text-sm mt-2">
                                +${(option.amount / 100).toFixed(2)}/mo
                            </p>
                        </button>
                    );
                })}
            </div>

            {/* Total */}
            <div className="mt-6 text-white">
                <p>{selected.size} of {OPTIONS.length} selected</p>
                <p className="text-2xl font-bold">${grandTotal}/mo</p>
            </div>

            {/* Checkout button */}
            <button
                disabled={!hasEnough}
                className={`mt-4 w-full py-4 rounded-xl font-bold transition-all ${
                    hasEnough
                        ? "bg-white text-blue-700 hover:bg-blue-50"
                        : "bg-blue-800 text-blue-400 cursor-not-allowed"
                }`}
            >
                {hasEnough
                    ? "Continue to checkout"
                    : `Select ${MIN - selected.size} more to continue`
                }
            </button>
        </div>
    );
}
}

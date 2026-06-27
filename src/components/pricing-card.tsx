"use client";

import { User } from "@supabase/supabase-js";
import { Button } from "./ui/button";
import { Check, ArrowRight } from "lucide-react";
import { supabase } from "../../supabase/supabase";

export default function PricingCard({ item, user }: { item: any, user: User | null }) {
    // Handle checkout process
    const handleCheckout = async (priceId: string) => {
        if (!user) {
            // Redirect to login if user is not authenticated
            window.location.href = "/sign-in?redirect=pricing";
            return;
        }

        try {
            const { data, error } = await supabase.functions.invoke('supabase-functions-create-checkout', {
                body: {
                    price_id: priceId,
                    user_id: user.id,
                    return_url: `${window.location.origin}/dashboard`,
                },
                headers: {
                    'X-Customer-Email': user.email || '',
                }
            });

            if (error) {
                throw error;
            }

            // Redirect to Stripe checkout
            if (data?.url) {
                window.location.href = data.url;
            } else {
                throw new Error('No checkout URL returned');
            }
        } catch (error) {
            console.error('Error creating checkout session:', error);
        }
    };

    // Determine plan details based on item
    const getPlanDetails = () => {
        const price = item?.amount ? item.amount / 100 : 0;
        const name = item.name?.toLowerCase() || '';
        
        if (price === 0) {
            // Free plan
            return {
                badge: 'STARTER',
                badgeColor: 'bg-blue-600/20 text-blue-300 border-blue-400/30',
                title: 'Free',
                description: 'Perfect for exploring what Cramlyg can do',
                features: [
                    'Unlimited study matching',
                    'Basic study preferences',
                    'Find study partners',
                    'Messaging with matches'
                ]
            };
        }
				else if (price === 1.99 || price === 199 || name.includes('basic')) {
            // Basic plan ($1.99)
            return {
                badge: 'BASIC',
                badgeColor: 'bg-blue-600/20 text-blue-300 border-blue-400/30',
                title: 'Basic',
                description: 'Great for regular students',
                features: [
                    'All free features',
                    'Priority matching',
                    'Advanced study preferences',
                    'Study group creation'
                ]
            };
        } 
				else if (price === 2.99 || price === 299 || name.includes('basic plus') || name.includes('basic+')) {
						return {
							badge:'BASICPLUS',
							badgeColor:'bg-blue-500/30 text-blue-200 border-blue-400/50',
							title:'Basic Plus',
							description: 'Basic plus a little extra something',
							features: [
								'All of the basic features',
								'Another feature you get to choose'
							]
						};
				} 
				else if (price === 3.49 || price === 349 || name.includes('pro') || name.includes('premium')) {
            // Pro plan ($4.99)
            return {
                badge: 'PRO',
                badgeColor: 'bg-blue-500/30 text-blue-200 border-blue-400/50',
                title: 'Pro',
                description: 'Advanced features for power users',
                features: [
                    'All basic features',
                    'Unlimited priority matching',
                    'Advanced study analytics',
                    'Priority support',
                    'Study session scheduling'
                ]
            };
        }
				else {
            return {
                badge: item.name?.toUpperCase() || 'PLAN',
                badgeColor: 'bg-blue-600/20 text-blue-300 border-blue-400/30',
                title: item.name || 'Plan',
                description: item.description || 'Choose the perfect plan for your needs',
                features: item.features || [
                    'Study matching',
                    'Find study partners',
                    'Basic features'
                ]
            };
        }
    };

    const planDetails = getPlanDetails();
    const price = item?.amount ? (item.amount < 100 ? item.amount : item.amount / 100) : 0;
    const interval = item?.interval || (price === 0 ? 'forever' : 'month');
    const isPopular = item.popular || false;
    const isFree = price === 0;

    return (
        <div className={`relative rounded-2xl overflow-hidden ${
            isPopular 
                ? 'bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 border-2 border-blue-400 shadow-2xl scale-105 z-10' 
                : 'bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 border border-blue-600/50 shadow-xl'
        }`}>
            {/* Grid pattern background */}
            <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>
            
            {/* Content */}
            <div className="relative p-8 text-white">
                {/* Badge */}
                <div className="mb-6">
                    {isPopular && (
                        <div className="inline-flex items-center px-4 py-1.5 text-xs font-semibold text-white bg-blue-500/30 border border-blue-400/50 rounded-full mb-4">
                            POPULAR
                        </div>
                    )}
                    <div className={`inline-flex items-center px-4 py-1.5 text-xs font-semibold rounded-full border ${planDetails.badgeColor}`}>
                        {planDetails.badge}
                    </div>
                </div>

                {/* Title */}
                <h3 className="text-4xl font-bold mb-3">{planDetails.title}</h3>

                {/* Price */}
                <div className="mb-4">
                    <div className="flex items-baseline gap-2">
                        <span className="text-6xl font-extrabold">{isFree ? '$0' : `$${price}`}</span>
                        <span className="text-xl text-blue-200">
                            /{isFree ? 'forever' : interval}
                        </span>
                    </div>
                </div>

                {/* Description */}
                <p className="text-blue-100 mb-6 text-lg">
                    {planDetails.description}
                </p>

                {/* Features */}
                <ul className="space-y-4 mb-8">
                    {planDetails.features.map((feature: string, index: number) => (
                        <li key={index} className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Check className="h-3.5 w-3.5 text-white" />
                            </div>
                            <span className="text-blue-50">{feature}</span>
                        </li>
                    ))}
                </ul>

                {/* CTA Button */}
                <Button
                    onClick={async () => {
                        if (!isFree) {
                            await handleCheckout(item.id);
                        } else {
                            window.location.href = user ? "/dashboard" : "/sign-up";
                        }
                    }}
                    className={`w-full py-6 text-lg font-bold rounded-xl transition-all ${
                        isPopular
                            ? 'bg-white text-blue-600 hover:bg-blue-50 hover:scale-105 shadow-xl'
                            : 'bg-blue-500 hover:bg-blue-400 text-white shadow-lg hover:shadow-xl'
                    }`}
                >
                    {isFree ? 'Get Started Free' : `Start ${planDetails.title} Trial`}
                    {!isFree && <ArrowRight className="ml-2 h-5 w-5" />}
                </Button>
            </div>
        </div>
    );
}

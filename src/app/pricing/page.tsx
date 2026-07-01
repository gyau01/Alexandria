import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import PricingCard from "@/components/pricing-card";
import { createClient } from "../../../supabase/server";

export default async function Pricing() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Define pricing plans in the order: Free, $1.99, $4.99
    const defaultPlans = [
        {
            id: 'free',
            name: 'Starter',
            amount: 0,
            interval: 'forever',
            popular: false
        },
        {
            id: 'basic',
            name: 'Basic',
            amount: 199, // $1.99 in cents
            interval: 'month',
            popular: false
        },

				{
					id:'basic+',
					name:'Basic+',
					amount: 299,//2.99 in cents
					interval:'month',
					popular:true
				},
        {
            id: 'pro',
            name: 'Pro',
            amount: 349, // $3.49 in cents
            interval: 'month',
            popular: false
        }
    ];

    // Try to get plans from API, otherwise use default plans
		
    let plans;
    try {
        const { data: apiPlans } = await supabase.functions.invoke('supabase-functions-get-plans');
        plans = apiPlans || defaultPlans;
    } catch (error) {
        plans = defaultPlans;
    }

    // If no plans from API, use defaults and ensure correct order
    if (!plans || plans.length === 0) {
        plans = defaultPlans;
    } else {
        // Sort plans to ensure correct order: Free ($0), then $1.99, then $4.99
        plans.sort((a: any, b: any) => {
            const aPrice = a.amount || 0;
            const bPrice = b.amount || 0;
            return aPrice - bPrice;
        });
    }
		
		//let plans = defaultPlans;
    // Ensure we have exactly 3 plans in the correct order
    const sortedPlans = [
        plans.find((p: any) => (p.amount || 0) === 0) || defaultPlans[0],
        plans.find((p: any) => (p.amount || 0) === 199) || defaultPlans[1],
				plans.find((p: any) => (p.amount || 0) === 299) || defaultPlans[2],
        plans.find((p: any) => (p.amount || 0) === 349) || defaultPlans[3]
    ].filter(Boolean);
    
    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-blue-900 to-indigo-900">
            <Navbar />
            
            <div className="container mx-auto px-4 py-16">
                <div className="text-center mb-16">
                    <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-4">
                        Simple, Transparent <span className="bg-gradient-to-r from-blue-300 to-cyan-300 bg-clip-text text-transparent">Pricing</span>
                    </h1>
                    <p className="text-xl text-blue-200 max-w-2xl mx-auto">
                        Choose the perfect plan for your study needs
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
                    {sortedPlans.map((item: any) => (
                        <PricingCard key={item.id} item={item} user={user} />
                    ))}
                </div>
            </div>

            <Footer />
        </div>
    );
}

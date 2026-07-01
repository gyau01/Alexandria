import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno";


const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-customer-email',
}
serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
	console.log("yo man the checkout is running");

  try {
    const { plan_key: rawplankey, user_id, return_url } = await req.json();
		console.log("received body:", { rawplankey, user_id, return_url }); // add this
		const plan_key = string(rawplankey);
    console.log( "i am plan_key", plan_key ); 
    if (!plan_key || !user_id || !return_url) {
      throw new error('missing required parameters');
    }

		const products = await stripe.products.search({
				query: `metadata['plan_key']:'${plan_key}'`,
		});
		if ( products.data.length === 0 ) {
				throw new error ( `no product found for plan_key: ${plan_key}`);
		}

		const product = products.data[0];
		
		const prices = await stripe.prices.list ({
				product:product.id,
				active: true,
		});

		if(prices.data.length === 0 ) {
				throw new error (`no price found for product: ${product.id}`);
		}

		const price = prices.data[0];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${return_url}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${return_url}?canceled=true`,
      customer_email: req.headers.get('X-Customer-Email'),
      metadata: {
        user_id,
      },
    });

    return new Response(
      json.stringify({ sessionid: session.id, url: session.url }),
      {
        status: 200,
        headers: { ...corsheaders, 'content-type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('error creating checkout session:', error);
    return new Response(
      json.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsheaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

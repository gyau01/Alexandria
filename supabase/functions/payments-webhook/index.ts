import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Types
type WebhookEvent = {
  event_type: string;
  type: string;
  stripe_event_id: string;
  created_at: string;
  modified_at: string;
  data: any;
};
 
type SubscriptionData = {
  stripe_id: string;
  user_id: string;
  price_id: string;
  stripe_price_id: string;
  currency: string;
  interval: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  amount: number;
  started_at: number;
  customer_id: string;
  metadata: Record<string, any>;
  canceled_at?: number;
  ended_at?: number;
};
 
// Statuses that count as "actually subscribed" for the purposes of the
// users.subscription tier field. Anything else (incomplete, incomplete_expired,
// past_due, unpaid, canceled, paused) resolves to 0.
const ACTIVE_STATUSES = new Set(['active', 'trialing']);
 
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});
 
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
 
function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
// Utility functions
async function hasAlreadyProcessed(supabaseClient: any, eventId: string): Promise<boolean> {
  const { data, error } = await supabaseClient
    .from('webhook_events')
    .select('stripe_event_id')
    .eq('stripe_event_id', eventId)
    .maybeSingle();
 
  if (error) {
    // If the lookup itself fails, fail safe by treating it as "not yet
    // processed" — better to risk a rare double-process than to silently
    // drop an event because of a transient read error.
    console.error('Error checking for duplicate event:', error);
    return false;
  }
 
  return !!data;
}
 
async function logAndStoreWebhookEvent(
  supabaseClient: any,
  event: any,
  data: any
): Promise<void> {
  const { error } = await supabaseClient
    .from('webhook_events')
    .insert({
      event_type: event.type,
      type: event.type.split('.')[0],
      stripe_event_id: event.id,
      created_at: new Date(event.created * 1000).toISOString(),
      modified_at: new Date(event.created * 1000).toISOString(),
      data,
    } as WebhookEvent);
 
  if (error) {
    console.error('Error logging webhook event:', error);
    throw error;
  }
}
 
async function updateSubscriptionStatus(
  supabaseClient: any,
  stripeId: string,
  status: string
): Promise<void> {
  const { error } = await supabaseClient
    .from('subscriptions')
    .update({ status })
    .eq('stripe_id', stripeId);
 
  if (error) {
    console.error('Error updating subscription status:', error);
    throw error;
  }
}

function resolvePlanValue(status: string, planKey: string | undefined): number {
  if (!ACTIVE_STATUSES.has(status)) return 0;
  if (!planKey) return 0;
 
  const parsed = parseInt(planKey, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

async function getPlanKeyFromSubscription(subscription: any): Promise<string | undefined> {
  const priceId = subscription.items?.data?.[0]?.price?.id;
  if (!priceId) return undefined;
 
  const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });
  const product = price.product as Stripe.Product;
  return product?.metadata?.plan_key;
}
 
async function setUserSubscriptionTier(
  supabaseClient: any,
  userId: string,
  tier: number
): Promise<{ error: any }> {
  return await supabaseClient
    .from('users')
    .update({ subscription: tier })
    .eq('id', userId);
}

async function resolveUserId(supabaseClient: any, subscription: any): Promise<string | null> {
  const metadataUserId = subscription.metadata?.user_id || subscription.metadata?.userId;
  if (metadataUserId) return metadataUserId;
 
  try {
    const customer = await stripe.customers.retrieve(subscription.customer);
    if (customer.deleted) return null;
 
    const { data: userData } = await supabaseClient
      .from('users')
      .select('id')
      .eq('email', (customer as Stripe.Customer).email)
      .maybeSingle();
 
    return userData?.id ?? null;
  } catch (error) {
    console.error('Unable to resolve user from customer:', error);
    return null;
  }
}
// Event handlers
async function handleSubscriptionCreated(supabaseClient: any, event: any) {
  const subscription = event.data.object;
  console.log('Handling subscription created:', subscription.id);
 
  const userId = await resolveUserId(supabaseClient, subscription);
  if (!userId) {
    console.error('Unable to find associated user for subscription:', subscription.id);
    return jsonResponse({ error: 'Unable to find associated user' }, 400);
  }
 
  const planKey = await getPlanKeyFromSubscription(subscription);
 
  const subscriptionData: SubscriptionData = {
    stripe_id: subscription.id,
    user_id: userId,
    price_id: subscription.items.data[0]?.price.id,
    stripe_price_id: subscription.items.data[0]?.price.id,
    currency: subscription.currency,
    interval: subscription.items.data[0]?.plan.interval,
    status: subscription.status,
    current_period_start: subscription.current_period_start,
    current_period_end: subscription.current_period_end,
    cancel_at_period_end: subscription.cancel_at_period_end,
    amount: subscription.items.data[0]?.plan.amount ?? 0,
    started_at: subscription.start_date ?? Math.floor(Date.now() / 1000),
    customer_id: subscription.customer,
    metadata: subscription.metadata || {},
    canceled_at: subscription.canceled_at,
    ended_at: subscription.ended_at,
  };
 
  const { data: existingSubscription } = await supabaseClient
    .from('subscriptions')
    .select('id')
    .eq('stripe_id', subscription.id)
    .maybeSingle();
 
  const { error: subError } = await supabaseClient
    .from('subscriptions')
    .upsert(
      { ...(existingSubscription?.id ? { id: existingSubscription.id } : {}), ...subscriptionData },
      { onConflict: 'stripe_id' }
    );
 
  if (subError) {
    console.error('Error creating subscription:', subError);
    return jsonResponse({ error: 'Failed to create subscription' }, 500);
  }
 
  const tier = resolvePlanValue(subscription.status, planKey);
  const { error: userError } = await setUserSubscriptionTier(supabaseClient, userId, tier);
 
  if (userError) {
    console.error('Error updating user subscription tier:', userError);
    return jsonResponse({ error: 'Failed to update user subscription tier' }, 500);
  }
 
  return jsonResponse({ message: 'Subscription created successfully', tier }, 200);
}
 
async function handleSubscriptionUpdated(supabaseClient: any, event: any) {
  const subscription = event.data.object;
  console.log('Handling subscription updated:', subscription.id);
 
  const { error } = await supabaseClient
    .from('subscriptions')
    .update({
      status: subscription.status,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      metadata: subscription.metadata,
      canceled_at: subscription.canceled_at,
      ended_at: subscription.ended_at,
    })
    .eq('stripe_id', subscription.id);
 
  if (error) {
    console.error('Error updating subscription:', error);
    return jsonResponse({ error: 'Failed to update subscription' }, 500);
  }
 
  // Keep users.subscription in sync with the subscription's current status.
  // This handles renewals, upgrades/downgrades (plan_key changes), and
  // status transitions like active -> past_due -> canceled.
  const userId = await resolveUserId(supabaseClient, subscription);
  if (userId) {
    const planKey = await getPlanKeyFromSubscription(subscription);
    const tier = resolvePlanValue(subscription.status, planKey);
 
    const { error: userError } = await setUserSubscriptionTier(supabaseClient, userId, tier);
    if (userError) {
      console.error('Error updating user subscription tier on update:', userError);
      return jsonResponse({ error: 'Failed to update user subscription tier' }, 500);
    }
  } else {
    console.error('Unable to resolve user while updating subscription tier:', subscription.id);
    // Not returning an error here — the subscriptions table write already
    // succeeded, and failing to resolve a user shouldn't cause Stripe to
    // retry this event indefinitely.
  }
 
  return jsonResponse({ message: 'Subscription updated successfully' }, 200);
}
 
async function handleSubscriptionDeleted(supabaseClient: any, event: any) {
  const subscription = event.data.object;
  console.log('Handling subscription deleted:', subscription.id);
 
  try {
    await updateSubscriptionStatus(supabaseClient, subscription.id, 'canceled');
 
    // Reset the user's subscription tier back to 0 (not subscribed).
    const userId = await resolveUserId(supabaseClient, subscription);
    if (userId) {
      const { error: userError } = await setUserSubscriptionTier(supabaseClient, userId, 0);
      if (userError) {
        console.error('Error resetting user subscription tier:', userError);
        return jsonResponse({ error: 'Failed to reset user subscription tier' }, 500);
      }
    } else {
      console.error('Unable to resolve user while deleting subscription:', subscription.id);
    }
 
    return jsonResponse({ message: 'Subscription deleted successfully' }, 200);
  } catch (error) {
    console.error('Error deleting subscription:', error);
    return jsonResponse({ error: 'Failed to process subscription deletion' }, 500);
  }
}
 
async function handleCheckoutSessionCompleted(supabaseClient: any, event: any) {
  const session = event.data.object;
  console.log('Handling checkout session completed:', session.id);
 
  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id;
 
  if (!subscriptionId) {
    console.log('No subscription ID found in checkout session');
    return jsonResponse({ message: 'No subscription in checkout session' }, 200);
  }
 
  // NOTE: no metadata-copying or subscription retrieval/update happens here
  // anymore. If you set metadata via `subscription_data.metadata` at
  // Checkout Session creation time, Stripe already places that metadata
  // directly on the Subscription object — so customer.subscription.created
  // (handled above) already has everything it needs. This handler is now
  // just a hook point for anything specific to the checkout event itself
  // (e.g. one-time analytics, promo code tracking, confirmation emails).
 
  return jsonResponse({ message: 'Checkout session completed', subscriptionId }, 200);
}
 
async function handleInvoicePaymentSucceeded(supabaseClient: any, event: any) {
  const invoice = event.data.object;
  console.log('Handling invoice payment succeeded:', invoice.id);
 
  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription?.id;
 
  try {
    const { data: subscription } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('stripe_id', subscriptionId)
      .maybeSingle();
 
    const webhookData = {
      event_type: event.type,
      type: 'invoice',
      stripe_event_id: event.id,
      data: {
        invoiceId: invoice.id,
        subscriptionId,
        amountPaid: String(invoice.amount_paid / 100),
        currency: invoice.currency,
        status: 'succeeded',
        email: subscription?.email || invoice.customer_email,
      },
    };
 
    await supabaseClient.from('webhook_events').insert(webhookData);
 
    return jsonResponse({ message: 'Invoice payment succeeded' }, 200);
  } catch (error) {
    console.error('Error processing successful payment:', error);
    return jsonResponse({ error: 'Failed to process successful payment' }, 500);
  }
}
 
async function handleInvoicePaymentFailed(supabaseClient: any, event: any) {
  const invoice = event.data.object;
  console.log('Handling invoice payment failed:', invoice.id);
 
  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription?.id;
 
  try {
    const { data: subscription } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('stripe_id', subscriptionId)
      .maybeSingle();
 
    const webhookData = {
      event_type: event.type,
      type: 'invoice',
      stripe_event_id: event.id,
      data: {
        invoiceId: invoice.id,
        subscriptionId,
        amountDue: String(invoice.amount_due / 100),
        currency: invoice.currency,
        status: 'failed',
        email: subscription?.email || invoice.customer_email,
      },
    };
 
    await supabaseClient.from('webhook_events').insert(webhookData);
 
    if (subscriptionId) {
      await updateSubscriptionStatus(supabaseClient, subscriptionId, 'past_due');
 
      // past_due is not an "active" status, so drop the user's tier to 0
      // until payment succeeds again (invoice.payment_succeeded /
      // customer.subscription.updated will restore it).
      if (subscription?.user_id) {
        const { error: userError } = await setUserSubscriptionTier(supabaseClient, subscription.user_id, 0);
        if (userError) {
          console.error('Error zeroing out user subscription tier after failed payment:', userError);
        }
      }
    }
 
    return jsonResponse({ message: 'Invoice payment failed' }, 200);
  } catch (error) {
    console.error('Error processing failed payment:', error);
    return jsonResponse({ error: 'Failed to process failed payment' }, 500);
  }
}
 
// Main webhook handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
 
  try {
    const signature = req.headers.get('stripe-signature');
 
    if (!signature) {
      return jsonResponse({ error: 'No signature found' }, 400);
    }
 
    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
 
    if (!webhookSecret) {
      return jsonResponse({ error: 'Webhook secret not configured' }, 500);
    }
 
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error('Error verifying webhook signature:', err);
      return jsonResponse({ error: 'Invalid signature' }, 400);
    }
 
    console.log('Processing webhook event:', event.type, event.id);
 
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
 
    // Idempotency guard: skip processing entirely if we've already logged
    // this exact event.id before. Requires a UNIQUE constraint on
    // webhook_events.stripe_event_id in your database schema.
    if (await hasAlreadyProcessed(supabaseClient, event.id)) {
      console.log('Duplicate event, skipping:', event.id);
      return jsonResponse({ message: 'Event already processed' }, 200);
    }
 
    // Log the webhook event
    await logAndStoreWebhookEvent(supabaseClient, event, event.data.object);
 
    // Handle the event based on type
    switch (event.type) {
      case 'customer.subscription.created':
        return await handleSubscriptionCreated(supabaseClient, event);
      case 'customer.subscription.updated':
        return await handleSubscriptionUpdated(supabaseClient, event);
      case 'customer.subscription.deleted':
        return await handleSubscriptionDeleted(supabaseClient, event);
      case 'checkout.session.completed':
        return await handleCheckoutSessionCompleted(supabaseClient, event);
      case 'invoice.payment_succeeded':
        return await handleInvoicePaymentSucceeded(supabaseClient, event);
      case 'invoice.payment_failed':
        return await handleInvoicePaymentFailed(supabaseClient, event);
      default:
        console.log(`Unhandled event type: ${event.type}`);
        return jsonResponse({ message: `Unhandled event type: ${event.type}` }, 200);
    }
  } catch (err) {
    console.error('Error processing webhook:', err);
    return jsonResponse({ error: err.message }, 500);
  }
});

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const config = { api: { bodyParser: false } };

async function getRawBody(req: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const setPlan = async (userId: string, plan: 'premium' | 'free') => {
  await supabase.from('profiles').update({ plan }).eq('id', userId);
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end();

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  const obj = event.data.object as any;

  switch (event.type) {
    case 'checkout.session.completed': {
      const userId = obj.metadata?.userId;
      if (userId) await setPlan(userId, 'premium');
      break;
    }
    case 'customer.subscription.deleted':
    case 'customer.subscription.paused': {
      const userId = obj.metadata?.userId;
      if (userId) await setPlan(userId, 'free');
      break;
    }
    case 'customer.subscription.resumed':
    case 'invoice.payment_succeeded': {
      const userId = obj.metadata?.userId || obj.subscription_details?.metadata?.userId;
      if (userId) await setPlan(userId, 'premium');
      break;
    }
    case 'invoice.payment_failed':
      console.log('Payment failed:', obj.id);
      break;
  }

  res.status(200).json({ received: true });
}

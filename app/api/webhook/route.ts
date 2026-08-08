import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const PLANO_MAP: Record<string, string> = {
  'price_1TqKzx5rqO1GLGXfhQgBRbW9': 'basico',
  'price_1TqKzy5rqO1GLGXf8T2csNSm': 'profissional',
  'price_1TqKzy5rqO1GLGXfazg0wfYa': 'enterprise',
};

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe keys not configured' }, { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
  const sig = req.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Webhook error';
    console.error('Webhook signature error:', msg);
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  const supabase = createServiceClient();
  const obj = event.data.object;
  const appUrl = process.env.APP_URL ?? 'https://to-plataforma.vercel.app';

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = obj as unknown as Stripe.Checkout.Session;
        const clinicId = session.metadata?.clinic_id;
        const plano = session.metadata?.plano ?? 'basico';
        if (clinicId) {
          await supabase.from('clinics').update({
            plano,
            status: 'ativo',
          }).eq('id', clinicId);

          const email = session.customer_details?.email;
          if (email && process.env.RESEND_API_KEY) {
            const internalHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
            if (process.env.INTERNAL_API_SECRET) {
              internalHeaders['x-internal-secret'] = process.env.INTERNAL_API_SECRET;
            }
            fetch(`${appUrl}/api/email`, {
              method: 'POST',
              headers: internalHeaders,
              body: JSON.stringify({ type: 'payment_confirmed', to: email, plano }),
            }).catch(() => {});
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = obj as unknown as Stripe.Subscription;
        const clinicId = sub.metadata?.clinic_id;
        const priceId = sub.items?.data?.[0]?.price?.id;
        const plano = PLANO_MAP[priceId ?? ''] ?? 'basico';
        const status = sub.status === 'active' ? 'ativo'
          : sub.status === 'past_due' ? 'suspenso'
          : sub.status === 'canceled' ? 'cancelado'
          : sub.status;
        if (clinicId) {
          await supabase.from('clinics').update({ plano, status }).eq('id', clinicId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = obj as unknown as Stripe.Subscription;
        const clinicId = sub.metadata?.clinic_id;
        if (clinicId) {
          await supabase.from('clinics').update({ status: 'cancelado' }).eq('id', clinicId);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = obj as unknown as Stripe.Invoice;
        if (typeof invoice.subscription === 'string') {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
          const clinicId = subscription.metadata?.clinic_id;
          if (clinicId) {
            await supabase.from('clinics').update({ status: 'suspenso' }).eq('id', clinicId);
          }
        }
        break;
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ received: true });
}

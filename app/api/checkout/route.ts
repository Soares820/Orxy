import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const PRICES: Record<string, string> = {
  basico:       'price_1TqKzx5rqO1GLGXfhQgBRbW9',
  profissional: 'price_1TqKzy5rqO1GLGXf8T2csNSm',
  enterprise:   'price_1TqKzy5rqO1GLGXfazg0wfYa',
};

async function verifyAuth(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const { createServiceClient } = await import('@/lib/supabase');
  try {
    const sb = createServiceClient();
    const { data: { user } } = await sb.auth.getUser(auth.slice(7));
    return user ?? null;
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return NextResponse.json({ error: 'STRIPE_SECRET_KEY not configured' }, { status: 500 });

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
  const appUrl = process.env.APP_URL ?? 'https://to-plataforma.vercel.app';

  let body: { plano?: string; clinic_id?: string; email?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { plano, clinic_id, email } = body;
  if (!plano || !PRICES[plano]) {
    return NextResponse.json({ error: 'Plano inválido. Use: basico, profissional ou enterprise' }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: PRICES[plano], quantity: 1 }],
      success_url: `${appUrl}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/?payment=cancelled`,
      customer_email: email ?? undefined,
      metadata: { clinic_id: clinic_id ?? '', plano },
      subscription_data: { metadata: { clinic_id: clinic_id ?? '', plano }, trial_period_days: 14 },
      locale: 'pt-BR',
    });
    return NextResponse.json({ url: session.url, session_id: session.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stripe error';
    console.error('Stripe checkout error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}

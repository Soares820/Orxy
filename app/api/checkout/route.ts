import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceClient } from '@/lib/supabase';

const PRICES: Record<string, string> = {
  basico:       'price_1TqKzx5rqO1GLGXfhQgBRbW9',
  profissional: 'price_1TqKzy5rqO1GLGXf8T2csNSm',
  enterprise:   'price_1TqKzy5rqO1GLGXfazg0wfYa',
};

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return NextResponse.json({ error: 'STRIPE_SECRET_KEY not configured' }, { status: 500 });

  let body: { plano?: string; clinic_id?: string; email?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { plano, clinic_id, email } = body;
  if (!plano || !PRICES[plano]) {
    return NextResponse.json({ error: 'Plano inválido. Use: basico, profissional ou enterprise' }, { status: 400 });
  }
  if (!clinic_id) return NextResponse.json({ error: 'clinic_id é obrigatório' }, { status: 400 });

  const sb = createServiceClient();
  let user;
  try {
    const { data } = await sb.auth.getUser(auth.slice(7));
    user = data.user;
  } catch { user = null; }
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  // Só admin da própria clínica pode alterar o plano de cobrança dela
  const { data: userRecord } = await sb
    .from('users')
    .select('clinic_id, role')
    .eq('auth_id', user.id)
    .single();
  if (!userRecord || userRecord.clinic_id !== clinic_id) {
    return NextResponse.json({ error: 'Sem permissão para gerenciar cobrança desta clínica' }, { status: 403 });
  }
  if (userRecord.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas administradores podem alterar o plano' }, { status: 403 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
  const appUrl = process.env.APP_URL ?? 'https://to-plataforma.vercel.app';

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

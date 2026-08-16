import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function escapeHtml(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

async function verifyInternal(req: NextRequest): Promise<boolean> {
  // Aceita chamadas internas do próprio servidor (webhook, etc.) via secret
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (internalSecret) {
    const h = req.headers.get('x-internal-secret');
    if (h === internalSecret) return true;
  }
  // Aceita usuários autenticados via Supabase JWT
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    const { createServiceClient } = await import('@/lib/supabase');
    try {
      const sb = createServiceClient();
      const { data: { user } } = await sb.auth.getUser(auth.slice(7));
      if (user) return true;
    } catch { /* fall through */ }
  }
  return false;
}

export async function POST(req: NextRequest) {
  const authorized = await verifyInternal(req);
  if (!authorized) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { type, to, name, clinicName, plano } = body;
  if (!to || !type) return NextResponse.json({ error: 'Missing to or type' }, { status: 400 });

  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRx.test(String(to))) return NextResponse.json({ error: 'Endereço de email inválido' }, { status: 400 });

  const appUrl = process.env.APP_URL ?? 'https://to-plataforma.vercel.app';
  const safeName = escapeHtml(name);
  const safeClinic = escapeHtml(clinicName);
  const safePlano = escapeHtml(plano);
  const firstName = safeName ? safeName.split(' ')[0] : 'terapeuta';

  type Template = { subject: string; html: string };
  const templates: Record<string, Template> = {
    welcome: {
      subject: `Bem-vindo(a) à ORYX, ${firstName}! 🎉`,
      html: `<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#0D1526;color:#fff;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#2563EB,#7C3AED);padding:32px 28px;text-align:center">
          <div style="font-size:28px;font-weight:900;letter-spacing:-1px">ORYX</div>
          <div style="font-size:13px;opacity:.8;margin-top:4px">Software para Terapia ABA</div>
        </div>
        <div style="padding:32px 28px">
          <h2 style="font-size:22px;font-weight:800;margin:0 0 12px">Olá, ${firstName}! 👋</h2>
          <p style="color:rgba(255,255,255,.75);line-height:1.6;margin:0 0 20px">Sua conta em <strong>${safeClinic || 'sua clínica'}</strong> foi criada com sucesso. Você tem <strong>14 dias grátis</strong> para explorar tudo que o sistema oferece.</p>
          <div style="background:rgba(255,255,255,.06);border-radius:12px;padding:16px;margin-bottom:24px">
            <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;margin-bottom:10px">O que você pode fazer agora</div>
            <div style="font-size:14px;color:rgba(255,255,255,.85);line-height:2">✅ Cadastrar pacientes e famílias<br>✅ Agendar sessões e atendimentos<br>✅ Registrar evoluções e avaliações<br>✅ Controle financeiro e contratos<br>✅ Relatórios e BI clínico</div>
          </div>
          <a href="${appUrl}" style="display:block;background:linear-gradient(135deg,#2563EB,#7C3AED);color:#fff;text-align:center;padding:14px;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none">Acessar o sistema →</a>
        </div>
        <div style="padding:20px 28px;border-top:1px solid rgba(255,255,255,.08);font-size:12px;color:rgba(255,255,255,.4);text-align:center">ORYX · Suporte: suporte@vero.app</div>
      </div>`,
    },
    trial_ending: {
      subject: `Seu trial acaba em 3 dias — garanta seu plano, ${firstName}`,
      html: `<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#0D1526;color:#fff;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#f59e0b,#ef4444);padding:32px 28px;text-align:center">
          <div style="font-size:28px;font-weight:900">⏰ 3 dias restantes</div>
          <div style="font-size:13px;opacity:.8;margin-top:4px">Seu trial gratuito está acabando</div>
        </div>
        <div style="padding:32px 28px">
          <h2 style="font-size:20px;font-weight:800;margin:0 0 12px">Não perca o acesso ao sistema</h2>
          <p style="color:rgba(255,255,255,.75);line-height:1.6;margin:0 0 24px">Seu trial de 14 dias termina em breve. Para continuar acessando todos os recursos e dados de seus pacientes, escolha um plano.</p>
          <a href="${appUrl}/#upgrade" style="display:block;background:linear-gradient(135deg,#2563EB,#7C3AED);color:#fff;text-align:center;padding:14px;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none">Ver planos e preços →</a>
        </div>
      </div>`,
    },
    payment_confirmed: {
      subject: `Pagamento confirmado! Bem-vindo ao plano ${safePlano} 🎊`,
      html: `<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#0D1526;color:#fff;border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#10b981,#2563EB);padding:32px 28px;text-align:center">
          <div style="font-size:48px">✅</div>
          <div style="font-size:22px;font-weight:900;margin-top:8px">Pagamento confirmado!</div>
        </div>
        <div style="padding:32px 28px">
          <p style="color:rgba(255,255,255,.75);line-height:1.6;margin:0 0 20px">Obrigado por assinar o plano <strong>${safePlano}</strong>. Sua assinatura está ativa e você tem acesso completo à plataforma.</p>
          <a href="${appUrl}" style="display:block;background:linear-gradient(135deg,#10b981,#2563EB);color:#fff;text-align:center;padding:14px;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none">Acessar o sistema →</a>
        </div>
      </div>`,
    },
  };

  const tpl = templates[String(type)];
  if (!tpl) return NextResponse.json({ error: `Unknown email type: ${type}` }, { status: 400 });

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'ORYX <noreply@vero.app>', to: [to], subject: tpl.subject, html: tpl.html }),
    });
    const responseData = await r.json() as { id?: string; message?: string };
    if (!r.ok) throw new Error(responseData.message ?? 'Resend error');
    return NextResponse.json({ ok: true, id: responseData.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Email error';
    console.error('Email error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

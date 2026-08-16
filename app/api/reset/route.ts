import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const APP_URL = process.env.APP_URL ?? 'https://to-plataforma.vercel.app';

function buildEmailHtml(recoveryUrl: string, email: string): string {
  return `
    <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;background:#0D1526;color:#fff;border-radius:16px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#2563EB,#7C3AED);padding:28px;text-align:center">
        <div style="font-size:22px;font-weight:900">ORYX</div>
        <div style="font-size:12px;opacity:.8;margin-top:4px">Redefinição de senha</div>
      </div>
      <div style="padding:28px">
        <p style="color:rgba(255,255,255,.75);line-height:1.6;margin:0 0 20px">
          Recebemos uma solicitação para redefinir a senha de <strong>${email}</strong>.
          Clique no botão abaixo para criar uma nova senha.
        </p>
        <a href="${recoveryUrl}" style="display:block;background:linear-gradient(135deg,#2563EB,#7C3AED);color:#fff;text-align:center;padding:14px;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none">
          Redefinir minha senha →
        </a>
        <p style="font-size:11px;color:rgba(255,255,255,.3);margin-top:16px;text-align:center">
          Se não solicitou a redefinição, ignore este e-mail com segurança.
        </p>
      </div>
    </div>`;
}

export async function POST(req: NextRequest) {
  let email: string;
  try {
    const body = await req.json();
    email = String(body.email ?? '').trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  if (!email) return NextResponse.json({ error: 'E-mail obrigatório' }, { status: 400 });

  const supabase = createServiceClient();

  // generateLink com admin bypassa o allowlist do Supabase dashboard
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${APP_URL}/reset-password` },
  });

  if (error) {
    // Usuário não encontrado: ainda retorna sucesso (segurança — não revelar se email existe)
    console.error('generateLink error:', error.message);
    return NextResponse.json({ ok: true });
  }

  const recoveryUrl = data?.properties?.action_link;
  if (!recoveryUrl) return NextResponse.json({ ok: true });

  // Envia via Resend se disponível
  if (process.env.RESEND_API_KEY) {
    const fromAddr = process.env.RESEND_FROM ?? 'ORYX <onboarding@resend.dev>';
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddr,
        to: [email],
        subject: 'Redefinir sua senha — ORYX',
        html: buildEmailHtml(recoveryUrl, email),
      }),
    });
  }

  return NextResponse.json({ ok: true });
}

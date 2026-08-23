import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function escapeHtml(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

export async function POST(req: NextRequest) {
  let body: { message?: string; user?: string; email?: string; clinic?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { message, user, email, clinic } = body;
  if (!message?.trim()) return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 });
  if (message.length > 5000) return NextResponse.json({ error: 'Mensagem muito longa (máx. 5000 caracteres)' }, { status: 400 });

  const to = process.env.SUPPORT_EMAIL ?? 'cleberflip@gmail.com';
  const from = process.env.RESEND_FROM ?? 'ORYX Suporte <onboarding@resend.dev>';

  const safeUser = escapeHtml(user);
  const safeEmail = escapeHtml(email);
  const safeClinic = escapeHtml(clinic);
  const safeMessage = escapeHtml(message);

  const html = `
    <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#0D1526;color:#fff;border-radius:16px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#2563EB,#7C3AED);padding:24px 28px">
        <div style="font-size:20px;font-weight:900">ORYX — Nova mensagem de suporte</div>
      </div>
      <div style="padding:28px">
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px">
          <tr><td style="color:rgba(255,255,255,.5);padding:6px 0;width:80px">Usuário</td><td style="color:#fff;font-weight:600">${safeUser || '—'}</td></tr>
          <tr><td style="color:rgba(255,255,255,.5);padding:6px 0">Email</td><td style="color:#fff">${safeEmail || '—'}</td></tr>
          <tr><td style="color:rgba(255,255,255,.5);padding:6px 0">Clínica</td><td style="color:#fff">${safeClinic || '—'}</td></tr>
        </table>
        <div style="background:rgba(255,255,255,.06);border-left:3px solid #2563EB;border-radius:0 12px 12px 0;padding:16px 18px;font-size:15px;line-height:1.7;white-space:pre-wrap">${safeMessage}</div>
      </div>
    </div>`;

  if (process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject: `[Suporte ORYX] ${user ?? 'Usuário'} — ${clinic ?? ''}`, html }),
    });
    if (!res.ok) {
      console.error('Resend support error:', await res.json().catch(() => ({})));
      return NextResponse.json({ error: 'Falha ao enviar' }, { status: 500 });
    }
  } else {
    console.log('[SUPPORT]', { user, email, clinic, message });
  }

  return NextResponse.json({ ok: true });
}

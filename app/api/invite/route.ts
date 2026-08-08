import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const VALID_ROLES = ['admin', 'terapeuta', 'recepcao', 'financeiro'];

function escapeHtml(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
}

async function verifyAuth(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const supabase = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}

export async function POST(req: NextRequest) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { clinic_id, email, nome, cargo, role, invited_by } = body;

  if (!clinic_id || !email || !nome) {
    return NextResponse.json({ error: 'clinic_id, email e nome são obrigatórios' }, { status: 400 });
  }
  if (typeof nome !== 'string' || nome.length > 100) return NextResponse.json({ error: 'nome inválido' }, { status: 400 });
  if (role && !VALID_ROLES.includes(String(role))) return NextResponse.json({ error: 'role inválido' }, { status: 400 });

  const supabase = createServiceClient();

  // Verifica que o usuário autenticado pertence à clinic_id informada
  const { data: userRecord } = await supabase
    .from('users')
    .select('clinic_id, role')
    .eq('auth_id', user.id)
    .single();
  if (!userRecord || userRecord.clinic_id !== clinic_id) {
    return NextResponse.json({ error: 'Sem permissão para convidar nesta clínica' }, { status: 403 });
  }
  if (userRecord.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas administradores podem convidar membros' }, { status: 403 });
  }
  const appUrl = process.env.APP_URL ?? 'https://to-plataforma.vercel.app';

  try {
    // Check if this clinic already has this email registered
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('clinic_id', clinic_id)
      .eq('email', email)
      .single();
    if (existing) return NextResponse.json({ error: 'Este email já está cadastrado nesta clínica.' }, { status: 409 });

    // Generate invite link via Supabase Auth Admin
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email: String(email),
      options: {
        data: { nome, cargo: cargo ?? 'Terapeuta', clinic_id, role: role ?? 'terapeuta' },
        redirectTo: `${appUrl}/register`,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      throw linkError ?? new Error('Falha ao gerar link de convite');
    }

    const inviteUrl = linkData.properties.action_link;

    // Send custom email via Resend
    if (process.env.RESEND_API_KEY) {
      const safeName = escapeHtml(nome);
      const safeBy = escapeHtml(invited_by ?? 'Sua clínica');
      const safeCargo = escapeHtml(cargo ?? 'Terapeuta');
      const html = `
        <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#0D1526;color:#fff;border-radius:16px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#2563EB,#7C3AED);padding:32px 28px;text-align:center">
            <div style="font-size:24px;font-weight:900">T.O Plataforma</div>
            <div style="font-size:13px;opacity:.8;margin-top:4px">Você foi convidado!</div>
          </div>
          <div style="padding:32px 28px">
            <h2 style="font-size:20px;font-weight:800;margin:0 0 12px">Olá, ${safeName.split(' ')[0]}!</h2>
            <p style="color:rgba(255,255,255,.75);line-height:1.6;margin:0 0 20px">
              <strong>${safeBy}</strong> convidou você para acessar a T.O Plataforma como <strong>${safeCargo}</strong>.
            </p>
            <p style="color:rgba(255,255,255,.6);font-size:13px;margin-bottom:24px">Clique abaixo para criar sua senha e acessar o sistema.</p>
            <a href="${inviteUrl}" style="display:block;background:linear-gradient(135deg,#2563EB,#7C3AED);color:#fff;text-align:center;padding:14px;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none">Aceitar convite e criar senha →</a>
            <p style="font-size:11px;color:rgba(255,255,255,.3);margin-top:16px;text-align:center">Se não esperava este email, ignore-o com segurança.</p>
          </div>
        </div>`;

      const fromAddr = process.env.RESEND_FROM ?? 'T.O Plataforma <onboarding@resend.dev>';
      const resendResp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromAddr, to: [email], subject: 'Você foi convidado para a T.O Plataforma', html }),
      });
      if (!resendResp.ok) {
        const resendErr = await resendResp.json().catch(() => ({}));
        console.error('Resend error:', resendErr);
      }
    }

    return NextResponse.json({ ok: true, message: `Convite enviado para ${email}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invite error';
    console.error('Invite error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

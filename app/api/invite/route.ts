import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const VALID_ROLES = ['admin', 'terapeuta', 'recepcao', 'financeiro', 'familia'];

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

  const { clinic_id, email, nome, cargo, role, invited_by, paciente_id } = body;

  if (!clinic_id || !email || !nome) {
    return NextResponse.json({ error: 'clinic_id, email e nome são obrigatórios' }, { status: 400 });
  }
  if (typeof nome !== 'string' || nome.length > 100) return NextResponse.json({ error: 'nome inválido' }, { status: 400 });
  if (role && !VALID_ROLES.includes(String(role))) return NextResponse.json({ error: 'role inválido' }, { status: 400 });
  if (role === 'familia' && !paciente_id) {
    return NextResponse.json({ error: 'paciente_id é obrigatório para convites de família' }, { status: 400 });
  }

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

  if (role === 'familia') {
    const { data: paciente } = await supabase
      .from('pacientes')
      .select('id')
      .eq('id', paciente_id)
      .eq('clinic_id', clinic_id)
      .single();
    if (!paciente) {
      return NextResponse.json({ error: 'Paciente não encontrado nesta clínica' }, { status: 400 });
    }
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

    // O Supabase Auth recusa gerar um convite ('invite') para um e-mail que já
    // existe em auth.users — inclusive convites antigos nunca concluídos (o
    // usuário foi criado mas nunca definiu senha). Sem isso, reenviar um
    // convite para o mesmo e-mail (ex: primeira tentativa falhou depois de
    // criar o usuário) quebra com 500 para sempre. Detecta esse caso e limpa
    // o registro órfão antes de gerar o link — nunca mexe em conta que já
    // tem e-mail confirmado ou perfil em `users` (conta real de alguém).
    const { data: authList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existingAuthUser = authList?.users.find((u) => u.email === email);
    if (existingAuthUser) {
      if (existingAuthUser.email_confirmed_at) {
        return NextResponse.json({ error: 'Este e-mail já possui uma conta ativa no sistema.' }, { status: 409 });
      }
      // Convite abandonado (usuário nunca concluiu o cadastro) — remove para poder reemitir.
      await supabase.auth.admin.deleteUser(existingAuthUser.id);
    }

    // Generate invite link via Supabase Auth Admin
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email: String(email),
      options: {
        // user_metadata é somente para exibição (nome/cargo) — NUNCA usar
        // clinic_id/role daqui como prova de convite: esses campos também
        // são graváveis pelo próprio usuário via supabase.auth.signUp()
        // no client, então qualquer um poderia forjar um clinic_id alheio
        // e se auto-provisionar como admin de outra clínica. Por isso
        // clinic_id/role de confiança vão para app_metadata logo abaixo,
        // que só a service role pode escrever (ver /api/provision).
        data: { nome, cargo: cargo ?? 'Terapeuta' },
        redirectTo: `${appUrl}/register`,
      },
    });

    if (linkError || !linkData?.properties?.hashed_token || !linkData.user) {
      throw linkError ?? new Error('Falha ao gerar link de convite');
    }

    // Grava clinic_id/role em app_metadata (não editável pelo client) —
    // é isso que /api/provision confia para vincular o convidado à clínica certa.
    const { error: metaError } = await supabase.auth.admin.updateUserById(linkData.user.id, {
      app_metadata: {
        clinic_id,
        role: role ?? 'terapeuta',
        invited: true,
        ...(role === 'familia' ? { paciente_id } : {}),
      },
    });
    if (metaError) throw metaError;

    // NÃO usar linkData.properties.action_link diretamente: é uma URL do
    // próprio Supabase que confirma e consome o token com um simples GET.
    // Se esse link for colado no WhatsApp/Telegram/etc., o bot de preview
    // do app busca a URL pra gerar o card e consome o convite sozinho,
    // sem nenhum humano clicar — a pessoa nunca chega a criar senha.
    // Por isso apontamos para uma página nossa (/accept-invite) que só
    // troca o token por sessão quando o usuário clica de verdade (bots de
    // preview não executam JavaScript).
    const inviteUrl = `${appUrl}/accept-invite?token_hash=${encodeURIComponent(linkData.properties.hashed_token)}&type=${encodeURIComponent(linkData.properties.verification_type)}`;
    let emailSent = false;
    let emailError: string | undefined;

    // Send custom email via Resend
    if (!process.env.RESEND_API_KEY) {
      emailError = 'RESEND_API_KEY não configurada no servidor.';
    } else {
      const safeName = escapeHtml(nome);
      const safeBy = escapeHtml(invited_by ?? 'Sua clínica');
      const safeCargo = escapeHtml(cargo ?? 'Terapeuta');
      const html = `
        <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#0D1526;color:#fff;border-radius:16px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#2563EB,#7C3AED);padding:32px 28px;text-align:center">
            <div style="font-size:24px;font-weight:900">ORYX</div>
            <div style="font-size:13px;opacity:.8;margin-top:4px">Você foi convidado!</div>
          </div>
          <div style="padding:32px 28px">
            <h2 style="font-size:20px;font-weight:800;margin:0 0 12px">Olá, ${safeName.split(' ')[0]}!</h2>
            <p style="color:rgba(255,255,255,.75);line-height:1.6;margin:0 0 20px">
              <strong>${safeBy}</strong> convidou você para acessar a ORYX como <strong>${safeCargo}</strong>.
            </p>
            <p style="color:rgba(255,255,255,.6);font-size:13px;margin-bottom:24px">Clique abaixo para criar sua senha e acessar o sistema.</p>
            <a href="${inviteUrl}" style="display:block;background:linear-gradient(135deg,#2563EB,#7C3AED);color:#fff;text-align:center;padding:14px;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none">Aceitar convite e criar senha →</a>
            <p style="font-size:11px;color:rgba(255,255,255,.3);margin-top:16px;text-align:center">Se não esperava este email, ignore-o com segurança.</p>
          </div>
        </div>`;

      const fromAddr = process.env.RESEND_FROM ?? 'ORYX <onboarding@resend.dev>';
      const resendResp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromAddr, to: [email], subject: 'Você foi convidado para a ORYX', html }),
      });
      if (!resendResp.ok) {
        const resendErr = await resendResp.json().catch(() => ({}));
        console.error('Resend error:', resendErr);
        emailError = resendErr?.message ?? resendErr?.name ?? `Resend retornou status ${resendResp.status}`;
      } else {
        emailSent = true;
      }
    }

    // O link de convite já foi criado e é válido mesmo se o e-mail falhar —
    // devolve inviteUrl e emailSent para o admin poder compartilhar manualmente.
    return NextResponse.json({
      ok: true,
      emailSent,
      inviteUrl,
      emailError,
      message: emailSent
        ? `Convite enviado para ${email}`
        : `Convite criado, mas o e-mail não pôde ser enviado. Compartilhe o link manualmente.`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invite error';
    console.error('Invite error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Cria clínica + perfil em public.users para usuários autenticados sem perfil
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const token = auth.slice(7);

  const supabase = createServiceClient();

  // Valida o token e obtém o usuário
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
  }

  // Checa se já existe (race condition)
  const { data: existing } = await supabase
    .from('users')
    .select('id, clinic_id, clinics(nome, plano)')
    .eq('auth_id', user.id)
    .single();

  if (existing) {
    const clinic = (existing as any).clinics;
    return NextResponse.json({ ok: true, existing: true, user: existing, clinic });
  }

  const VALID_ROLES = ['admin', 'terapeuta', 'recepcao', 'financeiro', 'familia'];

  // Usuário veio de um convite (/api/invite grava clinic_id/role/nome/cargo no user_metadata)
  // — deve entrar na clínica que o convidou, não criar uma nova.
  const inviteClinicId = user.user_metadata?.clinic_id as string | undefined;
  if (inviteClinicId) {
    const { data: inviteClinic } = await supabase
      .from('clinics')
      .select('*')
      .eq('id', inviteClinicId)
      .single();

    if (inviteClinic) {
      const role = VALID_ROLES.includes(user.user_metadata?.role) ? user.user_metadata.role : 'terapeuta';
      const nome = user.user_metadata?.nome ?? user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Membro';

      const { data: memberUser, error: memberErr } = await supabase
        .from('users')
        .insert({
          auth_id: user.id,
          clinic_id: inviteClinic.id,
          nome,
          email: user.email ?? '',
          role,
          cargo: user.user_metadata?.cargo ?? undefined,
          status: 'ativo',
        })
        .select()
        .single();

      if (memberErr || !memberUser) {
        return NextResponse.json({ error: 'Erro ao vincular usuário convidado: ' + memberErr?.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, existing: false, user: memberUser, clinic: inviteClinic });
    }
    // Clínica do convite não existe mais (removida) — cai para fluxo de auto-cadastro abaixo.
  }

  // Auto-cadastro (sem convite): cria clínica nova
  const clinicName = user.user_metadata?.clinic_name
    ?? user.user_metadata?.full_name
    ?? user.email?.split('@')[0]
    ?? 'Minha Clínica';

  const { data: clinic, error: clinicErr } = await supabase
    .from('clinics')
    .insert({ nome: clinicName, email: user.email, plano: 'trial', status: 'trial' })
    .select()
    .single();

  if (clinicErr || !clinic) {
    return NextResponse.json({ error: 'Erro ao criar clínica: ' + clinicErr?.message }, { status: 500 });
  }

  // Cria perfil do usuário
  const nome = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Admin';
  const role = user.user_metadata?.role === 'familiar' ? 'familia' : 'admin';

  const { data: newUser, error: userErr } = await supabase
    .from('users')
    .insert({
      auth_id: user.id,
      clinic_id: clinic.id,
      nome,
      email: user.email ?? '',
      role,
      cargo: role === 'admin' ? 'Administrador' : undefined,
      status: 'ativo',
    })
    .select()
    .single();

  if (userErr || !newUser) {
    return NextResponse.json({ error: 'Erro ao criar perfil: ' + userErr?.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, existing: false, user: newUser, clinic });
}

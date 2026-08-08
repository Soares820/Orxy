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

  // Cria clínica
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

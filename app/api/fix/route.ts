import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Endpoint temporário — resetar senha do admin diretamente pelo servidor
// Acesse: GET /api/fix?t=fix2026cleber
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('t') !== 'fix2026cleber') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no Vercel' }, { status: 500 });
  }

  // UID de arthur.cleber@hotmail.com (confirmado no Supabase dashboard)
  const UID = 'a3a60186-63d8-4395-9aff-682c7d324af8';
  const NOVA_SENHA = 'Cleber@2026';

  const res = await fetch(
    `https://ktnqsskvflqppujovvyi.supabase.co/auth/v1/admin/users/${UID}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
      },
      body: JSON.stringify({ password: NOVA_SENHA }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json({ error: data }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    mensagem: `Senha do ${data.email} alterada para: ${NOVA_SENHA}`,
    proximos_passos: 'Agora acesse /login com arthur.cleber@hotmail.com e senha Cleber@2026',
  });
}

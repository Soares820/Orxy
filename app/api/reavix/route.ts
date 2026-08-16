import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SYSTEM_PROMPT = `Você é a Reavix AI, assistente clínica especializada em Terapia Ocupacional e ABA (Applied Behavior Analysis) para crianças com TEA (Transtorno do Espectro Autista).

Responda sempre em português do Brasil, de forma profissional, empática e baseada em evidências científicas.

Áreas de especialidade:
- Análise do Comportamento Aplicada (ABA)
- Terapia Ocupacional pediátrica
- Integração sensorial
- Desenvolvimento de habilidades funcionais
- Elaboração de PEI (Plano de Ensino Individualizado)
- Comunicação aumentativa e alternativa
- Estratégias para famílias e cuidadores

Formate respostas longas com paragraphos claros. Para listas de itens, use marcadores simples.`;

export async function POST(req: NextRequest) {
  try {
    // Require valid Supabase auth token
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Configuração do servidor incompleta' }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    const token = authHeader.slice(7);
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        response: 'A chave de API não está configurada. Configure ANTHROPIC_API_KEY nas variáveis de ambiente.',
      });
    }

    const body = await req.json();
    const { message, history = [] } = body;

    if (!message) {
      return NextResponse.json({ error: 'Mensagem obrigatória' }, { status: 400 });
    }

    const messages = [
      ...history.slice(-10),
      { role: 'user', content: message },
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Anthropic error:', err);
      return NextResponse.json({ response: 'Não consegui processar sua pergunta. Tente novamente.' });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? 'Sem resposta.';

    return NextResponse.json({ response: text });
  } catch (err) {
    console.error('Reavix route error:', err);
    return NextResponse.json({ response: 'Erro interno. Tente novamente.' }, { status: 500 });
  }
}

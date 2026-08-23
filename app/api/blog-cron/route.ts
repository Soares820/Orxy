import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://sceqtztqdmflabdvrzwt.supabase.co';
const QUERIES = [
  'applied+behavior+analysis+autism+children+intervention',
  'terapia+ocupacional+TEA+crianca+brasil',
  'ABA+autism+spectrum+disorder+early+intervention',
  'sensory+integration+autism+occupational+therapy',
  'PECS+AAC+autism+communication+therapy',
  'parent+training+autism+ABA+home',
  'social+skills+autism+intervention+children',
];

interface PubMedArticle { pmid: string; title: string; authors: string; journal: string; pubdate: string; url: string; }
interface BlogPostJson { titulo: string; resumo: string; conteudo: string; categoria: string; tags: string[]; }

async function sbInsert(key: string, rows: object[]) {
  return fetch(`${SUPABASE_URL}/rest/v1/blog_posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}`, Prefer: 'return=minimal' },
    body: JSON.stringify(rows),
  });
}

async function sbExists(key: string, url: string): Promise<boolean> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts?fonte_url=eq.${encodeURIComponent(url)}&select=id`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const data = await res.json() as unknown[];
  return Array.isArray(data) && data.length > 0;
}

async function fetchPubMed(): Promise<PubMedArticle[]> {
  const query = QUERIES[Math.floor(Math.random() * QUERIES.length)];
  const searchRes = await fetch(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${query}&retmax=8&sort=date&retmode=json&datetype=pdat&reldate=60`,
    { headers: { 'User-Agent': 'TO-Plataforma/2.0 (cleberflip@gmail.com)' } }
  );
  const searchData = await searchRes.json() as { esearchresult?: { idlist?: string[] } };
  const ids = searchData.esearchresult?.idlist ?? [];
  if (!ids.length) return [];

  const summaryRes = await fetch(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.slice(0, 5).join(',')}&retmode=json`,
    { headers: { 'User-Agent': 'TO-Plataforma/2.0 (cleberflip@gmail.com)' } }
  );
  const summaryData = await summaryRes.json() as { result?: { uids?: string[]; [key: string]: unknown } };
  const result = summaryData.result ?? {};

  const articles: PubMedArticle[] = [];
  for (const id of result.uids ?? []) {
    const art = result[id] as { title?: string; authors?: { name: string }[]; source?: string; pubdate?: string } | undefined;
    if (!art?.title) continue;
    articles.push({
      pmid: id,
      title: art.title,
      authors: (art.authors ?? []).slice(0, 3).map((a) => a.name).join(', '),
      journal: art.source ?? '',
      pubdate: art.pubdate ?? '',
      url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
    });
  }
  return articles;
}

async function generatePost(article: PubMedArticle, anthropicKey: string): Promise<BlogPostJson> {
  const prompt = `Você é especialista em Terapia Ocupacional e ABA/TEA no contexto clínico brasileiro.

Com base neste artigo científico recente, crie um post de blog educativo em português do Brasil para terapeutas ocupacionais e famílias de crianças com TEA:

TÍTULO DO ARTIGO: ${article.title}
AUTORES: ${article.authors}
PERIÓDICO: ${article.journal} (${article.pubdate})
LINK: ${article.url}

Instruções:
- Escreva de forma acessível mas profissional
- Contextualize a relevância para a prática clínica no Brasil
- Inclua dica prática aplicável ao consultório ou em casa
- NÃO use markdown (sem **, *, #) — apenas texto corrido com parágrafos
- Máximo 550 palavras no conteúdo principal

Retorne SOMENTE um JSON válido neste formato exato (sem texto antes ou depois):
{
  "titulo": "Título atraente em PT-BR (máx 90 caracteres)",
  "resumo": "2 frases de resumo para preview do card (máx 180 caracteres)",
  "conteudo": "Post completo em PT-BR com 4-5 parágrafos. Sem markdown.",
  "categoria": "uma de: Pesquisa, ABA, Terapia Ocupacional, TEA, Família, Desenvolvimento",
  "tags": ["tag1", "tag2", "tag3"]
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 1200, messages: [{ role: 'user', content: prompt }] }),
  });

  const data = await response.json() as { content?: { text?: string }[] };
  const text = data.content?.[0]?.text ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Claude não retornou JSON válido');
  return JSON.parse(match[0]) as BlogPostJson;
}

export async function GET(req: NextRequest) {
  return handler(req);
}

export async function POST(req: NextRequest) {
  return handler(req);
}

async function handler(req: NextRequest) {
  const CRON_SECRET = process.env.BLOG_CRON_SECRET;
  if (!CRON_SECRET) {
    // Fail closed: an unset secret must never mean "no auth required".
    return NextResponse.json({ error: 'BLOG_CRON_SECRET not configured' }, { status: 500 });
  }
  // Accept either a manual x-cron-secret header, or the standard
  // "Authorization: Bearer $CRON_SECRET" header Vercel Cron sends
  // automatically when a CRON_SECRET env var is configured.
  const secret = req.headers.get('x-cron-secret')
    ?? req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    ?? null;
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!ANTHROPIC_KEY) return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurada' }, { status: 500 });
  if (!SUPABASE_KEY) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada' }, { status: 500 });

  try {
    const articles = await fetchPubMed();
    const results = { saved: 0, skipped: 0, errors: [] as string[], total: articles.length };

    for (const article of articles.slice(0, 3)) {
      const exists = await sbExists(SUPABASE_KEY, article.url);
      if (exists) { results.skipped++; continue; }

      try {
        const post = await generatePost(article, ANTHROPIC_KEY);
        await new Promise((r) => setTimeout(r, 800));

        const insertRes = await sbInsert(SUPABASE_KEY, [{
          titulo: post.titulo,
          resumo: post.resumo,
          conteudo: post.conteudo,
          fonte: `PubMed — ${article.journal}`,
          fonte_url: article.url,
          categoria: post.categoria ?? 'Pesquisa',
          tags: post.tags ?? [],
          publicado_em: new Date().toISOString(),
        }]);

        if (insertRes.ok) {
          results.saved++;
        } else {
          const errText = await insertRes.text();
          results.errors.push(`Insert failed: ${errText}`);
        }
      } catch (e) {
        results.errors.push(`Artigo ${article.pmid}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return NextResponse.json({ ok: true, ...results });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

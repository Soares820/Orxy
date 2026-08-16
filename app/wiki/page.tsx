'use client';

import { useState } from 'react';
import Link from 'next/link';

const NAV = [
  { id: 'visao-geral', label: 'Visão Geral', section: 'Início' },
  { id: 'como-comecar', label: 'Como Começar', section: '' },
  { id: 'dashboard', label: 'Dashboard', section: 'Módulos' },
  { id: 'pacientes', label: 'Pacientes & PEI', section: '' },
  { id: 'agenda', label: 'Agenda & Sessões', section: '' },
  { id: 'financeiro', label: 'Financeiro', section: '' },
  { id: 'bi', label: 'BI & Relatórios', section: '' },
  { id: 'equipe', label: 'Equipe', section: '' },
  { id: 'reavix', label: 'Reavix AI', section: '' },
  { id: 'familia', label: 'Portal da Família', section: '' },
  { id: 'integracoes', label: 'Integrações', section: '' },
  { id: 'perfis', label: 'Perfis de Acesso', section: 'Referência' },
  { id: 'faq', label: 'FAQ', section: '' },
];

const FAQ_ITEMS = [
  { q: 'Os dados ficam seguros?', a: 'Sim. Todos os dados são armazenados no Supabase com Row Level Security (RLS) — cada clínica acessa apenas seus próprios dados. Comunicação sempre por HTTPS e senhas nunca armazenadas em texto puro.' },
  { q: 'O que acontece quando crio um contrato?', a: 'O sistema cria automaticamente 12 meses de pagamentos previstos, calculados com base no valor por sessão × sessões semanais × 4. Você só marca como pago quando receber — o previsto já está gerado.' },
  { q: 'Como convidar um funcionário?', a: 'Vá em Equipe → "+ Convidar Funcionário". Preencha nome, email e perfil. O sistema envia email com link de acesso. O funcionário clica, cria a senha e já acessa com o perfil correto.' },
  { q: 'Como funciona o MFA (autenticação em 2 fatores)?', a: 'Acesse Minha Conta → seção MFA. Clique em "Ativar MFA", escaneie o QR Code com o Google Authenticator ou Authy, e confirme o código de 6 dígitos. Todo login pedirá o código a partir daí.' },
  { q: 'Posso exportar os dados do sistema?', a: 'Sim. Em Minha Conta → Exportar Dados você pode baixar lista de pacientes e histórico de sessões em CSV, compatível com Excel e Google Sheets.' },
  { q: 'A família vê dados financeiros da clínica?', a: 'Não. O portal da família tem acesso apenas ao progresso do filho, agenda, chat, crises e vídeos. Dados financeiros e de equipe são exclusivos do perfil Clínica.' },
  { q: 'O Google Calendar é obrigatório?', a: 'Não. A agenda interna funciona de forma independente. O Google Calendar é uma integração opcional — configure se quiser sincronizar com o calendário pessoal dos terapeutas.' },
  { q: 'Por que o BI não mostra dados?', a: 'O BI lê diretamente do banco de dados carregado no login. Se a clínica é nova, os dados estarão vazios até que pacientes, sessões e avaliações sejam cadastrados. Não há dados de demonstração após o primeiro login.' },
];

export default function WikiPage() {
  const [active, setActive] = useState('visao-geral');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  function scrollTo(id: string) {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const ni = (id: string, label: string) => (
    <a
      key={id}
      href={`#${id}`}
      onClick={(e) => { e.preventDefault(); scrollTo(id); }}
      style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 18px', fontSize: 12.5, color: active === id ? 'var(--acc)' : 'var(--t2)', textDecoration: 'none', borderLeft: `3px solid ${active === id ? 'var(--acc)' : 'transparent'}`, background: active === id ? 'var(--ag)' : 'none', fontWeight: active === id ? 600 : 400, transition: 'all .12s' }}
    >
      {label}
    </a>
  );

  return (
    <>
      <style>{`
        :root{--bg:#F8FAFC;--bg2:#FFFFFF;--bg3:#F1F5F9;--p:#1c3d7a;--acc:#3B82F6;--s:#10b981;--v:#7c3aed;--w:#f59e0b;--t1:#0F172A;--t2:#334155;--t3:#64748B;--t4:#94A3B8;--bdr:#E2E8F0;--bdr2:#CBD5E1;--ag:rgba(59,130,246,0.1);--sw:260px;}
        @media(prefers-color-scheme:dark){:root{--bg:#060C18;--bg2:#0D1829;--bg3:#0F2040;--t1:#F1F5F9;--t2:#CBD5E1;--t3:#94A3B8;--t4:#64748B;--bdr:rgba(255,255,255,0.08);--bdr2:rgba(255,255,255,0.14);--ag:rgba(59,130,246,0.18);}}
        :root[data-theme="light"]{--bg:#F8FAFC;--bg2:#FFFFFF;--bg3:#F1F5F9;--t1:#0F172A;--t2:#334155;--t3:#64748B;--t4:#94A3B8;--bdr:#E2E8F0;--bdr2:#CBD5E1;--ag:rgba(59,130,246,0.1);}
        :root[data-theme="dark"]{--bg:#060C18;--bg2:#0D1829;--bg3:#0F2040;--t1:#F1F5F9;--t2:#CBD5E1;--t3:#94A3B8;--t4:#64748B;--bdr:rgba(255,255,255,0.08);--bdr2:rgba(255,255,255,0.14);--ag:rgba(59,130,246,0.18);}
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html,body{font-family:'Inter',system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--t1);line-height:1.6;font-size:14px;}
        code{font-family:'SF Mono','Fira Code',monospace;font-size:12px;background:var(--bg3);padding:2px 6px;border-radius:4px;color:var(--v);}
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {/* SIDEBAR */}
        <aside style={{ width: 'var(--sw)', flexShrink: 0, background: 'var(--bg2)', borderRight: '1px solid var(--bdr)', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px 18px 14px', borderBottom: '1px solid var(--bdr)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 3 }}>
              <div style={{ width: 30, height: 30, background: 'linear-gradient(135deg,#1c3d7a,#3B82F6)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>ORYX</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--t4)' }}>Manual do Sistema v1.0</div>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 12, color: 'var(--t3)', textDecoration: 'none' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Voltar ao sistema
            </Link>
          </div>
          <nav style={{ padding: '10px 0', flex: 1 }}>
            {NAV.map((item, i) => (
              <div key={item.id}>
                {item.section && (
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t4)', padding: i === 0 ? '10px 18px 3px' : '16px 18px 3px' }}>{item.section}</div>
                )}
                {ni(item.id, item.label)}
              </div>
            ))}
          </nav>
        </aside>

        {/* MAIN */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {/* HERO */}
          <div style={{ background: 'linear-gradient(135deg,#060C18 0%,#0F2040 50%,#1c3d7a 100%)', padding: '52px 48px 44px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 70% 50%,rgba(59,130,246,0.18) 0%,transparent 70%)' }} />
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 600, color: '#93C5FD', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 16, position: 'relative' }}>
              ORYX · Manual do Sistema
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: '#F1F5F9', lineHeight: 1.15, letterSpacing: '-.4px', marginBottom: 10, position: 'relative' }}>
              Tudo que você precisa saber<br />para usar o sistema <span style={{ color: '#60A5FA' }}>com confiança</span>
            </h1>
            <p style={{ fontSize: 14, color: '#94A3B8', maxWidth: 480, position: 'relative', marginBottom: 26 }}>Guia completo de funcionalidades, fluxos e configurações da plataforma de gestão clínica para terapia ABA/TEA.</p>
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', position: 'relative' }}>
              {[['20+', 'Funcionalidades'], ['4', 'Perfis de acesso'], ['100%', 'Dados no Supabase']].map(([n, l]) => (
                <div key={l}><div style={{ fontSize: 24, fontWeight: 800, color: '#F1F5F9' }}>{n}</div><div style={{ fontSize: 11, color: '#64748B' }}>{l}</div></div>
              ))}
            </div>
          </div>

          {/* CONTENT */}
          <div style={{ padding: '40px 48px', maxWidth: 880 }}>

            <Section id="visao-geral" tag="Visão Geral" title="O que é o ORYX?" desc="Sistema SaaS de gestão clínica para clínicas de Terapia Ocupacional e ABA/TEA no Brasil.">
              <InfoBox>O sistema tem <strong>dois tipos de usuário</strong>: <strong>Clínica</strong> (equipe interna — admin, terapeuta, secretaria, financeiro) e <strong>Família</strong> (responsáveis). Cada perfil vê apenas o que é relevante para ele.</InfoBox>
              <ModGrid>
                <Mod icon="ib" title="Perfil Clínica" sub="Gestão completa da operação" items={['Cadastro de pacientes e prontuários','Agenda e controle de sessões','Gestão financeira e contratos','BI com indicadores operacionais','Gerenciamento da equipe']} />
                <Mod icon="ig" title="Perfil Família" sub="Acompanhamento do filho" items={['Acompanhar progresso e metas do filho','Ver agenda e histórico de sessões','Chat direto com a equipe clínica','Registrar crises e intercorrências','Acessar vídeos e materiais de apoio']} />
              </ModGrid>
            </Section>

            <Divider />

            <Section id="como-comecar" tag="Primeiros Passos" title="Como começar a usar">
              <Steps items={[
                { t: 'Criar conta da clínica', d: 'Na tela inicial clique em "Criar conta". Preencha nome da clínica, email e senha. Após o cadastro a tela de Termos de Uso é exibida — aceite para acessar o sistema.' },
                { t: 'Cadastrar os primeiros pacientes', d: 'Vá em Pacientes → "+ Novo Paciente". Preencha nome, data de nascimento, diagnóstico e responsável. O perfil é salvo imediatamente no banco de dados.' },
                { t: 'Criar contrato e pagamentos', d: 'Em Financeiro → "+ Novo Contrato". Selecione o paciente, tipo (particular/convênio), valor por sessão e sessões semanais. O sistema gera automaticamente 12 meses de pagamentos previstos.' },
                { t: 'Agendar as primeiras sessões', d: 'Em Agenda, clique em "+ Nova Sessão". Defina paciente, horário, tipo e duração.' },
                { t: 'Convidar a equipe', d: 'Em Equipe → "+ Convidar Funcionário". O sistema envia email com link para o colaborador criar a senha e acessar com o perfil correto.' },
                { t: 'Monitorar pelo BI', d: 'Em BI & Relatórios acompanhe em tempo real: pacientes ativos, taxa de presença, evolução de sessões e receita mensal.' },
              ]} />
            </Section>

            <Divider />

            <Section id="dashboard" tag="Módulo" title="Dashboard" desc="Visão geral ao entrar no sistema — diferente para cada perfil.">
              <ModGrid>
                <Mod icon="ib" title="Dashboard Clínica" sub="Central de atendimento" badge="Clínica" items={['KPIs: pacientes ativos, sessões do dia, MRR','Próximas sessões agendadas','Atividades e tarefas pendentes','Alertas de inadimplência','Acesso rápido a todos os módulos']} />
                <Mod icon="ig" title="Dashboard Família" sub="Acompanhamento do filho" badge="Família" items={['Próxima sessão agendada','Última atividade da equipe','Botão de emergência / registro de crise','Acesso direto ao chat','Notificações e avisos recentes']} />
              </ModGrid>
            </Section>

            <Divider />

            <Section id="pacientes" tag="Módulo" title="Crianças & Pacientes" desc="Cadastro completo, avaliações clínicas e metas terapêuticas (PEI).">
              <ModGrid>
                <Mod icon="ib" title="Cadastro de Pacientes" sub="Ficha clínica completa" badge="Clínica" items={['Nome, data de nascimento, diagnóstico (CID)','Dados do responsável','Terapeuta responsável vinculado','Status: ativo, pausado ou inativo','Busca, filtros']} />
                <Mod icon="ip" title="Avaliações Clínicas" sub="PEDI, PS, SPM e outros" badge="Clínica" items={['Instrumentos: PEDI-CAT, Perfil Sensorial, SPM','Scores por domínio (autocuidado, mobilidade, função social)','Histórico de avaliações por paciente','Radar de perfil sensorial']} />
                <Mod icon="ia" title="Metas / PEI" sub="Plano de Ensino Individualizado" badge="Clínica" items={['Criar metas por área terapêutica','Status: ativo, em progresso, concluído','Critério de alcance por meta','Salvas na tabela metas do banco']} />
                <Mod icon="ig" title="Progresso" sub="Evolução terapêutica" badge="Todos" items={['Gráficos de evolução por domínio','Comparação entre avaliações','Timeline de marcos alcançados','Visível para família e clínica']} />
              </ModGrid>
            </Section>

            <Divider />

            <Section id="agenda" tag="Módulo" title="Agenda & Sessões" desc="Agendamento, controle de presença e histórico de atendimentos.">
              <ModGrid>
                <Mod icon="ib" title="Agenda Visual" sub="Calendário interativo" badge="Clínica" items={['Calendário mensal e visão por dia','Sessões coloridas por status','Painel lateral com sessões do dia','Filtro por terapeuta']} />
                <Mod icon="ig" title="Controle de Presença" sub="Confirmar e cancelar sessões" badge="Clínica" items={['Marcar sessão como realizada','Cancelar sessão','Status salvo no banco em tempo real','Histórico por paciente']} />
              </ModGrid>
            </Section>

            <Divider />

            <Section id="financeiro" tag="Módulo" title="Gestão Financeira" desc="Contratos, pagamentos, receita prevista e recebida por mês.">
              <ModGrid>
                <Mod icon="ig" title="Contratos" sub="Vínculo financeiro com paciente" badge="Clínica" items={['Tipo: particular ou convênio','Valor por sessão × sessões semanais','Dia de vencimento mensal','Ao criar, gera 12 meses de pagamentos automaticamente']} />
                <Mod icon="ia" title="Pagamentos" sub="Controle mensal por paciente" badge="Clínica" items={['Receita prevista vs recebida por mês','Status: pendente, recebido, inadimplente','% de inadimplência calculada automaticamente','Filtro por mês e tipo']} />
                <Mod icon="ib" title="Gráficos Financeiros" sub="Evolução do faturamento" badge="Clínica" items={['Barras: previsto vs recebido (últimos 6 meses)','KPIs: MRR, horas faturadas, valor/hora','Filtros por mês e tipo de contrato']} />
              </ModGrid>
            </Section>

            <Divider />

            <Section id="bi" tag="Módulo" title="BI & Relatórios" desc="Indicadores clínicos e operacionais em tempo real, filtráveis.">
              <ModGrid>
                <Mod icon="ib" title="BI da Clínica" sub="Indicadores operacionais" badge="Clínica" items={['Total de pacientes e avaliações realizadas','Taxa de presença real','Distribuição por tipo de sessão','Gráfico de evolução de sessões mês a mês','Filtro por mês']} />
                <Mod icon="ig" title="BI da Família" sub="Evolução do filho" badge="Família" items={['Gráfico de progresso nas metas do PEI','Evolução por área terapêutica','Histórico de avaliações em linha do tempo']} />
              </ModGrid>
            </Section>

            <Divider />

            <Section id="equipe" tag="Módulo" title="Equipe & Funcionários" desc="Cadastro, convites e controle de acesso por perfil.">
              <ModGrid>
                <Mod icon="in" title="Gestão de Funcionários" sub="Equipe com níveis de acesso diferenciados" badge="Clínica · Admin" full items={['Convidar por email — funcionário recebe link para criar senha','Perfis disponíveis: Administrador, Terapeuta, Secretaria, Financeiro','Cada perfil acessa apenas os módulos permitidos (isolamento por RLS no banco)','Ativar/desativar acesso sem excluir o cadastro']} />
              </ModGrid>
            </Section>

            <Divider />

            <Section id="reavix" tag="Módulo" title="Reavix AI — Assistente Clínica" desc="Inteligência artificial integrada para suporte à prática clínica.">
              <InfoBox>A Reavix usa o modelo <strong>Claude (Anthropic)</strong> com contexto clínico especializado em ABA/TEA. Requer <code>ANTHROPIC_API_KEY</code> configurada no ambiente do servidor.</InfoBox>
              <ModGrid>
                <Mod icon="ip" title="Assistente Clínica IA" sub="IA com contexto ABA/TEA" badge="Clínica" items={['Chat com IA especializada em Terapia Ocupacional','Contexto do paciente carregado automaticamente','Sugestões de atividades por perfil sensorial','Chips de sugestões rápidas pré-formatadas','Consulta de protocolos ABA']} />
                <Mod icon="ip" title="Chat 24/7" sub="Família ↔ Clínica" badge="Todos" items={['Mensagens em tempo real entre família e equipe','Histórico de conversa preservado','Família acessa pelo portal deles','Clínica responde pelo painel interno']} />
              </ModGrid>
            </Section>

            <Divider />

            <Section id="familia" tag="Módulo" title="Portal da Família" desc="Área exclusiva para responsáveis acompanharem a evolução do filho.">
              <ModGrid>
                <Mod icon="ir" title="Central de Crises" sub="Protocolo de emergência" badge="Família" items={['Botão de emergência visível no dashboard da família','Formulário com data, hora, comportamento e gatilho','Alertas enviados para a equipe clínica','Histórico de crises por paciente']} />
                <Mod icon="ia" title="Biblioteca de Vídeos" sub="Materiais por nível" badge="Família" items={['Vídeos organizados por grau de dificuldade','Atividades práticas para fazer em casa','Materiais curados pela equipe clínica']} />
              </ModGrid>
            </Section>

            <Divider />

            <Section id="integracoes" tag="Integrações" title="Conexões com serviços externos">
              <ModGrid>
                <Mod icon="ib" title="Google Calendar" sub="Opcional · Requer configuração" items={['Sincronizar sessões com Google Agenda','Admin cola o Client ID nas configurações','OAuth 2.0 — nenhuma senha armazenada']} />
                <Mod icon="ig" title="Resend (Emails)" sub="Requer API Key no Vercel" items={['Boas-vindas, trial encerrando, pagamento confirmado','Convites para funcionários','Configurar RESEND_API_KEY no Vercel']} />
                <Mod icon="ia" title="Stripe" sub="Cobrança da assinatura" items={['Cobrança mensal/anual da clínica','Webhooks para ativar/bloquear acesso','Trocar para chaves live antes do lançamento']} />
                <Mod icon="ip" title="Anthropic (Claude)" sub="IA clínica Reavix" items={['Modelo Claude para suporte clínico ABA/TEA','Configurar ANTHROPIC_API_KEY no Vercel']} />
              </ModGrid>
            </Section>

            <Divider />

            <Section id="perfis" tag="Referência" title="Perfis de Acesso" desc="O que cada perfil pode ver e fazer no sistema.">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                {[
                  { label: '🔵 Administrador', ok: ['Todos os módulos','Convidar equipe','Excluir registros','Financeiro completo','Configurações'], no: [] },
                  { label: '🟢 Terapeuta', ok: ['Agenda e sessões','Pacientes e PEI','Avaliações','Reavix AI'], no: ['Financeiro','Excluir dados'] },
                  { label: '🟡 Secretaria', ok: ['Agenda','Cadastro pacientes','Chat'], no: ['Avaliações clínicas','Financeiro completo'] },
                  { label: '🟠 Financeiro', ok: ['Contratos','Pagamentos','BI financeiro'], no: ['Prontuários','Avaliações'] },
                ].map((role) => (
                  <div key={role.label} style={{ background: 'var(--bg2)', border: '1px solid var(--bdr)', borderRadius: 11, padding: '16px 14px' }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--t1)', marginBottom: 8 }}>{role.label}</div>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {role.ok.map((p) => <li key={p} style={{ fontSize: 11, color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ color: '#10b981', fontSize: 10 }}>✓</span>{p}</li>)}
                      {role.no.map((p) => <li key={p} style={{ fontSize: 11, color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ color: 'var(--t4)', fontSize: 10 }}>✗</span>{p}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </Section>

            <Divider />

            <Section id="faq" tag="FAQ" title="Perguntas Frequentes">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {FAQ_ITEMS.map((item, i) => (
                  <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--bdr)', borderRadius: 9, overflow: 'hidden' }}>
                    <div
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      style={{ padding: '13px 16px', fontSize: 13, fontWeight: 600, color: 'var(--t1)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, userSelect: 'none' }}
                    >
                      {item.q}
                      <span style={{ color: 'var(--t4)', fontSize: 11, transition: 'transform .2s', transform: openFaq === i ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>▼</span>
                    </div>
                    {openFaq === i && (
                      <div style={{ padding: '0 16px 13px', fontSize: 12.5, color: 'var(--t3)', lineHeight: 1.6 }}>{item.a}</div>
                    )}
                  </div>
                ))}
              </div>
            </Section>

            <div style={{ height: 48 }} />
          </div>
        </main>
      </div>
    </>
  );
}

function Section({ id, tag, title, desc, children }: { id: string; tag: string; title: string; desc?: string; children?: React.ReactNode }) {
  return (
    <div id={id} style={{ marginBottom: 48, scrollMarginTop: 20 }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--acc)', marginBottom: 5 }}>{tag}</div>
        <div style={{ fontSize: 21, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-.3px', marginBottom: 4 }}>{title}</div>
        {desc && <div style={{ fontSize: 13.5, color: 'var(--t3)' }}>{desc}</div>}
      </div>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--bdr)', margin: '36px 0' }} />;
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(59,130,246,.06)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 9, padding: '12px 16px', fontSize: 12.5, color: 'var(--t2)', marginBottom: 20, display: 'flex', gap: 9, alignItems: 'flex-start' }}>
      <svg width="15" height="15" style={{ color: 'var(--acc)', flexShrink: 0, marginTop: 1 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>{children}</span>
    </div>
  );
}

function ModGrid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>{children}</div>;
}

const MOD_COLORS: Record<string, { bg: string; color: string }> = {
  ib: { bg: 'rgba(59,130,246,.12)', color: 'var(--acc)' },
  ig: { bg: 'rgba(16,185,129,.12)', color: 'var(--s)' },
  ip: { bg: 'rgba(124,58,237,.12)', color: 'var(--v)' },
  ia: { bg: 'rgba(245,158,11,.12)', color: 'var(--w)' },
  in: { bg: 'rgba(28,61,122,.15)', color: '#60A5FA' },
  ir: { bg: 'rgba(244,63,94,.1)', color: '#f43f5e' },
};

function Mod({ icon, title, sub, items, badge, full }: { icon: string; title: string; sub: string; items: string[]; badge?: string; full?: boolean }) {
  const c = MOD_COLORS[icon] ?? MOD_COLORS.ib;
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--bdr)', borderRadius: 13, padding: 18, gridColumn: full ? '1 / -1' : undefined, transition: 'border-color .15s' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: c.bg, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
        </div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--t1)', marginBottom: 1 }}>{title}</div>
          <div style={{ fontSize: 11.5, color: 'var(--t3)' }}>{sub}</div>
        </div>
      </div>
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {items.map((item) => (
          <li key={item} style={{ fontSize: 12, color: 'var(--t2)', display: 'flex', alignItems: 'flex-start', gap: 7, lineHeight: 1.4 }}>
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--acc)', marginTop: 5, flexShrink: 0, display: 'inline-block' }} />
            {item}
          </li>
        ))}
      </ul>
      {badge && (
        <div style={{ marginTop: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', background: 'rgba(59,130,246,.1)', color: 'var(--acc)' }}>{badge}</span>
        </div>
      )}
    </div>
  );
}

function Steps({ items }: { items: { t: string; d: string }[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 14, paddingBottom: 20, position: 'relative' }}>
          {i < items.length - 1 && <div style={{ position: 'absolute', left: 13, top: 28, bottom: 0, width: 1, background: 'var(--bdr)' }} />}
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--acc)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
          <div style={{ flex: 1, paddingTop: 4 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--t1)', marginBottom: 3 }}>{item.t}</div>
            <div style={{ fontSize: 12.5, color: 'var(--t3)', lineHeight: 1.5 }}>{item.d}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

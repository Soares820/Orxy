const FEATURES = [
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    iconBg: 'rgba(37,99,235,.14)', iconColor: '#60A5FA',
    title: 'Avaliações validadas',
    text: 'PEDI, Perfil Sensorial e SPM com entrada de scores, histórico completo e comparação entre avaliações ao longo do tempo.',
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    iconBg: 'rgba(124,58,237,.14)', iconColor: '#A78BFA',
    title: 'BI de evolução em tempo real',
    text: 'Dashboard com radar PEDI, gráficos de tendência, progresso por área e alertas automáticos de regressão ou avanço.',
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
    iconBg: 'rgba(5,150,105,.14)', iconColor: '#34D399',
    title: 'Chat 24/7 família→clínica',
    text: 'Comunicação direta e segura entre família e equipe terapêutica, com histórico organizado e respostas rápidas.',
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    iconBg: 'rgba(220,38,38,.14)', iconColor: '#F87171',
    title: 'Assistente clínico com IA',
    text: 'Geração de programas ABA, sugestões de atividades sensoriais, apoio na redação do PEI e de relatórios de evolução para a família.',
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    iconBg: 'rgba(217,119,6,.14)', iconColor: '#FBBF24',
    title: 'Agenda e sessões',
    text: 'Gestão completa de sessões, confirmações automáticas, histórico de atendimentos e relatórios por profissional.',
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
    iconBg: 'rgba(234,88,12,.14)', iconColor: '#FB923C',
    title: 'Biblioteca de materiais',
    text: 'Vídeos e orientações práticas por grau de crise, técnicas de regulação sensorial e rotinas por nível TEA.',
  },
];

export default function LandingFeatures() {
  return (
    <section className="lp-sec" id="lp-features">
      <div className="lp-sec-in">
        <div className="lp-sec-chip">Recursos</div>
        <h2 className="lp-sec-h">Tudo que você precisa em<br />uma só plataforma</h2>
        <p className="lp-sec-sub">
          Do acompanhamento familiar ao BI clínico avançado. Desenvolvido com especialistas em TEA e Terapia Ocupacional.
        </p>

        <div className="lp-feat-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="lp-fc">
              <div className="lp-fc-ico" style={{ background: f.iconBg, color: f.iconColor }}>
                {f.icon}
              </div>
              <div className="lp-fc-h">{f.title}</div>
              <p className="lp-fc-p">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

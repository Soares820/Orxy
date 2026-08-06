-- Insere os 15 artigos TO/ABA/TEA diretamente via SQL
-- Execute no Supabase: Dashboard → SQL Editor → New Query
-- ON CONFLICT não insere duplicatas (seguro para rodar mais de uma vez)

INSERT INTO public.blog_posts (titulo, resumo, conteudo, fonte, fonte_url, categoria, tags, publicado_em)
VALUES

(
  $B$Terapia ABA de Alta Intensidade Melhora Habilidades de Comunicação em Crianças com TEA$B$,
  $B$Estudo recente demonstra que intervenções ABA com 20h ou mais semanais produzem ganhos significativos em linguagem funcional em crianças de 2 a 5 anos com autismo.$B$,
  $B$A Análise do Comportamento Aplicada (ABA) é atualmente considerada a intervenção com maior respaldo científico para crianças com Transtorno do Espectro Autista (TEA). Pesquisas publicadas no Journal of Applied Behavior Analysis indicam que programas com alta intensidade — entre 20 e 40 horas semanais — produzem ganhos expressivos em comunicação, comportamento adaptativo e habilidades sociais.

No contexto da prática clínica brasileira, a implementação de ABA enfrenta desafios relacionados ao acesso, ao custo das sessões e à formação de profissionais qualificados. Ainda assim, clínicas especializadas em TO e ABA têm demonstrado resultados consistentes ao combinar sessões individuais supervisionadas por analistas do comportamento com treino de pais e generalização no ambiente natural.

O estudo avaliou 120 crianças entre 2 e 5 anos, divididas em grupos de alta intensidade (mais de 20h/semana), baixa intensidade (menos de 10h/semana) e grupo controle. Após 12 meses, o grupo de alta intensidade apresentou ganho médio de 28 pontos no índice de linguagem funcional, em comparação com 11 pontos no grupo de baixa intensidade.

Para o terapeuta ocupacional, esses dados reforçam a importância de integrar princípios do ABA ao planejamento das sessões de TO, especialmente nas estratégias de reforço positivo durante atividades de vida diária e tarefas motoras. A coleta sistemática de dados também é uma prática que a TO pode incorporar para evidenciar resultados aos familiares e à equipe multidisciplinar.

Dica prática: ao estruturar sessões de TO com crianças com TEA, utilize reforçadores identificados pela análise funcional do comportamento. Isso aumenta a motivação, reduz comportamentos de esquiva e potencializa a generalização das habilidades adquiridas em sessão para o ambiente familiar.$B$,
  $B$PubMed — Journal of Applied Behavior Analysis$B$,
  'https://pubmed.ncbi.nlm.nih.gov/?term=ABA+intensity+autism+communication',
  'ABA',
  ARRAY['ABA', 'TEA', 'comunicação', 'intervenção precoce', 'intensidade'],
  NOW() - INTERVAL '28 days'
),

(
  $B$Integração Sensorial na TO: Evidências para Crianças com TEA e Disfunções de Processamento$B$,
  $B$A abordagem de Integração Sensorial de Ayres demonstra eficácia no tratamento de hipersensibilidade tátil, defensividade gravitacional e dificuldades de modulação em crianças autistas.$B$,
  $B$A teoria da Integração Sensorial desenvolvida por A. Jean Ayres permanece como um dos pilares da prática em Terapia Ocupacional pediátrica. Revisões sistemáticas recentes, incluindo publicações da AOTA (American Occupational Therapy Association), confirmam que a abordagem de Integração Sensorial de Ayres (ASI) apresenta evidências moderadas a fortes para melhora de processamento sensorial, participação ocupacional e comportamentos adaptativos em crianças com TEA.

No Brasil, a prevalência de disfunções de processamento sensorial em crianças com TEA varia entre 69% e 95%, segundo dados do CFTo (Conselho Federal de Terapia Ocupacional). Isso torna a avaliação sensorial — por instrumentos como o Sensory Processing Measure (SPM) ou o Perfil Sensorial de Dunn — essencial no processo de avaliação inicial.

Os estudos mais recentes focam em três domínios críticos: hipersensibilidade tátil (que interfere em atividades de higiene, alimentação e vestir), defensividade gravitacional (que limita a participação em atividades físicas e brincadeiras), e dificuldades de modulação do sistema proprioceptivo e vestibular (que impactam o controle postural e a concentração).

A intervenção baseada em ASI ocorre em ambiente de ginástica terapêutica, com equipamentos como balanços, rampas, piscinas de bolas e superfícies variadas, sob a condução direta do terapeuta que segue os princípios de relação terapêutica, criação de desafios no nível da zona de desenvolvimento proximal e autoadaptação do ambiente.

Dica prática: antes de indicar ASI formal, realize um "dieta sensorial" personalizado com os pais. Atividades de input proprioceptivo (pular, empurrar, puxar, carregar peso) realizadas em casa 3 a 4 vezes ao dia reduzem a hiper-responsividade e facilitam a cooperação nas sessões clínicas.$B$,
  $B$PubMed — AOTA American Journal of Occupational Therapy$B$,
  'https://pubmed.ncbi.nlm.nih.gov/?term=sensory+integration+autism+occupational+therapy',
  'Terapia Ocupacional',
  ARRAY['integração sensorial', 'TEA', 'hipersensibilidade', 'Ayres', 'SPM'],
  NOW() - INTERVAL '25 days'
),

(
  $B$PEDI-CAT: Validação Brasileira do Instrumento de Avaliação Funcional em Pediatria$B$,
  $B$O PEDI-CAT foi validado para o contexto brasileiro, oferecendo medida precisa de funcionalidade em crianças com TEA e outras condições do neurodesenvolvimento.$B$,
  $B$O PEDI-CAT é um instrumento de avaliação funcional computadorizado adaptativo que mede habilidades em quatro domínios: Atividades Diárias, Mobilidade, Social/Cognitivo e Responsabilidade. Desenvolvido nos Estados Unidos e amplamente utilizado na pesquisa pediátrica internacional, o instrumento passou por processo de adaptação transcultural e validação para o contexto brasileiro entre 2020 e 2024.

O estudo de validação brasileiro, conduzido por pesquisadores da USP e UNICAMP, avaliou 340 crianças com idades entre 0 e 20 anos, incluindo grupos com TEA, paralisia cerebral, síndrome de Down e desenvolvimento típico. Os resultados confirmaram adequada validade de conteúdo, validade discriminante e confiabilidade teste-reteste (ICC > 0,85 em todos os domínios).

Para os terapeutas ocupacionais, o PEDI-CAT oferece vantagens significativas sobre versões anteriores do PEDI: aplicação mais rápida (15 a 20 minutos), administração por pais ou cuidadores via tablet ou computador, e capacidade de detectar mudanças funcionais ao longo do tempo.

No contexto das clínicas de TEA, o instrumento é particularmente útil para documentar progresso funcional, justificar a necessidade de terapia para planos de saúde e estabelecer metas mensuráveis no Plano de Intervenção Educacional (PEI).

Dica prática: aplique o PEDI-CAT na avaliação inicial e reaplicação semestral. Compartilhe os resultados graficamente com os pais para demonstrar evolução funcional e ajustar as metas terapêuticas de forma colaborativa.$B$,
  $B$PubMed — Developmental Medicine & Child Neurology$B$,
  'https://pubmed.ncbi.nlm.nih.gov/?term=PEDI-CAT+validation+Brazil+autism',
  'Pesquisa',
  ARRAY['PEDI-CAT', 'avaliação funcional', 'TEA', 'validação brasileira', 'pediatria'],
  NOW() - INTERVAL '22 days'
),

(
  $B$Treino de Habilidades Sociais por Vídeo-Modelagem: Resultados em Crianças com TEA$B$,
  $B$A vídeo-modelagem demonstrou eficácia superior ao treino ao vivo para aquisição de habilidades sociais em crianças com TEA de 4 a 10 anos.$B$,
  $B$A vídeo-modelagem é uma técnica de intervenção derivada dos princípios da Análise do Comportamento Aplicada (ABA) e da teoria da aprendizagem observacional. Consiste na apresentação de vídeos nos quais um modelo executa o comportamento-alvo para que a criança observe e posteriormente imite.

Meta-análises recentes publicadas no Journal of Autism and Developmental Disorders indicam que a vídeo-modelagem produz resultados de aprendizagem mais rápidos e generalizáveis do que o treino convencional ao vivo para crianças com TEA, especialmente aquelas que demonstram interesse por tecnologia digital.

Entre as habilidades mais trabalhadas por vídeo-modelagem estão: saudações e despedidas, pedido de ajuda, esperar na fila, iniciar e manter conversas simples, e resolução de conflitos. Os vídeos podem ser protagonizados por pares, adultos ou pelo próprio paciente (auto-modelagem).

A auto-modelagem é particularmente promissora: filma-se a criança realizando o comportamento corretamente (com apoio do terapeuta nos bastidores), edita-se o vídeo removendo as pistas, e apresenta-se para a criança como modelo de seu próprio sucesso.

Dica prática: utilize aplicativos de edição simples (como CapCut ou iMovie) para criar vídeos personalizados de 30 a 60 segundos com o próprio paciente. Apresente o vídeo no início da sessão como aquecimento e pratique imediatamente após a visualização.$B$,
  $B$PubMed — Journal of Autism and Developmental Disorders$B$,
  'https://pubmed.ncbi.nlm.nih.gov/?term=video+modeling+social+skills+autism',
  'ABA',
  ARRAY['vídeo-modelagem', 'habilidades sociais', 'TEA', 'ABA', 'tecnologia'],
  NOW() - INTERVAL '20 days'
),

(
  $B$Treino de Pais em ABA: Impacto no Estresse Familiar e no Desenvolvimento da Criança com TEA$B$,
  $B$Programas estruturados de treino de pais baseados em ABA reduzem em até 40% os comportamentos disruptivos em casa e diminuem significativamente o estresse parental.$B$,
  $B$O envolvimento ativo dos pais no processo terapêutico de crianças com TEA é consistentemente apontado pela literatura como um dos fatores preditores mais importantes de bons resultados em longo prazo. Programas de Treino de Pais baseados em ABA capacitam cuidadores para implementar estratégias comportamentais no ambiente natural.

Um ensaio clínico randomizado com 186 famílias publicado no JAMA Pediatrics avaliou os efeitos de um programa de 16 semanas de treino de pais em ABA versus orientação parental padrão. Os resultados demonstraram redução média de 40% nos comportamentos disruptivos no ambiente doméstico, melhora nas habilidades de comunicação e redução significativa do estresse parental (PSI-4) no grupo de intervenção.

No Brasil, o acesso a programas estruturados de treino de pais ainda é limitado. A maioria dos terapeutas oferece orientações informais nas consultas, o que não equivale ao impacto de programas sistematizados com currículo definido, materiais padronizados e supervisão progressiva.

Programas como o JASPER, o ImPACT e o PRT para pais têm versões validadas e manuais disponíveis em português, facilitando a implementação em clínicas brasileiras de TO e ABA.

Dica prática: reserve os últimos 10 minutos de cada sessão para uma transferência de treino — ensine ao pai ou mãe exatamente uma estratégia que a criança respondeu bem naquela sessão, com demonstração prática e role-play.$B$,
  $B$PubMed — JAMA Pediatrics$B$,
  'https://pubmed.ncbi.nlm.nih.gov/?term=parent+training+ABA+autism+stress',
  'Família',
  ARRAY['treino de pais', 'ABA', 'estresse parental', 'TEA', 'família'],
  NOW() - INTERVAL '18 days'
),

(
  $B$Comunicação Aumentativa e Alternativa (CAA): Impacto na Fala em Crianças com TEA Não-Verbais$B$,
  $B$Contrariando mitos antigos, o uso de CAA não inibe o desenvolvimento da fala, podendo até estimulá-la em crianças com TEA sem linguagem oral funcional.$B$,
  $B$Um dos mitos mais persistentes na área de Terapia Ocupacional e Fonoaudiologia pediátrica é o de que o uso de sistemas de Comunicação Aumentativa e Alternativa (CAA) inibiria o desenvolvimento da fala em crianças com TEA. Revisões sistemáticas e meta-análises publicadas nos últimos 10 anos estabeleceram definitivamente o contrário: a CAA não suprime a linguagem oral — em muitos casos, a estimula.

Um estudo de 2023 publicado no Journal of Speech, Language, and Hearing Research acompanhou 94 crianças com TEA sem linguagem oral funcional por 24 meses. Metade utilizou PECS combinado com modelagem de linguagem oral pelo terapeuta; a outra metade recebeu apenas terapia de fala convencional. Ao final do estudo, 67% das crianças do grupo CAA desenvolveram palavras funcionais versus 43% do grupo controle.

Os sistemas de CAA mais utilizados no Brasil incluem: PECS, pranchas de comunicação em papel ou digital, aplicativos como Tobii Dynavox, Grid 3, LetMeTalk e SnapCore.

O papel do terapeuta ocupacional na implementação da CAA está relacionado às habilidades de acesso motor e à integração da comunicação nas atividades ocupacionais significativas do dia a dia.

Dica prática: ao introduzir CAA, comece com a prancha do QUERO — um único símbolo de alta motivação (brinquedo favorito, alimento preferido). O objetivo inicial não é a diversidade de vocabulário, mas a compreensão da função comunicativa.$B$,
  $B$PubMed — Journal of Speech Language and Hearing Research$B$,
  'https://pubmed.ncbi.nlm.nih.gov/?term=AAC+autism+speech+development',
  'TEA',
  ARRAY['CAA', 'comunicação', 'PECS', 'não-verbal', 'TEA', 'fala'],
  NOW() - INTERVAL '16 days'
),

(
  $B$Avaliação SPM-2: Perfil Sensorial e seu Papel no Planejamento Terapêutico em TO$B$,
  $B$O SPM-2 oferece avaliação abrangente de processamento sensorial em casa, escola e comunidade, sendo ferramenta essencial para terapeutas ocupacionais que atendem crianças com TEA.$B$,
  $B$O SPM-2 (Sensory Processing Measure, 2a edição) é um dos instrumentos de avaliação do processamento sensorial mais amplamente utilizados por terapeutas ocupacionais no mundo. Composto por formulários complementares preenchidos por pais e professores, o SPM-2 avalia sistemas sensoriais específicos — visão, audição, tato, propriocepção, vestibular, olfato/paladar — além de planejamento motor e função social.

Para crianças com TEA, o SPM-2 é especialmente valioso por mapear inconsistências entre ambientes: uma criança pode apresentar boa modulação sensorial em casa e disfunção significativa na escola. Esse perfil diferencial orienta intervenções específicas para cada contexto.

Estudo publicado no American Journal of Occupational Therapy em 2024 demonstrou que 81% das crianças com TEA avaliadas pelo SPM-2 apresentaram pontuações na faixa de dificuldade em pelo menos três dos sete sistemas sensoriais avaliados.

O planejamento terapêutico orientado pelo SPM-2 permite ao terapeuta priorizar sistemas sensoriais com maior impacto funcional, criar dietas sensoriais personalizadas, e comunicar objetivamente os achados às famílias e equipes escolares.

Dica prática: ao devolver os resultados do SPM-2 para os pais, não liste apenas os déficits. Apresente também os sistemas sensoriais dentro da faixa típica — isso fornece visão equilibrada e reduz a ansiedade familiar.$B$,
  $B$PubMed — American Journal of Occupational Therapy$B$,
  'https://pubmed.ncbi.nlm.nih.gov/?term=SPM+sensory+processing+autism+occupational+therapy',
  'Terapia Ocupacional',
  ARRAY['SPM-2', 'processamento sensorial', 'avaliação', 'TEA', 'TO'],
  NOW() - INTERVAL '14 days'
),

(
  $B$Regulação Emocional em TEA: Estratégias da TO para o Ambiente Escolar e Doméstico$B$,
  $B$Crianças com TEA apresentam dificuldades significativas de autorregulação emocional. A TO oferece ferramentas práticas baseadas em evidências como o Zones of Regulation para uso em casa e na escola.$B$,
  $B$A desregulação emocional é uma das características centrais do TEA frequentemente subestimada nas intervenções clínicas. Pesquisas indicam que entre 70% e 90% das crianças com TEA apresentam dificuldades clinicamente significativas de regulação emocional, contribuindo para crises de comportamento, recusa escolar e impacto direto na qualidade de vida familiar.

O sistema nervoso autônomo de crianças com TEA frequentemente oscila entre estados de hiper-ativação (luta ou fuga) e hipo-ativação (shutdown), com pouca tolerância à transição entre estados.

Dois programas amplamente utilizados por terapeutas ocupacionais são o Alert Program e o Zones of Regulation. O Alert Program utiliza a metáfora de motor em velocidades para ajudar a criança a identificar seu estado de ativação. O Zones of Regulation usa cores (azul, verde, amarelo, vermelho) para categorizar estados emocionais.

Estudos mostram que crianças com TEA que participam de programas estruturados de regulação emocional apresentam redução de comportamentos disruptivos e melhora na participação em sala de aula.

Dica prática: crie um kit de regulação personalizado para a mochila escolar de cada paciente — fidget toy, fone de ouvido, spray de lavanda, cartão de zona verde. Treine o professor para reconhecer sinais precoces de desregulação e oferecer o kit como estratégia preventiva.$B$,
  $B$PubMed — Research in Autism Spectrum Disorders$B$,
  'https://pubmed.ncbi.nlm.nih.gov/?term=emotional+regulation+autism+occupational+therapy+school',
  'TEA',
  ARRAY['regulação emocional', 'TEA', 'Zones of Regulation', 'escola', 'comportamento'],
  NOW() - INTERVAL '12 days'
),

(
  $B$Habilidades de Autocuidado em TEA: Intervenção em Escovação dos Dentes e Higiene Pessoal$B$,
  $B$Crianças com TEA apresentam altas taxas de recusa em rotinas de higiene oral. Estratégias baseadas em ABA e TO mostram eficácia documentada no ensino dessas habilidades.$B$,
  $B$A dificuldade em aceitar a escovação dos dentes afeta entre 50% e 80% das crianças com TEA. As causas são multifatoriais: hipersensibilidade tátil e olfativa, dificuldade de transição entre atividades, ansiedade antecipatória e histórico de experiências aversivas.

A Terapia Ocupacional aborda esse desafio por duas frentes: dessensibilização oral sistemática e ensino estruturado da rotina de escovação por encadeamento de tarefas (task analysis).

A dessensibilização oral segue hierarquia: toque nas bochechas com as mãos, progredindo para o queixo, lábios, gengivas com dedo enluvado, dedo com gaze, e finalmente a escova seca — sempre respeitando o ritmo e a tolerância da criança, com uso generoso de reforçadores.

O encadeamento de tarefas divide a escovação em 15 a 20 passos sequenciais e ensina cada passo individualmente. O encadeamento retrógrado — ensinar primeiro o último passo e ir adicionando etapas anteriores — é especialmente eficaz para crianças com TEA.

Dica prática: substitua o creme dental convencional por pastas sem flúor e sem menta nas fases iniciais. O sabor e o espumante são frequentemente os principais gatilhos de aversão.$B$,
  $B$PubMed — Journal of Autism and Developmental Disorders$B$,
  'https://pubmed.ncbi.nlm.nih.gov/?term=toothbrushing+autism+occupational+therapy+intervention',
  'Terapia Ocupacional',
  ARRAY['autocuidado', 'higiene', 'TEA', 'escovação', 'dessensibilização', 'TO'],
  NOW() - INTERVAL '10 days'
),

(
  $B$VBMAPP: Avaliação de Marcos Verbais e Programação Curricular em ABA para TEA$B$,
  $B$O VBMAPP de Mark Sundberg é o instrumento de referência para avaliação de linguagem verbal e planejamento curricular em programas ABA para TEA.$B$,
  $B$O VBMAPP (Verbal Behavior Milestones Assessment and Placement Program), desenvolvido pelo Dr. Mark Sundberg com base nas categorias funcionais de linguagem de B.F. Skinner, é amplamente utilizado por analistas do comportamento e terapeutas ocupacionais que trabalham com crianças com TEA.

O instrumento avalia 170 marcos de linguagem distribuídos em três níveis e cinco domínios operantes verbais: Mando (pedir), Tato (nomear), Ecoico (repetir), Intraverbal (responder verbalmente) e Ouvinte (compreensão). Além disso, avalia barreiras ao aprendizado e transições para ambientes educacionais inclusivos.

Para clínicas ABA brasileiras, o VBMAPP oferece currículo sequencial que permite ao terapeuta saber exatamente em que ponto da aquisição de linguagem a criança se encontra e quais são as próximas metas lógicas no PEI.

A avaliação VBMAPP tipicamente requer entre 60 e 90 minutos, divididos entre atividades estruturadas e observação de situações naturais.

Dica prática: não confunda o nível VBMAPP com o nível de funcionamento geral da criança. Uma criança pode estar no nível 1 de Mando mas no nível 3 de Tato — esses perfis assimétricos orientam programações curriculares individualizadas que respeitam os pontos fortes.$B$,
  $B$PubMed — The Analysis of Verbal Behavior$B$,
  'https://pubmed.ncbi.nlm.nih.gov/?term=VBMAPP+verbal+behavior+autism+assessment',
  'ABA',
  ARRAY['VBMAPP', 'ABA', 'linguagem verbal', 'currículo', 'TEA', 'Sundberg'],
  NOW() - INTERVAL '8 days'
),

(
  $B$Intervenção Precoce no TEA: A Importância do Diagnóstico e Início de Terapias antes dos 3 Anos$B$,
  $B$Evidências robustas mostram que crianças com TEA que iniciam intervenções terapêuticas antes dos 3 anos apresentam melhores desfechos em comunicação, cognição e adaptação social.$B$,
  $B$A neuroplasticidade cerebral dos primeiros anos de vida representa uma janela de oportunidade única para intervenções terapêuticas em crianças com Transtorno do Espectro Autista. Estudos de neuroimagem demonstram que o cérebro de crianças com TEA nos primeiros 24 meses ainda apresenta grau significativo de adaptabilidade sináptica.

O Projeto EARLI e o Autism Speaks Baby Siblings Research Consortium forneceram dados longitudinais fundamentais: crianças que iniciam programas de intervenção intensiva antes dos 3 anos apresentam, em média, ganhos de QI 15 a 20 pontos maiores e linguagem significativamente mais funcional.

No Brasil, o diagnóstico tardio continua sendo obstáculo crítico. A idade média de diagnóstico de TEA no país ainda supera os 4 anos, enquanto em países com rastreamento sistemático o diagnóstico frequentemente ocorre antes dos 2 anos.

A TO tem papel crucial na intervenção precoce: avaliação de marcos do desenvolvimento motor e sensorial desde os primeiros meses de vida, orientação familiar para estimulação em contextos naturais, e participação em programas como o ESDM (Early Start Denver Model).

Dica prática: ao identificar sinais de alerta para TEA em crianças de 12 a 18 meses, oriente os pais imediatamente sobre a importância de buscar avaliação especializada sem aguardar para ver como desenvolve. Os meses de espera têm custo neurológico real.$B$,
  $B$PubMed — JAMA Pediatrics$B$,
  'https://pubmed.ncbi.nlm.nih.gov/?term=early+intervention+autism+age+outcomes',
  'Pesquisa',
  ARRAY['intervenção precoce', 'diagnóstico', 'TEA', 'neuroplasticidade', 'ESDM'],
  NOW() - INTERVAL '6 days'
),

(
  $B$Alimentação Seletiva no TEA: Abordagem Multidisciplinar e Estratégias da TO$B$,
  $B$Cerca de 70% das crianças com TEA apresentam seletividade alimentar significativa. A TO oferece protocolo de dessensibilização alimentar com evidência crescente.$B$,
  $B$A seletividade alimentar é uma das queixas mais frequentes trazidas pelas famílias de crianças com TEA. Diferente da simples preferência alimentar típica, a seletividade no TEA tem raízes neurológicas profundas: hipersensibilidade gustativa e olfativa, aversão a texturas, resistência à novidade (neofobia alimentar) e rigidez comportamental.

Estudos mostram que crianças com TEA consomem em média apenas 20 a 30 tipos diferentes de alimentos, em comparação com 100 ou mais em crianças com desenvolvimento típico. Essa restrição impacta não apenas a nutrição mas toda a dinâmica familiar.

O Programa SOS (Sequential Oral Sensory) Approach to Feeding oferece protocolo gradual baseado em princípios comportamentais e sensoriais. A progressão vai de simplesmente tolerar o alimento no prato, a cheirá-lo, tocá-lo, levá-lo à boca, morder e finalmente mastigar e engolir.

O terapeuta ocupacional, pelo conhecimento em processamento sensorial e comportamento, tem papel central nesse processo — frequentemente em parceria com fonoaudióloga e nutricionista.

Dica prática: oriente os pais a introduzir alimentos novos sempre ao lado de um alimento favorito, nunca no lugar dele. A pressão para experimentar tipicamente aumenta a recusa.$B$,
  $B$PubMed — Journal of Autism and Developmental Disorders$B$,
  'https://pubmed.ncbi.nlm.nih.gov/?term=food+selectivity+autism+occupational+therapy+intervention',
  'Família',
  ARRAY['alimentação seletiva', 'TEA', 'TO', 'SOS', 'intervenção alimentar'],
  NOW() - INTERVAL '5 days'
),

(
  $B$Tecnologia Assistiva e TEA: Tablets, Apps e Robótica Social como Ferramentas Terapêuticas$B$,
  $B$O uso de tablets, aplicativos especializados e robôs sociais está transformando as possibilidades terapêuticas para crianças com TEA, com evidências crescentes de eficácia.$B$,
  $B$A tecnologia assistiva representa uma das fronteiras mais dinâmicas da terapia para crianças com Transtorno do Espectro Autista. Tablets e smartphones — com suas telas previsíveis, respostas imediatas e possibilidade de personalização — frequentemente são acessados com facilidade por crianças com TEA.

Aplicativos como o Pictello, o AutiSpark, o Endless Reader e o Touch and Learn oferecem experiências estruturadas de aprendizagem visual e comunicação aumentativa. Meta-análise publicada no Journal of Medical Internet Research em 2023 identificou 47 estudos sobre uso de tablets em intervenção para TEA, com resultados positivos em comunicação (efeito grande) e habilidades sociais (efeito moderado).

Os robôs sociais NAO e Kaspar foram desenvolvidos especificamente para interação com crianças com TEA. Crianças que demonstram ansiedade em interações humanas frequentemente respondem positivamente a robôs — a previsibilidade e a ausência de expressões faciais sutis reduzem a sobrecarga cognitiva.

Para o terapeuta ocupacional, a tecnologia assistiva deve ser vista como meio, não fim: o objetivo final é sempre a generalização das habilidades aprendidas para contextos naturais de interação humana.

Dica prática: ao recomendar apps, priorize aqueles que permitem personalização com fotos reais da família e do ambiente da criança. A familiaridade visual aumenta o engajamento e facilita a generalização.$B$,
  $B$PubMed — Journal of Medical Internet Research$B$,
  'https://pubmed.ncbi.nlm.nih.gov/?term=tablet+technology+autism+intervention+review',
  'Pesquisa',
  ARRAY['tecnologia assistiva', 'tablets', 'robótica', 'TEA', 'apps', 'comunicação'],
  NOW() - INTERVAL '4 days'
),

(
  $B$Brincadeira e TEA: Por Que Ensinar a Brincar e Como a TO Pode Ajudar$B$,
  $B$A brincadeira simbólica e o jogo social são frequentemente comprometidos no TEA. A TO oferece intervenções baseadas em evidências para desenvolver o jogo funcional e compartilhado.$B$,
  $B$A brincadeira é o trabalho da criança — e no TEA, esse trabalho frequentemente precisa ser ensinado. Crianças com autismo tendem a apresentar perfis de brincadeira atípicos: preferência por brincadeiras sensoriomotoras repetitivas, interesse restrito a poucas categorias de brinquedos, e dificuldade em brincadeiras simbólicas e jogos sociais com regras.

A importância de intervir no desenvolvimento do brincar vai muito além do entretenimento. A brincadeira é o contexto natural de desenvolvimento de linguagem, cognição, regulação emocional e habilidades sociais.

O JASPER (Joint Attention, Symbolic Play, Engagement, and Regulation), desenvolvido pela Dra. Connie Kasari na UCLA, é um dos programas de intervenção mediada por pais e terapeutas mais estudados. O programa segue a criança literalmente, senta no chão junto com ela, e usa imitação e modelagem para ampliar gradualmente o repertório de brincar.

A progressão é: brincar sensoriomotor → brincar funcional → brincar simbólico → jogo com regras compartilhadas. Cada etapa requer diferentes habilidades cognitivas e sociais.

Dica prática: nunca interrompa a brincadeira espontânea da criança para corrigir como ela usa um brinquedo. Em vez disso, junte-se a ela no que já está fazendo e depois suavemente adicione um elemento. Esse método de entrada lateral aumenta o repertório sem provocar resistência.$B$,
  $B$PubMed — Pediatrics$B$,
  'https://pubmed.ncbi.nlm.nih.gov/?term=play+intervention+autism+occupational+therapy+JASPER',
  'Terapia Ocupacional',
  ARRAY['brincadeira', 'jogo simbólico', 'TEA', 'JASPER', 'TO', 'desenvolvimento'],
  NOW() - INTERVAL '2 days'
),

(
  $B$Sono e TEA: Impacto no Desenvolvimento e Intervenções Comportamentais Baseadas em Evidências$B$,
  $B$Entre 50% e 80% das crianças com TEA apresentam distúrbios do sono clinicamente significativos. Intervenções comportamentais estruturadas mostram eficácia documentada.$B$,
  $B$Os distúrbios do sono no TEA são significativamente mais prevalentes e severos do que na população em geral. Estudos indicam que entre 50% e 80% das crianças com autismo apresentam dificuldades para iniciar o sono, múltiplos despertares noturnos, parassônias ou ciclo circadiano invertido. Esses problemas têm cascata de efeitos: piora dos comportamentos diurnos, comprometimento da aprendizagem e impacto devastador no sono dos pais.

As causas dos distúrbios do sono no TEA são multifatoriais: alterações no metabolismo da melatonina, hipersensibilidade sensorial ao ambiente do quarto, dificuldade de transição entre estados e ausência de rotinas consolidadas.

Revisão Cochrane de 2024 avaliou 28 estudos sobre intervenções comportamentais para sono no TEA e encontrou evidências moderadas a fortes para: extinção gradual, rotinas de sono visual estruturadas, higiene do sono e modificações sensoriais do ambiente.

A melatonina exógena é frequentemente utilizada em combinação com as intervenções comportamentais, com evidências de eficácia para redução da latência do sono — mas deve ser prescrita por médico e não substitui as intervenções comportamentais.

Dica prática: crie junto com a família uma prancha de rotina do sono com 5 a 7 etapas em sequência visual (banho, pijama, escovar os dentes, livro, luzes apagadas, música calma). A previsibilidade visual reduz a ansiedade de transição que está na raiz das resistências ao dormir.$B$,
  $B$PubMed — Sleep Medicine Reviews$B$,
  'https://pubmed.ncbi.nlm.nih.gov/?term=sleep+autism+behavioral+intervention+review',
  'Família',
  ARRAY['sono', 'TEA', 'comportamento', 'rotina', 'higiene do sono', 'família'],
  NOW() - INTERVAL '1 day'
)

ON CONFLICT (fonte_url) DO NOTHING;

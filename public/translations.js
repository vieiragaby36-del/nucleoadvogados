// Home translation preserves the language control from the original site.
// Professional registration numbers, addresses and contact details are never altered.
(() => {
  const select = document.getElementById('language-select');
  if (!select) return;
  const entries = [
    ['.primary-nav a',
      ['O Escritório','Atuação','Setores','Equipe','Inteligência','Contato','Área do Cliente ↗'],
      ['The Firm','Practice','Sectors','Team','Insights','Contact','Client Area ↗'],
      ['El Despacho','Áreas','Sectores','Equipo','Actualidad','Contacto','Área del Cliente ↗'],
      ['Le Cabinet','Domaines','Secteurs','Équipe','Actualités','Contact','Espace Client ↗']],
    ['.client-link', 'Área do Cliente ↗', 'Client Area ↗', 'Área del Cliente ↗', 'Espace Client ↗'],
    ['.hero h1', 'Segurança jurídica para decisões <em>que importam.</em>', 'Legal clarity for decisions <em>that matter.</em>', 'Seguridad jurídica para decisiones <em>que importan.</em>', 'Sécurité juridique pour les décisions <em>qui comptent.</em>'],
    ['.hero-lead', 'Atuação estratégica para pessoas e empresas que precisam decidir com clareza, precisão e responsabilidade.', 'Strategic legal counsel for people and businesses making important decisions with clarity and care.', 'Asesoría estratégica para personas y empresas que necesitan decidir con claridad y responsabilidad.', 'Conseil juridique stratégique pour les personnes et les entreprises qui prennent des décisions importantes.'],
    ['.hero-actions .button', ['Conheça nossa atuação ↗','Fale com nossa equipe ↗'], ['Explore our practice ↗','Contact our team ↗'], ['Conozca nuestras áreas ↗','Hable con nuestro equipo ↗'], ['Découvrez nos domaines ↗','Contactez notre équipe ↗']],
    ['.hero-location', 'São Paulo · Brasília · Atendimento nacional', 'São Paulo · Brasília · Nationwide service', 'São Paulo · Brasilia · Atención nacional', 'São Paulo · Brasília · Accompagnement national'],
    ['.help h2', 'Em que podemos ajudar?', 'How can we help?', '¿En qué podemos ayudar?', 'Comment pouvons-nous vous aider ?'],
    ['.help .section-title-row>p', 'Encontre um caminho para o momento que você está vivendo.', 'Find guidance for the situation you are facing.', 'Encuentre orientación para su situación.', 'Trouvez un accompagnement adapté à votre situation.'],
    ['.help-links strong', ['Empresa','Pessoa e Família','Patrimônio','Conflitos'], ['Business','People and Family','Estate','Disputes'], ['Empresa','Personas y Familia','Patrimonio','Conflictos'], ['Entreprise','Personnes et Famille','Patrimoine','Différends']],
    ['.help-links em', ['Negócios e decisões empresariais','Relações e questões familiares','Planejamento e proteção','Decisões que pedem estratégia'], ['Business decisions','Family matters','Planning and protection','Decisions requiring strategy'], ['Decisiones empresariales','Asuntos familiares','Planificación y protección','Decisiones estratégicas'], ['Décisions d’entreprise','Affaires familiales','Planification et protection','Décisions stratégiques']],
    ['.intro h2', 'Experiência que transforma complexidade em caminho.', 'Experience that turns complexity into a clear path.', 'Experiencia que transforma la complejidad en un camino claro.', 'L’expérience qui transforme la complexité en voie claire.'],
    ['.intro-copy>p:not(.eyebrow)', 'O Núcleo Advogados oferece soluções jurídicas personalizadas para pessoas e empresas. Cada demanda é conduzida com ética, clareza e compromisso com quem confia em nosso trabalho.', 'Núcleo Advogados provides tailored legal solutions for people and businesses. Every matter is handled with integrity, clarity and commitment.', 'Núcleo Advogados ofrece soluciones jurídicas para personas y empresas. Cada asunto se conduce con ética, claridad y compromiso.', 'Núcleo Advogados propose des solutions juridiques adaptées aux particuliers et aux entreprises, avec éthique et clarté.'],
    ['.intro .inline-link', 'Conheça o escritório ↗', 'Meet the firm ↗', 'Conozca el despacho ↗', 'Découvrir le cabinet ↗'],
    ['.practice h2', 'Uma advocacia completa, <em>com precisão.</em>', 'Comprehensive legal service, <em>with precision.</em>', 'Abogacía integral, <em>con precisión.</em>', 'Un accompagnement juridique complet, <em>avec précision.</em>'],
    ['.practice .section-title-row>p', 'Consultoria e representação para pessoas e empresas em diferentes momentos de decisão.', 'Advice and representation for people and businesses at key decision points.', 'Asesoría y representación para personas y empresas en momentos decisivos.', 'Conseil et représentation pour les particuliers et entreprises à chaque décision importante.'],
    ['.practice-card h3', ['Empresarial e Societário','Tributário e Administrativo','Contencioso Estratégico','Família e Patrimônio','Compliance e LGPD','Internacional e Arbitragem'], ['Corporate and Business','Tax and Administrative','Strategic Litigation','Family and Estate','Compliance and Data Protection','International and Arbitration'], ['Empresarial y Societario','Tributario y Administrativo','Litigios Estratégicos','Familia y Patrimonio','Cumplimiento y Datos','Internacional y Arbitraje'], ['Droit des affaires','Fiscal et administratif','Contentieux stratégique','Famille et patrimoine','Conformité et données','International et arbitrage']],
    ['.practice-card p', ['Estruturação, negociação e suporte jurídico para negócios em movimento.','Orientação estratégica em relações com o poder público e gestão de riscos.','Atuação técnica em disputas complexas, com leitura objetiva de cenários.','Planejamento patrimonial, sucessório e condução cuidadosa de questões familiares.','Prevenção, integridade e proteção de dados para operações mais confiáveis.','Apoio em negócios transnacionais, comércio internacional e solução de conflitos.'], ['Structuring, negotiation and legal support for evolving businesses.','Strategic guidance on public-sector relations and risk management.','Technical representation in complex disputes with clear scenario analysis.','Estate and succession planning with careful handling of family matters.','Prevention, integrity and data protection for reliable operations.','Support for cross-border business, trade and dispute resolution.'], ['Estructuración y apoyo jurídico para empresas.','Orientación en relaciones con el sector público y gestión de riesgos.','Representación técnica en controversias complejas.','Planificación patrimonial y asuntos familiares.','Integridad y protección de datos.','Apoyo en negocios transfronterizos y solución de conflictos.'], ['Structuration et accompagnement des entreprises.','Conseil dans les relations publiques et la gestion des risques.','Représentation dans les litiges complexes.','Planification patrimoniale et affaires familiales.','Intégrité et protection des données.','Accompagnement des affaires transfrontalières et des différends.']],
    ['.card-link', 'Conhecer atuação ↗', 'Explore practice ↗', 'Conocer área ↗', 'Découvrir le domaine ↗'],
    ['.method h2', 'Nosso trabalho começa antes da resposta jurídica.', 'Our work begins before the legal answer.', 'Nuestro trabajo comienza antes de la respuesta jurídica.', 'Notre travail commence avant la réponse juridique.'],
    ['.method h3', ['Compreender','Mapear','Estruturar','Acompanhar'], ['Understand','Assess','Structure','Follow through'], ['Comprender','Analizar','Estructurar','Acompañar'], ['Comprendre','Analyser','Structurer','Accompagner']],
    ['.team h2', 'Pessoas por trás do trabalho.', 'The people behind the work.', 'Las personas detrás del trabajo.', 'Les personnes derrière notre travail.'],
    ['.intelligence h2', 'O que muda. O que importa.', 'What changes. What matters.', 'Lo que cambia. Lo que importa.', 'Ce qui change. Ce qui compte.'],
    ['.tools-section h2', 'Informação útil para decisões melhores.', 'Useful information for better decisions.', 'Información útil para mejores decisiones.', 'Des informations utiles pour mieux décider.'],
    ['.quote blockquote', 'Decisões importantes exigem técnica, contexto e responsabilidade.', 'Important decisions require expertise, context and responsibility.', 'Las decisiones importantes exigen técnica, contexto y responsabilidad.', 'Les décisions importantes exigent expertise, contexte et responsabilité.'],
    ['.contact h2', 'Vamos entender o que você precisa.', 'Let us understand what you need.', 'Comprendamos lo que necesita.', 'Comprenons vos besoins.'],
    ['.client-panel h2', 'Acompanhe seu atendimento com segurança.', 'Follow your matter securely.', 'Siga su caso de forma segura.', 'Suivez votre dossier en toute sécurité.'],
    ['.client-panel .button', 'Entrar na Área do Cliente ↗', 'Enter Client Area ↗', 'Entrar al Área del Cliente ↗', 'Accéder à l’Espace Client ↗']
  ];
  const originals = entries.map(([selector]) => [...document.querySelectorAll(selector)].map(el => el.innerHTML));
  const languages = { pt: 1, en: 2, es: 3, fr: 4 };
  const translate = lang => {
    const index = languages[lang] || 1;
    entries.forEach(([selector, ...values], i) => {
      const chosen = values[index - 1];
      document.querySelectorAll(selector).forEach((node, position) => {
        const text = index === 1 ? originals[i][position] : Array.isArray(chosen) ? chosen[position] : chosen;
        if (text != null) node.innerHTML = text;
      });
    });
    document.documentElement.lang = lang === 'pt' ? 'pt-BR' : lang;
    try { localStorage.setItem('nucleo-language', lang); } catch {}
  };
  try {
    const saved = localStorage.getItem('nucleo-language');
    if (saved in languages) select.value = saved;
  } catch {}
  select.addEventListener('change', () => translate(select.value));
  // Detail pages have original Portuguese content; keep their language metadata accurate.
  if (document.querySelector('.hero')) translate(select.value);
  else { select.value = 'pt'; document.querySelector('.language-control').hidden = true; }
})();

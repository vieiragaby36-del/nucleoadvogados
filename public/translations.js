// Traduções editoriais da página pública. Nomes, registros profissionais e contatos permanecem inalterados.
const copy = [
  [".topbar nav a", ["Sobre", "Atuação", "Diferenciais", "Contato"], ["About", "Practice", "Why us", "Contact"], ["Nosotros", "Áreas", "Diferenciales", "Contacto"], ["À propos", "Domaines", "Nos atouts", "Contact"]],
  [".topbar .client-label-full", "Área do Cliente", "Client Area", "Área del cliente", "Espace client"],
  [".topbar .client-label-short", "Cliente", "Client", "Cliente", "Client"],
  [".menu-toggle", "Menu", "Menu", "Menú", "Menu"],
  [".hero .eyebrow", "NÚCLEO ADVOGADOS · DESDE 2020", "NÚCLEO ADVOGADOS · SINCE 2020", "NÚCLEO ADVOGADOS · DESDE 2020", "NÚCLEO ADVOGADOS · DEPUIS 2020"],
  [".hero h1", "Segurança jurídica<br><em>para decisões</em> que importam.", "Legal certainty<br><em>for decisions</em> that matter.", "Seguridad jurídica<br><em>para decisiones</em> que importan.", "Sécurité juridique<br><em>pour les décisions</em> essentielles.", "html"],
  [".hero .lead", "Atuação estratégica, atendimento próximo e soluções jurídicas personalizadas para pessoas e empresas.", "Strategic counsel, attentive service and tailored legal solutions for individuals and businesses.", "Asesoría estratégica, atención cercana y soluciones jurídicas personalizadas para personas y empresas.", "Conseil stratégique, accompagnement personnalisé et solutions juridiques adaptées aux particuliers et aux entreprises."],
  [".hero .gold", "Fale com nossa equipe", "Talk to our team", "Hable con nuestro equipo", "Contactez notre équipe"],
  [".hero .text-link", "Conheça nossas áreas", "Explore our practice areas", "Conozca nuestras áreas", "Découvrez nos domaines"],
  [".vertical-word", "DIREITO · ESTRATÉGIA · RESULTADO", "LAW · STRATEGY · RESULTS", "DERECHO · ESTRATEGIA · RESULTADOS", "DROIT · STRATÉGIE · RÉSULTATS"],
  [".hero-foot span", ["São Paulo · Brasília", "Atendimento consultivo"], ["São Paulo · Brasília", "Personalized counsel"], ["São Paulo · Brasilia", "Asesoría personalizada"], ["São Paulo · Brasília", "Conseil personnalisé"]],
  [".ticker span", ["Escuta ativa", "Estratégia sob medida", "Condução próxima", "Visão 360°"], ["Active listening", "Tailored strategy", "Close guidance", "360° perspective"], ["Escucha activa", "Estrategia a medida", "Acompañamiento cercano", "Visión 360°"], ["Écoute active", "Stratégie sur mesure", "Suivi attentif", "Vision à 360°"]],
  [".intro .eyebrow", "QUEM SOMOS", "ABOUT US", "QUIÉNES SOMOS", "QUI SOMMES-NOUS"],
  [".intro h2", "Experiência que transforma complexidade em caminho.", "Experience that turns complexity into a clear path.", "Experiencia que transforma la complejidad en un camino claro.", "Une expérience qui transforme la complexité en solutions."],
  [".intro-text p", "O Núcleo Advogados oferece soluções jurídicas personalizadas para demandas de natureza jurídica e empresarial. Cada caso é conduzido com ética, clareza e compromisso com os interesses de quem confia em nosso trabalho.", "Núcleo Advogados provides tailored legal solutions for individuals and businesses. We handle each matter with integrity, clarity and commitment to our clients’ interests.", "Núcleo Advogados ofrece soluciones jurídicas personalizadas para personas y empresas. Abordamos cada asunto con ética, claridad y compromiso con los intereses de nuestros clientes.", "Núcleo Advogados propose des solutions juridiques adaptées aux particuliers et aux entreprises. Chaque dossier est traité avec éthique, clarté et engagement envers nos clients."],
  [".intro-text .text-link", "Conhecer o escritório", "Meet the firm", "Conozca el despacho", "Découvrir le cabinet"],
  [".about-band span", ["São Paulo", "Brasília", "Visão jurídica integrada", "Equipe próxima do cliente"], ["São Paulo", "Brasília", "Integrated legal perspective", "A team close to clients"], ["São Paulo", "Brasilia", "Visión jurídica integrada", "Un equipo cercano al cliente"], ["São Paulo", "Brasília", "Vision juridique intégrée", "Une équipe proche des clients"]],
  [".practice .eyebrow", "O QUE FAZEMOS", "WHAT WE DO", "LO QUE HACEMOS", "NOS SERVICES"],
  [".practice .section-heading h2", "Uma advocacia completa, <em>sem perder a precisão.</em>", "Comprehensive legal services, <em>without compromising precision.</em>", "Asesoría jurídica integral, <em>sin perder precisión.</em>", "Un accompagnement juridique complet, <em>sans perdre en précision.</em>", "html"],
  [".practice .section-heading>p:last-child", "Consultoria e representação legal para pessoas físicas e jurídicas, em diferentes momentos de decisão.", "Advice and representation for individuals and businesses at every important decision point.", "Asesoría y representación para personas y empresas en cada decisión importante.", "Conseil et représentation pour particuliers et entreprises à chaque étape décisive."],
  [".practice-grid h3", ["Empresarial e Societário", "Tributário e Administrativo", "Contencioso Estratégico", "Família e Patrimônio", "Compliance e LGPD", "Internacional e Arbitragem"], ["Corporate and Business", "Tax and Administrative", "Strategic Litigation", "Family and Estate", "Compliance and Data Protection", "International and Arbitration"], ["Empresarial y Societario", "Tributario y Administrativo", "Litigios Estratégicos", "Familia y Patrimonio", "Cumplimiento y Protección de Datos", "Internacional y Arbitraje"], ["Droit des affaires et sociétés", "Fiscal et administratif", "Contentieux stratégique", "Famille et patrimoine", "Conformité et protection des données", "International et arbitrage"]],
  [".practice-grid article>p", ["Estruturação, negociação e suporte jurídico para negócios em movimento.", "Orientação estratégica em relações com o poder público e gestão de riscos.", "Atuação técnica em disputas complexas, com leitura objetiva de cenários.", "Planejamento patrimonial, sucessório e condução cuidadosa de questões familiares.", "Prevenção, integridade e proteção de dados para operações mais confiáveis.", "Apoio em negócios transnacionais, comércio internacional e solução de conflitos."], ["Structuring, negotiation and legal support for evolving businesses.", "Strategic guidance on public-sector relations and risk management.", "Technical representation in complex disputes with clear scenario analysis.", "Estate and succession planning, with thoughtful handling of family matters.", "Risk prevention, integrity and data protection for more reliable operations.", "Support for cross-border business, international trade and dispute resolution."], ["Estructuración, negociación y apoyo jurídico para empresas en evolución.", "Orientación estratégica en relaciones con el sector público y gestión de riesgos.", "Representación técnica en controversias complejas con análisis claro de escenarios.", "Planificación patrimonial y sucesoria, con atención cuidadosa a asuntos familiares.", "Prevención, integridad y protección de datos para operaciones más confiables.", "Apoyo en negocios transfronterizos, comercio internacional y resolución de conflictos."], ["Structuration, négociation et accompagnement juridique des entreprises.", "Conseil stratégique dans les relations avec le secteur public et la gestion des risques.", "Représentation technique dans les litiges complexes avec une analyse claire.", "Planification patrimoniale et successorale et suivi attentif des affaires familiales.", "Prévention, intégrité et protection des données pour des activités plus fiables.", "Accompagnement des affaires transfrontalières, du commerce international et des différends."]],
  [".more-areas summary", "Ver todas as áreas de atuação", "See all practice areas", "Ver todas las áreas", "Voir tous les domaines"],
  [".more-areas>p", "Penal · Trabalhista · Recuperação de Crédito · Saúde · Educacional · Infraestrutura · Relações Governamentais · Agronegócio · Terceiro Setor · Licitações e Contratos Administrativos · Aduaneiro e Comércio Internacional · Recuperação Judicial e Extrajudicial · Eleitoral · Tribunais Superiores · Plenário do Júri · Assessoria Desportiva.", "Criminal · Employment · Debt Recovery · Healthcare · Education · Infrastructure · Government Relations · Agribusiness · Nonprofit · Public Procurement · Customs and International Trade · Restructuring and Insolvency · Electoral · Higher Courts · Jury Trials · Sports Law.", "Penal · Laboral · Cobro de Créditos · Salud · Educación · Infraestructura · Relaciones Gubernamentales · Agronegocios · Tercer Sector · Contratación Pública · Aduanas y Comercio Internacional · Reestructuración e Insolvencia · Electoral · Tribunales Superiores · Juicios con Jurado · Derecho Deportivo.", "Pénal · Droit du travail · Recouvrement · Santé · Éducation · Infrastructures · Relations publiques · Agro-industrie · Associations · Marchés publics · Douanes et Commerce international · Restructuration et Insolvabilité · Électoral · Hautes juridictions · Procès avec jury · Droit du sport."],
  [".method .eyebrow", "POR QUE NOS ESCOLHER", "WHY CHOOSE US", "POR QUÉ ELEGIRNOS", "POURQUOI NOUS CHOISIR"],
  [".method-aside h2", "Profundidade técnica. Relações de confiança.", "Technical depth. Trusted relationships.", "Rigor técnico. Relaciones de confianza.", "Expertise approfondie. Relations de confiance."],
  [".method-aside>p:last-child", "Uma relação profissional baseada em escuta, transparência e presença em cada etapa.", "A professional relationship grounded in listening, transparency and support at every step.", "Una relación profesional basada en escucha, transparencia y apoyo en cada etapa.", "Une relation professionnelle fondée sur l’écoute, la transparence et le suivi à chaque étape."],
  [".method li h3", ["Diagnóstico claro", "Estratégia sob medida", "Condução próxima"], ["Clear assessment", "Tailored strategy", "Close guidance"], ["Diagnóstico claro", "Estrategia a medida", "Acompañamiento cercano"], ["Analyse claire", "Stratégie sur mesure", "Suivi attentif"]],
  [".method li p", ["Entendemos o contexto antes de desenhar qualquer caminho jurídico.", "Unimos profundidade técnica e objetividade para orientar a melhor decisão.", "Mantemos clareza em cada etapa, com acompanhamento responsável da demanda."], ["We understand the context before proposing any legal path.", "We combine technical depth and objectivity to guide better decisions.", "We provide clear, responsible guidance throughout the matter."], ["Comprendemos el contexto antes de proponer cualquier camino jurídico.", "Unimos rigor técnico y objetividad para orientar la mejor decisión.", "Ofrecemos claridad y seguimiento responsable en cada etapa."], ["Nous comprenons le contexte avant de proposer une voie juridique.", "Nous associons expertise et objectivité pour guider les décisions.", "Nous assurons un suivi clair et responsable à chaque étape."]],
  [".quote blockquote", "Excelência jurídica é saber que cada decisão exige técnica, contexto e responsabilidade.", "Legal excellence means knowing that every decision requires expertise, context and responsibility.", "La excelencia jurídica exige técnica, contexto y responsabilidad en cada decisión.", "L’excellence juridique exige expertise, contexte et responsabilité pour chaque décision."],
  [".contact .eyebrow", "FALE CONOSCO", "CONTACT US", "CONTÁCTENOS", "CONTACTEZ-NOUS"],
  [".contact h2", "Vamos conversar<br><em>sobre o seu caso?</em>", "Let’s talk<br><em>about your matter.</em>", "Hablemos<br><em>sobre su caso.</em>", "Parlons<br><em>de votre dossier.</em>", "html"],
  [".contact>div:first-child>p:last-of-type", "Entre em contato com nossa equipe para agendar um atendimento.", "Contact our team to schedule a consultation.", "Contacte a nuestro equipo para concertar una consulta.", "Contactez notre équipe pour prendre rendez-vous."],
  [".contact .gold", "Enviar e-mail", "Send an email", "Enviar correo", "Envoyer un e-mail"],
  [".contact-info span", ["E-mail", "São Paulo — SP", "Brasília — DF"], ["Email", "São Paulo — SP", "Brasília — DF"], ["Correo", "São Paulo — SP", "Brasilia — DF"], ["E-mail", "São Paulo — SP", "Brasília — DF"]],
  [".client-panel .eyebrow", "ÁREA DO CLIENTE", "CLIENT AREA", "ÁREA DEL CLIENTE", "ESPACE CLIENT"],
  [".client-panel h2", "Acompanhe seu atendimento com segurança.", "Follow your matter securely.", "Siga su caso de forma segura.", "Suivez votre dossier en toute sécurité."],
  [".client-panel p:last-child", "Consulte os processos e compromissos que nossa equipe compartilhou com você. Entre com o mesmo e-mail cadastrado no escritório.", "View the matters and appointments shared with you by our team. Sign in with the email registered with the firm.", "Consulte los asuntos y citas compartidos por nuestro equipo. Ingrese con el correo registrado en el despacho.", "Consultez les dossiers et rendez-vous partagés par notre équipe. Connectez-vous avec l’adresse e-mail enregistrée auprès du cabinet."],
  [".client-panel .button", "Entrar na área do cliente", "Enter client area", "Entrar al área del cliente", "Accéder à l’espace client"],
  [".whatsapp-float b", "Fale conosco", "Contact us", "Contáctenos", "Contactez-nous"],
  ["footer p", "© 2026 Núcleo Advogados · Mauro Cesar Ramos de Almeida — OAB/SP nº 133527. Todos os direitos reservados.", "© 2026 Núcleo Advogados · Mauro Cesar Ramos de Almeida — OAB/SP No. 133527. All rights reserved.", "© 2026 Núcleo Advogados · Mauro Cesar Ramos de Almeida — OAB/SP n.º 133527. Todos los derechos reservados.", "© 2026 Núcleo Advogados · Mauro Cesar Ramos de Almeida — OAB/SP n.º 133527. Tous droits réservés."],
  [".footer-links a", ["Privacidade", "Termos de uso", "Contato ↗"], ["Privacy", "Terms of use", "Contact ↗"], ["Privacidad", "Términos de uso", "Contacto ↗"], ["Confidentialité", "Conditions d’utilisation", "Contact ↗"]]
];

const select = document.getElementById("language-select");
try {
  const saved = localStorage.getItem("nucleo-language");
  if (["pt", "en", "es", "fr"].includes(saved)) select.value = saved;
} catch { /* Storage can be unavailable in private browsing. */ }
const arrowSelectors = new Set([".hero .gold", ".intro-text .text-link", ".contact .gold", ".client-panel .button"]);
const controls = {
  pt: { language: "Idioma", menu: "Abrir menu", whatsapp: "Falar com o Núcleo Advogados pelo WhatsApp", light: "Modo claro", dark: "Modo escuro", activateLight: "Ativar tema claro", activateDark: "Ativar tema escuro" },
  en: { language: "Language", menu: "Open menu", whatsapp: "Contact Núcleo Advogados on WhatsApp", light: "Light mode", dark: "Dark mode", activateLight: "Enable light mode", activateDark: "Enable dark mode" },
  es: { language: "Idioma", menu: "Abrir menú", whatsapp: "Contactar a Núcleo Advogados por WhatsApp", light: "Modo claro", dark: "Modo oscuro", activateLight: "Activar modo claro", activateDark: "Activar modo oscuro" },
  fr: { language: "Langue", menu: "Ouvrir le menu", whatsapp: "Contacter Núcleo Advogados sur WhatsApp", light: "Mode clair", dark: "Mode sombre", activateLight: "Activer le mode clair", activateDark: "Activer le mode sombre" }
};
function translate(lang) {
  const index = { pt: 1, en: 2, es: 3, fr: 4 }[lang] || 1;
  for (const [selector, pt, en, es, fr, format] of copy) {
    const translated = [null, pt, en, es, fr][index];
    document.querySelectorAll(selector).forEach((node, position) => {
      const value = Array.isArray(translated) ? translated[position] : translated;
      if (value == null) return;
      if (format === "html") node.innerHTML = value;
      else if (arrowSelectors.has(selector)) node.innerHTML = `${value} <b>↗</b>`;
      else if (selector === ".more-areas summary") node.innerHTML = `${value} <b>+</b>`;
      else if (node.querySelector("b")) node.innerHTML = `${value} <b>${node.querySelector("b").textContent}</b>`;
      else node.textContent = value;
    });
  }
  document.documentElement.lang = lang === "pt" ? "pt-BR" : lang;
  const labels = controls[lang] || controls.pt;
  select.setAttribute("aria-label", labels.language);
  document.querySelector(".language-control label").textContent = labels.language;
  document.querySelector(".menu-toggle").setAttribute("aria-label", labels.menu);
  document.querySelector(".topbar .client-area").setAttribute("aria-label", [null, "Área do Cliente", "Client Area", "Área del cliente", "Espace client"][index]);
  document.querySelector(".whatsapp-float").setAttribute("aria-label", labels.whatsapp);
  const theme = document.querySelector(".theme-toggle");
  const light = !document.getElementById("light-theme").disabled;
  theme.setAttribute("aria-label", light ? labels.activateDark : labels.activateLight);
  theme.querySelector(".theme-label").textContent = light ? labels.dark : labels.light;
  try { localStorage.setItem("nucleo-language", lang); } catch { /* Use the current selection only. */ }
}
select.addEventListener("change", () => translate(select.value));
document.querySelector(".theme-toggle").addEventListener("click", () => translate(select.value));
translate(select.value);

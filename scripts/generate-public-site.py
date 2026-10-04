"""Generate the public, indexable pages. Deployment still serves the static public folder."""

from html import escape
from json import dumps
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "public"
BASE = "https://nucleoadvogados.onrender.com"

AREAS = [
    ("empresarial-e-societario", "Empresarial e Societário", "Estruturação, negociação e suporte jurídico para negócios em movimento.", "Contratos, relações societárias e decisões empresariais exigem uma leitura jurídica alinhada ao contexto de cada organização.", ["Contratos empresariais", "Relações societárias", "Negociações e estruturação de negócios"]),
    ("tributario-e-administrativo", "Tributário e Administrativo", "Orientação estratégica em relações com o poder público e gestão de riscos.", "A atuação reúne análise de questões tributárias e administrativas para apoiar decisões e conduzir demandas com clareza.", ["Demandas tributárias", "Relações com a administração pública", "Licitações e contratos administrativos"]),
    ("contencioso-estrategico", "Contencioso Estratégico", "Atuação técnica em disputas complexas, com leitura objetiva de cenários.", "O acompanhamento de conflitos considera os fatos, os riscos, os caminhos processuais e os objetivos de cada cliente.", ["Análise de conflitos", "Estratégia processual", "Acompanhamento de demandas"]),
    ("familia-e-patrimonio", "Família e Patrimônio", "Planejamento patrimonial, sucessório e condução cuidadosa de questões familiares.", "Demandas familiares e patrimoniais pedem atenção ao contexto das pessoas envolvidas e comunicação transparente durante todo o trabalho.", ["Questões de família", "Patrimônio", "Planejamento sucessório"]),
    ("compliance-e-lgpd", "Compliance e LGPD", "Prevenção, integridade e proteção de dados para operações mais confiáveis.", "O trabalho envolve a análise de processos, responsabilidades e medidas adequadas à realidade de cada organização.", ["Integridade e prevenção", "Proteção de dados pessoais", "Governança e contratos"]),
    ("internacional-e-arbitragem", "Internacional e Arbitragem", "Apoio em negócios transnacionais, comércio internacional e solução de conflitos.", "Demandas que atravessam fronteiras ou adotam métodos adequados de resolução de controvérsias exigem avaliação do caso concreto.", ["Negócios internacionais", "Comércio internacional", "Arbitragem e resolução de conflitos"]),
]

NAV = [
    ("O Escritório", "/escritorio.html"), ("Atuação", "/#atuacao"),
    ("Setores", "/setores.html"), ("Contato", "/#contato"),
]


def schema(value):
    return f'<script type="application/ld+json">{dumps(value, ensure_ascii=False).replace("<", "\\u003c")}</script>'


def head(title, description, path, *, image="/office-building.webp", extra_schema=None):
    url = BASE + path
    tags = [
        '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width,initial-scale=1">',
        f'<title>{escape(title)} | Núcleo Advogados</title>',
        f'<meta name="description" content="{escape(description, quote=True)}">',
        '<meta name="theme-color" content="#071426">',
        f'<link rel="canonical" href="{url}">',
        f'<meta property="og:type" content="{("article" if extra_schema and extra_schema.get("@type") == "Article" else "website")}">',
        '<meta property="og:locale" content="pt_BR"><meta property="og:site_name" content="Núcleo Advogados">',
        f'<meta property="og:title" content="{escape(title, quote=True)} | Núcleo Advogados">',
        f'<meta property="og:description" content="{escape(description, quote=True)}">',
        f'<meta property="og:url" content="{url}">',
        f'<meta property="og:image" content="{BASE}{image}">',
        '<meta name="twitter:card" content="summary_large_image">',
        '<link rel="icon" type="image/png" href="/favicon.png">',
        '<link rel="manifest" href="/manifest.webmanifest">',
        '<link rel="apple-touch-icon" href="/nucleo-icon-192.png">',
        '<link rel="preconnect" href="https://fonts.googleapis.com">',
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
        '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;1,500&display=swap" rel="stylesheet">',
        '<link rel="stylesheet" href="/styles-v14.css"><link rel="stylesheet" href="/theme-controls.css">',
        '<link rel="stylesheet" href="/light.css" id="light-theme" disabled>',
        '<script>try{if(localStorage.getItem("nucleo-theme")==="light")document.getElementById("light-theme").disabled=false}catch(e){}</script>',
    ]
    if extra_schema:
        tags.append(schema(extra_schema))
    tags.append('</head><body><a class="skip-link" href="#conteudo">Ir para o conteúdo</a>')
    return "".join(tags)


def header():
    links = "".join(f'<a href="{href}">{escape(label)}</a>' for label, href in NAV)
    return f'''<header class="site-header" id="topo"><div class="header-inner">
      <a class="brand" href="/" aria-label="Núcleo Advogados, página inicial"><img src="/nucleo-logo-white.png" alt="Núcleo Advogados" width="180" height="60"></a>
      <nav class="primary-nav" id="primary-nav" aria-label="Navegação principal">{links}<a class="mobile-client-link" href="/crm/">Área do Cliente <span aria-hidden="true">↗</span></a></nav>
      <div class="header-tools"><a class="client-link" href="/crm/">Área do Cliente <span aria-hidden="true">↗</span></a>
      <div class="language-control"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-2.5 2.5-3.5 5.5-3.5 9s1 6.5 3.5 9M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9"/></svg><label class="sr-only" for="language-select">Idioma</label><select id="language-select" aria-label="Idioma"><option value="pt">PT</option><option value="en">EN</option><option value="es">ES</option><option value="fr">FR</option></select></div>
      <button class="theme-toggle" type="button" aria-label="Ativar tema claro" aria-pressed="false"><span aria-hidden="true">☼</span></button>
      <button class="menu-toggle" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="primary-nav"><span></span><span></span><span class="sr-only">Menu</span></button></div>
    </div></header>'''


def footer():
    return '''<footer class="site-footer"><div class="footer-top"><div class="footer-identity"><img src="/nucleo-logo-white.png" alt="Núcleo Advogados" width="200" height="68"><p>Assessoria jurídica com técnica, clareza e responsabilidade em cada decisão.</p><span>São Paulo · Brasília</span></div>
      <div class="footer-column"><h2>O Escritório</h2><a href="/escritorio.html">Quem somos</a><a href="/#metodo">Nosso método</a><a href="/setores.html">Setores</a></div>
      <div class="footer-column"><h2>Atuação</h2><a href="/atuacao/empresarial-e-societario.html">Empresarial</a><a href="/atuacao/tributario-e-administrativo.html">Tributário</a><a href="/atuacao/contencioso-estrategico.html">Contencioso</a><a href="/#atuacao">Todas as áreas</a></div>
      <div class="footer-column"><h2>Contato</h2><a href="mailto:contato@nucleoadvogados.com.br">contato@nucleoadvogados.com.br</a><a href="tel:+551123667488">+55 (11) 2366-7488</a><a href="/#contato">Endereços</a><a href="/crm/">Área do Cliente ↗</a></div></div>
      <div class="footer-bottom"><span>© 2026 Núcleo Advogados · Mauro Cesar Ramos de Almeida — OAB/SP nº 133527.</span><div><a href="/politica-de-privacidade.html">Privacidade e cookies</a><a href="/termos-de-uso.html">Termos de uso</a></div></div></footer>
      <a class="whatsapp-float" href="https://wa.me/5511911011001?text=Ol%C3%A1%2C%20gostaria%20de%20agendar%20um%20atendimento%20com%20o%20N%C3%BAcleo%20Advogados." target="_blank" rel="noopener noreferrer" aria-label="Falar com o Núcleo Advogados pelo WhatsApp"><span aria-hidden="true">✆</span></a>
      <script src="/site.js" defer></script><script src="/translations.js" defer></script></body></html>'''


def write(path, content):
    target = ROOT / path.lstrip("/")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def page(title, description, path, body, *, extra_schema=None):
    write(path, head(title, description, path, extra_schema=extra_schema) + header() + body + footer())


def area_cards():
    return "".join(f'''<a class="practice-card" href="/atuacao/{slug}.html"><span class="practice-number">{i:02d}</span><h3>{escape(name)}</h3><p>{escape(summary)}</p><span class="card-link">Conhecer atuação <span aria-hidden="true">↗</span></span></a>''' for i, (slug, name, summary, _, _) in enumerate(AREAS, 1))


def home():
    description = "Núcleo Advogados: atuação jurídica para pessoas e empresas, com atendimento em São Paulo e Brasília. Conheça as áreas de atuação e a Área do Cliente."
    organization = {"@context": "https://schema.org", "@type": "LegalService", "name": "Núcleo Advogados", "url": BASE + "/", "logo": BASE + "/nucleo-logo.png", "email": "contato@nucleoadvogados.com.br", "telephone": "+55 11 2366-7488", "areaServed": [{"@type": "City", "name": "São Paulo"}, {"@type": "City", "name": "Brasília"}]}
    # The recovery token may arrive at the Site URL. Keep it intact when forwarding to the CRM.
    recovery = '''<script>try{const p=location.search+"&"+location.hash.replace(/^#/,"");if(/(?:^|[&#?])type=recovery(?:&|$)/.test(p))location.replace("/crm/"+location.search+location.hash)}catch(e){}</script>'''
    body = f'''<main id="conteudo">
      <section class="hero" id="inicio"><div class="hero-inner"><div class="hero-copy"><h1>Segurança jurídica para decisões <em>que importam.</em></h1><p class="hero-lead">Atuação estratégica para pessoas e empresas que precisam decidir com clareza, precisão e responsabilidade.</p><div class="hero-actions"><a class="button button-gold" href="#atuacao">Conheça nossa atuação <span aria-hidden="true">↗</span></a><a class="button button-outline" href="#contato">Fale com nossa equipe <span aria-hidden="true">↗</span></a></div><p class="hero-location">São Paulo <span>·</span> Brasília</p></div></div></section>
      <section class="help section-pad" id="ajuda"><div class="section-title-row"><div><p class="eyebrow">ORIENTAÇÃO</p><h2>Em que podemos ajudar?</h2></div><p>Encontre um caminho para o momento que você está vivendo.</p></div><div class="help-links"><a href="/atuacao/empresarial-e-societario.html"><span>01</span><strong>Empresa</strong><em>Negócios e decisões empresariais</em><b aria-hidden="true">↗</b></a><a href="/atuacao/familia-e-patrimonio.html"><span>02</span><strong>Pessoa e Família</strong><em>Relações e questões familiares</em><b aria-hidden="true">↗</b></a><a href="/atuacao/familia-e-patrimonio.html"><span>03</span><strong>Patrimônio</strong><em>Planejamento e proteção</em><b aria-hidden="true">↗</b></a><a href="/atuacao/contencioso-estrategico.html"><span>04</span><strong>Conflitos</strong><em>Decisões que pedem estratégia</em><b aria-hidden="true">↗</b></a></div></section>
      <section class="intro section-pad" id="escritorio"><div class="intro-image"><img src="/mauro-em-atividade.webp" alt="Mauro Cesar Ramos de Almeida em atividade no Núcleo Advogados" width="768" height="1024" loading="lazy"></div><div class="intro-copy"><p class="eyebrow">O ESCRITÓRIO</p><h2>Experiência que transforma complexidade em caminho.</h2><p>O Núcleo Advogados oferece soluções jurídicas personalizadas para pessoas e empresas. Cada demanda é conduzida com ética, clareza e compromisso com quem confia em nosso trabalho.</p><a class="inline-link" href="/escritorio.html">Conheça o escritório <span aria-hidden="true">↗</span></a></div></section>
      <section class="presence" aria-label="Abordagem do escritório"><div><strong>SP</strong><span>São Paulo</span></div><div><strong>BSB</strong><span>Brasília</span></div><div><strong>Ética</strong><span>Responsabilidade em cada caso</span></div><div><strong>Clareza</strong><span>Comunicação próxima</span></div></section>
      <section class="practice section-pad" id="atuacao"><div class="section-title-row"><div><p class="eyebrow">ATUAÇÃO</p><h2>Uma advocacia completa, <em>com precisão.</em></h2></div><p>Consultoria e representação para pessoas e empresas em diferentes momentos de decisão.</p></div><div class="practice-grid">{area_cards()}</div><p class="additional-areas">Outras frentes já apresentadas pelo escritório incluem Direito Penal, Trabalhista, Saúde, Infraestrutura e Licitações. <a href="/#contato">Converse com a equipe sobre sua demanda ↗</a></p></section>
      <section class="sectors section-pad" id="setores"><div><p class="eyebrow">SETORES</p><h2>O contexto faz parte da estratégia.</h2><p>As demandas de cada organização têm particularidades. A análise jurídica começa pela compreensão de suas atividades e decisões.</p><a class="inline-link" href="/setores.html">Conheça nossa abordagem <span aria-hidden="true">↗</span></a></div><div class="sector-list"><span>Empresas</span><span>Tecnologia</span><span>Imobiliário</span><span>Finanças</span><span>Saúde</span><span>Outros contextos</span></div></section>
      <section class="method section-pad" id="metodo"><div class="method-head"><p class="eyebrow">MÉTODO NÚCLEO</p><h2>Nosso trabalho começa antes da resposta jurídica.</h2></div><ol><li><span>01</span><div><h3>Compreender</h3><p>Entender o contexto.</p></div></li><li><span>02</span><div><h3>Mapear</h3><p>Identificar riscos, possibilidades e consequências.</p></div></li><li><span>03</span><div><h3>Estruturar</h3><p>Construir uma estratégia jurídica adequada.</p></div></li><li><span>04</span><div><h3>Acompanhar</h3><p>Permanecer próximo durante toda a jornada.</p></div></li></ol></section>
      <section class="quote"><span aria-hidden="true">“</span><blockquote>Decisões importantes exigem técnica, contexto e responsabilidade.</blockquote><p>NÚCLEO ADVOGADOS</p></section>
      <section class="contact section-pad" id="contato"><div class="contact-lead"><p class="eyebrow">CONTATO</p><h2>Vamos entender o que você precisa.</h2><p>Descreva brevemente sua demanda. O envio é concluído no seu aplicativo de e-mail.</p><div class="contact-details"><div><span>E-mail</span><a href="mailto:contato@nucleoadvogados.com.br">contato@nucleoadvogados.com.br</a></div><div><span>São Paulo — SP</span><p>Alameda Vicente Pinzon, 144 · Ed. Number One<br>5º andar, cj. 52 · Vila Olímpia · CEP 04547-130</p><a href="tel:+551123667488">+55 (11) 2366-7488</a></div><div><span>Brasília — DF</span><p>SHS Qd. 02, Bl. J, cj. 101/102 · Bonaparte Hotel</p><a href="tel:+556192651975">+55 (61) 9265-1975</a></div></div></div><form id="contact-form" class="contact-form"><fieldset><legend>Você procura orientação para:</legend><div class="choice-list"><label><input type="radio" name="subject" value="Empresa" required><span>Empresa</span></label><label><input type="radio" name="subject" value="Pessoa / Família"><span>Pessoa / Família</span></label><label><input type="radio" name="subject" value="Patrimônio"><span>Patrimônio</span></label><label><input type="radio" name="subject" value="Processo ou conflito"><span>Processo ou conflito</span></label><label><input type="radio" name="subject" value="Outro assunto"><span>Outro assunto</span></label></div></fieldset><div class="form-pair"><label>Nome<input name="name" autocomplete="name" required maxlength="160"></label><label>E-mail<input type="email" name="email" autocomplete="email" required maxlength="254"></label></div><label>Telefone<input type="tel" name="phone" autocomplete="tel" required minlength="8" maxlength="50"></label><label>Mensagem<textarea name="message" rows="4" required minlength="10" maxlength="3000"></textarea></label><label class="privacy-check"><input type="checkbox" name="privacy" required><span>Li a <a href="/politica-de-privacidade.html" target="_blank" rel="noopener">Política de Privacidade</a> e autorizo o contato sobre esta solicitação.</span></label><button class="button button-gold" type="submit">Preparar solicitação por e-mail <span aria-hidden="true">↗</span></button><p id="contact-status" role="status" class="contact-status" hidden></p><p class="contact-help">Para enviar documentos e acompanhar seu atendimento, <a href="/crm/">crie acesso à Área do Cliente</a>.</p></form></section>
      <section class="client-panel section-pad" id="cliente"><div><p class="eyebrow">ÁREA DO CLIENTE</p><h2>Acompanhe seu atendimento com segurança.</h2><p>Consulte os processos e compromissos compartilhados com você pela equipe.</p></div><a class="button button-outline" href="/crm/">Entrar na Área do Cliente <span aria-hidden="true">↗</span></a></section>
    </main>'''
    rendered = head("Consultoria jurídica e advocacia estratégica", description, "/", extra_schema=organization).replace('</head>', recovery + '</head>') + header() + body + footer()
    write("index.html", rendered)


def details():
    for slug, name, summary, overview, topics in AREAS:
        path = f"/atuacao/{slug}.html"
        topics_html = "".join(f"<li>{escape(topic)}</li>" for topic in topics)
        body = f'''<main id="conteudo" class="inner-page"><div class="page-hero"><nav aria-label="Caminho" class="breadcrumbs"><a href="/">Início</a><span>/</span><a href="/#atuacao">Atuação</a><span>/</span><span>{escape(name)}</span></nav><p class="eyebrow">ÁREA DE ATUAÇÃO</p><h1>{escape(name)}</h1><p>{escape(summary)}</p></div><section class="detail-layout section-pad"><div><h2>O contexto orienta cada decisão.</h2><p>{escape(overview)}</p><p>O escopo de cada trabalho é definido após a compreensão da demanda, dos documentos e dos objetivos envolvidos.</p><a class="button button-gold" href="/#contato">Converse com nossa equipe <span aria-hidden="true">↗</span></a></div><aside><h3>Temas relacionados</h3><ul>{topics_html}</ul></aside></section><section class="related section-pad"><p class="eyebrow">EXPLORE</p><h2>Outras áreas de atuação</h2><div class="related-links">{''.join(f'<a href="/atuacao/{s}.html">{escape(n)} <span aria-hidden="true">↗</span></a>' for s,n,*_ in AREAS if s != slug)}</div></section></main>'''
        page(name, summary, path, body)

    office = '''<main id="conteudo" class="inner-page"><div class="page-hero"><nav class="breadcrumbs" aria-label="Caminho"><a href="/">Início</a><span>/</span><span>O Escritório</span></nav><p class="eyebrow">O ESCRITÓRIO</p><h1>Experiência que transforma complexidade em caminho.</h1><p>Atendimento próximo, leitura técnica e comunicação clara em cada etapa.</p></div><section class="editorial-grid section-pad"><div><p class="eyebrow">QUEM SOMOS</p><h2>Uma relação construída com confiança.</h2><p>O Núcleo Advogados oferece soluções jurídicas personalizadas para demandas de natureza jurídica e empresarial. Cada caso é conduzido com ética, clareza e compromisso com os interesses de quem confia em nosso trabalho.</p></div><img src="/mauro-em-atividade.webp" width="768" height="1024" alt="Mauro Cesar Ramos de Almeida em atividade no Núcleo Advogados" loading="lazy"></section><section class="method section-pad"><div class="method-head"><p class="eyebrow">NOSSO MÉTODO</p><h2>Técnica, contexto e acompanhamento.</h2></div><ol><li><span>01</span><div><h3>Compreender</h3><p>Entender o contexto.</p></div></li><li><span>02</span><div><h3>Mapear</h3><p>Identificar riscos, possibilidades e consequências.</p></div></li><li><span>03</span><div><h3>Estruturar</h3><p>Construir uma estratégia jurídica adequada.</p></div></li><li><span>04</span><div><h3>Acompanhar</h3><p>Permanecer próximo durante toda a jornada.</p></div></li></ol></section><section class="simple-cta section-pad"><h2>Converse com o escritório.</h2><a class="button button-gold" href="/#contato">Entrar em contato ↗</a></section></main>'''
    page("O Escritório", "Conheça o Núcleo Advogados, seu método de trabalho e sua equipe.", "/escritorio.html", office)

    sectors = '''<main id="conteudo" class="inner-page"><div class="page-hero"><nav class="breadcrumbs" aria-label="Caminho"><a href="/">Início</a><span>/</span><span>Setores</span></nav><p class="eyebrow">SETORES</p><h1>O contexto do seu negócio importa.</h1><p>O atendimento começa pela compreensão da atividade, das pessoas e das decisões envolvidas.</p></div><section class="section-pad sector-page"><h2>Comece pela sua necessidade.</h2><p>As áreas de atuação podem se relacionar a diferentes setores. Estes caminhos ajudam você a encontrar o tema jurídico apropriado; a definição do trabalho depende de uma conversa com a equipe.</p><div class="sector-paths"><a href="/atuacao/empresarial-e-societario.html">Empresas e serviços <span>↗</span></a><a href="/atuacao/compliance-e-lgpd.html">Tecnologia e dados <span>↗</span></a><a href="/atuacao/familia-e-patrimonio.html">Imobiliário e patrimônio <span>↗</span></a><a href="/atuacao/tributario-e-administrativo.html">Finanças e tributos <span>↗</span></a><a href="/#contato">Saúde e outros contextos <span>↗</span></a></div></section></main>'''
    page("Setores", "Encontre áreas jurídicas relacionadas ao contexto da sua organização ou demanda.", "/setores.html", sectors)




def sitemap():
    paths = ["/", "/escritorio.html", "/setores.html", "/politica-de-privacidade.html", "/termos-de-uso.html"] + [f"/atuacao/{slug}.html" for slug, *_ in AREAS]
    write("sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + "".join(f"<url><loc>{BASE}{path}</loc></url>" for path in paths) + "</urlset>")
    write("search-index.json", dumps([{"title": name, "description": summary, "url": f"/atuacao/{slug}.html", "category": "Atuação"} for slug, name, summary, *_ in AREAS] + [
        {"title": "O Escritório", "description": "Quem somos, método e história institucional", "url": "/escritorio.html", "category": "Escritório"},
        {"title": "Setores", "description": "Empresas, tecnologia, imobiliário, finanças e saúde", "url": "/setores.html", "category": "Escritório"},
        {"title": "Contato", "description": "Endereços, telefone, e-mail e solicitação de atendimento", "url": "/#contato", "category": "Contato"},
        {"title": "Área do Cliente", "description": "Acesso seguro ao portal do cliente", "url": "/crm/", "category": "Portal"}
    ], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    home()
    details()
    sitemap()

(() => {
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.primary-nav');
  const theme = document.querySelector('.theme-toggle');
  const sheet = document.getElementById('light-theme');
  if (menu && nav) {
    const close = () => {
      menu.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-label', 'Abrir menu');
      nav.classList.remove('open');
      document.body.classList.remove('menu-open');
    };
    menu.addEventListener('click', () => {
      const open = menu.getAttribute('aria-expanded') !== 'true';
      menu.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      nav.classList.toggle('open', open);
      document.body.classList.toggle('menu-open', open);
    });
    nav.addEventListener('click', e => { if (e.target.closest('a')) close(); });
    window.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    window.addEventListener('resize', () => { if (innerWidth > 1050) close(); });
    for (const link of nav.querySelectorAll('a')) {
      if (link.pathname === location.pathname && !link.hash) link.setAttribute('aria-current', 'page');
    }
  }
  const updateTheme = () => {
    if (!theme || !sheet) return;
    const light = !sheet.disabled;
    theme.setAttribute('aria-pressed', String(light));
    theme.setAttribute('aria-label', light ? 'Ativar tema escuro' : 'Ativar tema claro');
    theme.querySelector('span').textContent = light ? '☾' : '☼';
  };
  updateTheme();
  theme?.addEventListener('click', () => {
    sheet.disabled = !sheet.disabled;
    try { localStorage.setItem('nucleo-theme', sheet.disabled ? 'dark' : 'light'); } catch {}
    updateTheme();
  });
  const form = document.getElementById('contact-form');
  form?.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const subject = 'Solicitação de atendimento — ' + String(data.get('subject') || 'Outro assunto');
    const body = [
      'Nome: ' + data.get('name'),
      'E-mail: ' + data.get('email'),
      'Telefone: ' + data.get('phone'),
      'Assunto: ' + data.get('subject'),
      '', 'Mensagem:', data.get('message')
    ].join('\n');
    const status = document.getElementById('contact-status');
    status.hidden = false;
    status.textContent = 'Mensagem preparada. Conclua o envio no seu aplicativo de e-mail.';
    location.href = 'mailto:contato@nucleoadvogados.com.br?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  });
  const search = document.getElementById('site-search');
  if (search) {
    const field = document.getElementById('search-query');
    const summary = document.getElementById('result-summary');
    const results = document.getElementById('search-results');
    const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const render = async () => {
      const query = new URLSearchParams(location.search).get('q')?.trim() || '';
      field.value = query;
      if (!query) { summary.textContent = 'Digite um termo para encontrar áreas, profissionais e páginas.'; results.replaceChildren(); return; }
      summary.textContent = 'Buscando…';
      try {
        const response = await fetch('/search-index.json');
        if (!response.ok) throw new Error('Busca indisponível');
        const data = await response.json();
        const terms = normalize(query).split(/\s+/).filter(Boolean);
        const found = data.filter(item => terms.every(term => normalize(item.title + ' ' + item.description + ' ' + item.category).includes(term)));
        results.replaceChildren();
        summary.textContent = found.length ? `${found.length} resultado${found.length === 1 ? '' : 's'} para “${query}”.` : `Nenhum conteúdo encontrado para “${query}”. Tente “tributário”, “família” ou “contato”.`;
        for (const item of found) {
          const link = document.createElement('a'); link.className = 'search-item'; link.href = item.url;
          const category = document.createElement('span'); category.textContent = item.category;
          const title = document.createElement('h2'); title.textContent = item.title;
          const description = document.createElement('p'); description.textContent = item.description;
          link.append(category, title, description); results.append(link);
        }
      } catch {
        summary.textContent = 'A busca está temporariamente indisponível. Use o menu ou entre em contato.';
      }
    };
    search.addEventListener('submit', e => {
      e.preventDefault(); const query = field.value.trim();
      history.replaceState(null, '', query ? '/busca.html?q=' + encodeURIComponent(query) : '/busca.html');
      render();
    });
    render();
  }
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
})();

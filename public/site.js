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
    window.addEventListener('resize', () => { if (innerWidth > 900) close(); });
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
  const presence = document.querySelector('.presence');
  if (presence) {
    const first = presence.children[0];
    const second = presence.children[1];
    if (first) first.innerHTML = '<strong>Brasil</strong><span>Atendimento nacional</span>';
    if (second) second.innerHTML = '<strong>1996</strong><span>Experiência jurídica</span>';
  }
  const additionalAreas = document.querySelector('.additional-areas');
  if (additionalAreas) additionalAreas.innerHTML = 'Outras frentes também podem ser analisadas pelo escritório, incluindo Direito Penal, Trabalhista, Saúde, Infraestrutura e Licitações. <a href="/atuacao/criminal.html">Conheça a atuação criminal ↗</a>';
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
})();

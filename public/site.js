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
  const form = document.getElementById('contact-form');
  if (form) {
    const leadCopy = document.querySelector('.contact-lead > p:not(.eyebrow)');
    if (leadCopy) leadCopy.textContent = 'Envie sua solicitação pelo atendimento inicial. Você receberá um protocolo e poderá acompanhar o andamento pelo painel.';
    const triage = document.createElement('div');
    triage.className = 'contact-form contact-triage';
    triage.innerHTML = '<p class="eyebrow">ATENDIMENTO INICIAL</p><h3>Vamos entender o seu caso.</h3><p>Conte o que aconteceu, crie seu acesso e acompanhe seu atendimento com segurança.</p><a class="button button-gold" href="/triagem.html">Falar com um advogado <span aria-hidden="true">→</span></a><p class="contact-help">Seu atendimento recebe um número de protocolo assim que a solicitação é enviada.</p>';
    form.replaceWith(triage);
  }
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
    status.textContent = ({en: 'Message prepared. Complete the send in your email application.', es: 'Mensaje preparado. Complete el envío en su aplicación de correo.', fr: 'Message préparé. Finalisez l’envoi dans votre messagerie.'})[document.documentElement.lang] || 'Mensagem preparada. Conclua o envio no seu aplicativo de e-mail.';
    location.href = 'mailto:contato@nucleoadvogados.com.br?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  });
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
})();

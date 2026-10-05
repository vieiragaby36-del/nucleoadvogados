(() => {
  if (!document.querySelector('link[href="/ai-assistente.css"]')) {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = '/ai-assistente.css';
    document.head.append(stylesheet);
  }
  const triggers = [...document.querySelectorAll('[data-ai-assistant]')];
  if (!triggers.length) return;
  const practiceAreas = [
    ['Trabalhista', 'Relações de trabalho, contratação, desligamento e conflitos entre empregados e empregadores.', 'Rescisão e verbas trabalhistas; salários e jornada; assédio no trabalho; acordos e defesa em ações.'],
    ['Criminal', 'Orientação e defesa em investigações e processos criminais.', 'Inquéritos e intimações; defesa criminal; prisões e medidas cautelares; acompanhamento em delegacias.'],
    ['Família e Sucessões', 'Questões familiares e organização da transmissão do patrimônio.', 'Divórcio e partilha; guarda e convivência; pensão alimentícia; inventário e planejamento sucessório.'],
    ['Cível e Contencioso', 'Prevenção e resolução de conflitos entre pessoas e organizações.', 'Contratos; indenizações; cobranças; defesa e acompanhamento de processos.'],
    ['Previdenciário', 'Questões relacionadas a benefícios e contribuições previdenciárias.', 'Aposentadorias; benefícios por incapacidade; pensão por morte; pedidos e recursos no INSS.'],
    ['Empresarial e Societário', 'Apoio jurídico às decisões e às relações de uma empresa.', 'Contratos empresariais; constituição e reorganização de sociedades; acordos entre sócios; prevenção de conflitos.'],
    ['Imobiliário', 'Questões jurídicas envolvendo imóveis e sua utilização.', 'Compra e venda; locações; questões condominiais; regularização e conflitos sobre imóveis.'],
    ['Tributário', 'Análise de obrigações fiscais e de conflitos com o Fisco.', 'Tributos e cobranças; autuações fiscais; dívida ativa; planejamento e revisão de questões tributárias.'],
    ['Consumidor', 'Conflitos nas relações entre consumidores e fornecedores.', 'Produtos e serviços; cobranças; negativação; problemas em compras e contratos de consumo.'],
    ['Compliance e LGPD', 'Organização de práticas de integridade e proteção de dados pessoais.', 'Adequação à LGPD; políticas e contratos; incidentes com dados; programas de integridade.'],
    ['Administrativo e Licitações', 'Relações com órgãos públicos e contratações administrativas.', 'Licitações; contratos administrativos; processos e sanções; orientação em relações com o poder público.'],
    ['Internacional e Arbitragem', 'Questões jurídicas com elementos internacionais e resolução de disputas por arbitragem.', 'Contratos internacionais; operações transnacionais; cláusulas arbitrais; acompanhamento de disputas.'],
    ['Saúde', 'Questões jurídicas relacionadas ao acesso e à prestação de serviços de saúde.', 'Planos de saúde; negativas de cobertura; contratos de serviços; análise de demandas assistenciais.'],
    ['Outro assunto', 'Não encontrou o tema do seu caso? A equipe pode analisar sua demanda e indicar o encaminhamento adequado.', 'Conte o que aconteceu, quando ocorreu e se há algum prazo informado em documento.']
  ];
  const areaKeys = ['trabalhista','criminal','familia','civel','previdenciario','empresarial','imobiliario','tributario','consumidor','lgpd','administrativo','internacional','saude','outro'];
  let selectedArea = null;

  const icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-8 8H7l-3 2 1.1-4A8 8 0 1 1 20 11.5Z"/><path d="M8 11.5h8M8 14.5h5"/></svg>';
  const dialog = document.createElement('dialog');
  dialog.className = 'ai-chat';
  dialog.setAttribute('aria-label', 'Assistente de orientação inicial');
  dialog.innerHTML = `
    <div class="ai-chat-shell">
      <aside class="ai-chat-sidebar" aria-label="Navegação do assistente">
        <div class="ai-chat-side-brand"><span class="ai-chat-symbol" aria-hidden="true">N</span><span>Núcleo Advogados</span></div>
        <button type="button" class="ai-chat-new ai-chat-side-new"><span aria-hidden="true">＋</span> Nova conversa</button>
        <nav class="ai-chat-areas" aria-label="Áreas jurídicas"><p>EXPLORE POR ÁREA</p>${practiceAreas.map((area, i) => `<button type="button" data-practice-area="${i}" aria-pressed="false">${area[0]}<span aria-hidden="true">›</span></button>`).join('')}</nav>
        <div class="ai-chat-side-bottom"><span>Um primeiro passo para entender seu caso.</span><a href="/triagem.html">Falar com um advogado <span aria-hidden="true">↗</span></a></div>
      </aside>
      <main class="ai-chat-main">
        <header class="ai-chat-header">
          <div class="ai-chat-brand"><strong>Assistente Núcleo</strong><span>Orientação inicial automatizada</span></div>
          <div class="ai-chat-header-actions"><button type="button" class="ai-chat-new ai-chat-mobile-new" aria-label="Nova conversa" title="Nova conversa">＋</button><button type="button" class="ai-chat-close" aria-label="Fechar conversa" title="Fechar conversa">×</button></div>
        </header>
        <div class="ai-chat-area-mobile"><label for="ai-practice-area">Área jurídica</label><select id="ai-practice-area"><option value="">Escolha uma área</option>${practiceAreas.map((area, i) => `<option value="${i}">${area[0]}</option>`).join('')}</select></div>
        <div class="ai-chat-messages" role="log" aria-label="Conversa" aria-live="polite" aria-relevant="additions"></div>
        <div class="ai-chat-bottom">
          <form class="ai-chat-form">
            <label class="sr-only" for="ai-chat-input">Sua mensagem</label>
            <textarea id="ai-chat-input" rows="1" maxlength="1800" placeholder="Pergunte ao Assistente Núcleo" required></textarea>
            <button type="submit" class="ai-chat-send" aria-label="Enviar mensagem" title="Enviar mensagem">↑</button>
          </form>
          <p>Orientação geral, não consulta jurídica. Evite enviar dados sensíveis. <a href="/politica-de-privacidade.html" target="_blank" rel="noopener">Privacidade</a></p>
        </div>
      </main>
    </div>`;
  document.body.append(dialog);

  const messages = dialog.querySelector('.ai-chat-messages');
  const input = dialog.querySelector('#ai-chat-input');
  const send = dialog.querySelector('.ai-chat-send');
  const areaButtons = [...dialog.querySelectorAll('[data-practice-area]')];
  const mobileArea = dialog.querySelector('#ai-practice-area');
  const sessions = new Map();
  let knowledge = [];
  let knowledgePromise = null;
  let responding = false;
  let responseVersion = 0;
  let draft = '';
  const selectArea = (index) => {
    selectedArea = index;
    areaButtons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.practiceArea) === index)));
    mobileArea.value = index === null ? '' : String(index);
    if (index !== null) areaButtons[index].scrollIntoView({ block: 'nearest' });
  };
  const loadKnowledge = () => {
    if (knowledgePromise) return knowledgePromise;
    const config = window.NUCLEO_SUPABASE || {};
    if (!config.url || !config.publishableKey) return Promise.resolve();
    knowledge = [];
    knowledgePromise = fetch(`${config.url}/rest/v1/assistant_area_qa?select=area_key,question,keywords,answer&is_published=eq.true&order=created_at.asc`, {
      headers: { apikey: config.publishableKey }, signal: AbortSignal.timeout(7000), cache: 'no-store'
    }).then(async response => {
      if (!response.ok) throw new Error(`Falha ao carregar respostas (${response.status})`);
      knowledge = await response.json();
    }).catch(error => { console.warn('Respostas do assistente indisponíveis:', error); });
    return knowledgePromise;
  };
  const renderMessage = (role, content, link = false) => {
    const row = document.createElement('div');
    row.className = `ai-chat-row ai-chat-row--${role}`;
    if (role === 'assistant') {
      const avatar = document.createElement('img');
      avatar.className = 'ai-chat-message-avatar';
      avatar.src = '/mauro-ai-avatar.png';
      avatar.alt = '';
      avatar.width = 44;
      avatar.height = 44;
      row.append(avatar);
    }
    const bubble = document.createElement('div');
    bubble.className = 'ai-chat-bubble';
    const paragraph = document.createElement('p');
    paragraph.textContent = content;
    bubble.append(paragraph);
    if (link) {
      const action = document.createElement('a');
      action.className = 'ai-chat-action';
      action.href = '/triagem.html';
      action.textContent = 'Falar com um advogado →';
      action.addEventListener('click', () => {
        try { sessionStorage.setItem('nucleo-ai-draft', draft.slice(0, 6000)); } catch {}
      });
      bubble.append(action);
    }
    row.append(bubble);
    messages.append(row);
    messages.scrollTop = messages.scrollHeight;
  };
  const addMessage = (role, content, link = false) => {
    if (selectedArea !== null) sessions.get(selectedArea).messages.push({ role, content, link });
    renderMessage(role, content, link);
  };
  const reset = () => {
    responseVersion++;
    responding = false;
    draft = '';
    sessions.clear();
    selectArea(null);
    messages.replaceChildren();
    const welcome = document.createElement('div');
    welcome.className = 'ai-chat-welcome';
    welcome.innerHTML = '<div class="ai-chat-avatar-stage"><img src="/mauro-ai-avatar.png" alt="Avatar do Assistente Núcleo" width="447" height="558"></div><span class="ai-chat-eyebrow">BEM-VINDO AO NÚCLEO</span><h2>Como podemos ajudar?</h2><p>Escolha uma área jurídica ao lado para conhecer os assuntos e iniciar sua conversa.</p>';
    messages.append(welcome);
    input.value = '';
    input.placeholder = 'Selecione uma área para começar';
    input.disabled = true;
    send.disabled = true;
  };
  const openArea = (index) => {
    const area = practiceAreas[index];
    if (!area || responding) return;
    if (selectedArea !== null) sessions.get(selectedArea).draft = draft;
    selectArea(index);
    if (!sessions.has(index)) sessions.set(index, { draft: '', messages: [] });
    draft = sessions.get(index).draft;
    messages.replaceChildren();
    const card = document.createElement('section');
    card.className = 'ai-chat-area-card';
    card.dataset.areaIndex = String(index);
    const title = document.createElement('h2');
    title.textContent = area[0];
    const intro = document.createElement('p');
    intro.textContent = area[1];
    const list = document.createElement('ul');
    area[2].split('; ').forEach(topic => {
      const item = document.createElement('li');
      item.textContent = topic;
      list.append(item);
    });
    const prompt = document.createElement('p');
    prompt.textContent = 'Conte sua situação no campo abaixo. A equipe confirmará o enquadramento e a possibilidade de atendimento.';
    const link = document.createElement('a');
    link.className = 'ai-chat-action';
    link.href = '/triagem.html';
    link.textContent = 'Iniciar atendimento nesta área →';
    link.addEventListener('click', () => {
      try { sessionStorage.setItem('nucleo-ai-draft', [area[0], draft].filter(Boolean).join('\n\n').slice(0, 6000)); } catch {}
    });
    card.append(title, intro, list, prompt, link);
    messages.append(card);
    sessions.get(index).messages.forEach(item => renderMessage(item.role, item.content, item.link));
    if (!sessions.get(index).messages.length) messages.scrollTop = 0;
    input.disabled = false;
    send.disabled = false;
    input.placeholder = `Pergunte sobre ${area[0]}`;
    input.focus({ preventScroll: true });
  };
  areaButtons.forEach(button => button.addEventListener('click', () => openArea(Number(button.dataset.practiceArea))));
  mobileArea.addEventListener('change', event => {
    if (event.target.value !== '') openArea(Number(event.target.value));
  });
  const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const stopWords = new Set(['como','qual','quais','para','sobre','essa','esse','esta','estou','com','uma','que','meu','minha','posso','ter','por','dos','das','nos','nas']);
  const words = (value) => normalize(value).split(' ').filter(word => word.length >= 4 && !stopWords.has(word));
  const respond = (text, index) => {
    const area = practiceAreas[index];
    const question = normalize(text);
    const asked = new Set(words(text));
    const match = knowledge.filter(item => item.area_key === areaKeys[index]).map(item => {
      const terms = new Set(words(item.question));
      const overlap = [...asked].filter(word => terms.has(word)).length;
      const phrases = String(item.keywords || '').split(';').map(normalize).filter(Boolean);
      const exactKeyword = phrases.some(phrase => question.includes(phrase));
      const questionMatch = question.length >= 10 && (normalize(item.question).includes(question) || question.includes(normalize(item.question)));
      return { item, score: overlap + (exactKeyword ? 4 : 0) + (questionMatch ? 5 : 0) };
    }).sort((a, b) => b.score - a.score)[0];
    if (match && match.score >= 2) return `${match.item.answer}\n\nEsta é uma orientação inicial. A equipe avaliará os detalhes do seu caso.`;
    return `Na área ${area[0]}, podemos ajudar a organizar o primeiro atendimento sobre ${area[1].charAt(0).toLowerCase() + area[1].slice(1)} Para direcionar sua solicitação, conte o que aconteceu, quando ocorreu e se há documento, intimação ou prazo. Se houver urgência, use “Iniciar atendimento nesta área” para falar com a equipe. Esta é uma orientação inicial e não substitui a avaliação de um advogado.`;
  };

  const addTyping = () => {
    const row = document.createElement('div');
    row.className = 'ai-chat-row ai-chat-row--assistant ai-chat-typing';
    row.innerHTML = '<img class="ai-chat-message-avatar" src="/mauro-ai-avatar.png" alt="" width="44" height="44"><div class="ai-chat-bubble"><p><span></span><span></span><span></span><em>Analisando sua pergunta…</em></p></div>';
    messages.append(row);
    messages.scrollTop = messages.scrollHeight;
    return row;
  };

  triggers.forEach(trigger => {
    trigger.innerHTML = icon + '<span class="sr-only">Abrir assistente de orientação</span>';
    trigger.setAttribute('aria-label', 'Abrir assistente de orientação');
    trigger.addEventListener('click', () => {
      dialog.showModal();
      trigger.setAttribute('aria-expanded', 'true');
      knowledgePromise = null;
      loadKnowledge();
      if (!messages.children.length) reset();
      else if (!input.disabled) input.focus();
    });
  });
  dialog.addEventListener('close', () => triggers.forEach(trigger => trigger.setAttribute('aria-expanded', 'false')));
  dialog.querySelector('.ai-chat-close').addEventListener('click', () => dialog.close());
  dialog.querySelectorAll('.ai-chat-new').forEach(button => button.addEventListener('click', reset));
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.querySelector('.ai-chat-form').addEventListener('submit', async event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || responding || selectedArea === null) return;
    const index = selectedArea;
    addMessage('user', text);
    draft = [draft, text].filter(Boolean).join('\n\n');
    sessions.get(index).draft = draft;
    input.value = '';
    responding = true;
    const version = ++responseVersion;
    send.disabled = true;
    const typing = addTyping();
    try {
      await loadKnowledge();
      if (version !== responseVersion) return;
      typing.remove();
      addMessage('assistant', respond(text, index), true);
    } catch (error) {
      if (version !== responseVersion) return;
      typing.remove();
      addMessage('assistant', 'Tive uma instabilidade ao analisar sua mensagem. Tente novamente ou fale diretamente com um advogado pelo formulário de atendimento.');
      console.error('Assistente Núcleo:', error);
    } finally {
      if (version === responseVersion) {
        responding = false;
        send.disabled = selectedArea === null;
        if (selectedArea !== null) input.focus({ preventScroll: true });
      }
    }
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      dialog.querySelector('.ai-chat-form').requestSubmit();
    }
  });
})();

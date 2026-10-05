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
  let draft = '';
  let scrollSyncPending = false;
  const selectArea = (index) => {
    if (selectedArea === index) return;
    selectedArea = index;
    areaButtons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.practiceArea) === index)));
    mobileArea.value = index === null ? '' : String(index);
    if (index !== null) areaButtons[index].scrollIntoView({ block: 'nearest' });
  };
  const syncAreaFromScroll = () => {
    scrollSyncPending = false;
    const cards = [...messages.querySelectorAll('.ai-chat-area-card')];
    if (!cards.length) return selectArea(null);
    const marker = messages.getBoundingClientRect().top + Math.min(messages.clientHeight * .45, 320);
    const current = [...cards].reverse().find(card => card.getBoundingClientRect().top <= marker) || cards[0];
    selectArea(Number(current.dataset.areaIndex));
  };
  messages.addEventListener('scroll', () => {
    if (scrollSyncPending) return;
    scrollSyncPending = true;
    requestAnimationFrame(syncAreaFromScroll);
  }, { passive: true });
  const addMessage = (role, content, link = false) => {
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
  const reset = () => {
    draft = '';
    selectArea(null);
    messages.replaceChildren();
    const welcome = document.createElement('div');
    welcome.className = 'ai-chat-welcome';
    welcome.innerHTML = '<div class="ai-chat-avatar-stage"><img src="/mauro-ai-avatar.png" alt="Avatar do Assistente Núcleo" width="447" height="558"></div><span class="ai-chat-eyebrow">BEM-VINDO AO NÚCLEO</span><h2>Como podemos ajudar?</h2><p>Conte sua situação com suas palavras. Posso ajudar a organizar os fatos para o primeiro atendimento com a equipe.</p>';
    messages.append(welcome);
    input.value = '';
    input.focus();
  };
  const openArea = (index) => {
    const area = practiceAreas[index];
    if (!area || send.disabled) return;
    selectArea(index);
    const existing = messages.querySelector(`.ai-chat-area-card[data-area-index="${index}"]`);
    if (existing) {
      messages.scrollTop += existing.getBoundingClientRect().top - messages.getBoundingClientRect().top - 20;
      input.focus({ preventScroll: true });
      return;
    }
    messages.querySelector('.ai-chat-welcome')?.remove();
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
    messages.scrollTop = messages.scrollHeight;
    input.focus({ preventScroll: true });
  };
  areaButtons.forEach(button => button.addEventListener('click', () => openArea(Number(button.dataset.practiceArea))));
  mobileArea.addEventListener('change', event => {
    if (event.target.value !== '') openArea(Number(event.target.value));
  });
  const respond = (text) => {
    const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (normalized.includes('trabalhista') || normalized.includes('trabalho')) {
      return 'Pelo que você descreveu, a demanda pode estar relacionada a Direito Trabalhista. Organize contrato de trabalho, holerites, registro de ponto, mensagens e documentos de rescisão. Como você mencionou audiência ou prazo, informe a data exata à equipe e procure atendimento humano imediatamente. Esta é uma orientação geral e não substitui a análise individual de um advogado.';
    }
    const areas = [
      { pattern: /trabalh|demiss|salario|ferias|fgts|rescis|justa causa|horas extras|assedi/, name: 'Trabalhista', documents: 'contrato de trabalho, holerites, registro de ponto, mensagens e documentos de rescisão', next: 'Confira as datas de admissão, afastamento ou desligamento e não assine um documento sem entendê-lo.' },
      { pattern: /divorc|guarda|pensao|heran|inventario|familia|uniao estavel|partilha/, name: 'Família e Sucessões', documents: 'certidões, comprovantes, acordos e registros das conversas relevantes', next: 'Separe as datas importantes, a situação atual dos envolvidos e o que você pretende alcançar.' },
      { pattern: /empresa|socio|contrato social|societ|startup|negocio|franquia/, name: 'Empresarial e Societário', documents: 'contrato social, acordos, contratos, notas e comunicações entre as partes', next: 'Identifique quem são os envolvidos, os prazos contratuais e o risco que precisa ser evitado.' },
      { pattern: /imovel|aluguel|locacao|compra e venda|condominio|despejo|usucap/, name: 'Imobiliário', documents: 'contrato, matrícula, comprovantes de pagamento, notificações e fotos', next: 'Não entregue chaves, assine distrato ou faça pagamentos sem guardar os comprovantes e analisar o documento.' },
      { pattern: /crime|delegacia|inquerito|prisao|acus|boletim|flagrante|policia/, name: 'Criminal', documents: 'intimações e documentos recebidos, sem enviar dados sensíveis por este chat', next: 'Se houver prisão, busca, intimação ou depoimento marcado, procure atendimento humano imediatamente.' },
      { pattern: /tribut|imposto|multa fiscal|fisco|icms|iss|irpf|execucao fiscal|divida ativa/, name: 'Tributário e Administrativo', documents: 'notificações, autos, guias, decisões e comprovantes relacionados à cobrança', next: 'Anote a data da ciência e o prazo indicado no documento, pois a resposta pode depender dele.' },
      { pattern: /aposent|inss|beneficio|previdenc|auxilio|bpc/, name: 'Previdenciário', documents: 'comunicações do INSS, comprovantes de contribuição, laudos e pedidos anteriores', next: 'Guarde o protocolo do pedido e confira a data da decisão ou da perícia.' },
      { pattern: /compra|cobranca|produto|consumidor|servico|negativ|cartao|banco/, name: 'Consumidor', documents: 'contratos, notas, comprovantes de pagamento, protocolos e mensagens', next: 'Registre o protocolo de atendimento e organize uma linha do tempo das tentativas de solução.' },
      { pattern: /lgpd|dado pessoal|vazamento|privacidade|compliance|protecao de dados/, name: 'Compliance e LGPD', documents: 'políticas, contratos, comunicações, evidências do incidente e registros de acesso', next: 'Preserve os registros do ocorrido e evite apagar evidências antes de uma análise.' }
    ];
    const match = areas.find(item => item.pattern.test(normalized))
      || (normalized.includes('trabalh') ? areas[0] : null)
      || (normalized.includes('criminal') ? areas[4] : null)
      || (normalized.includes('tribut') ? areas[5] : null)
      || (normalized.includes('famil') ? areas[1] : null);
    const urgency = /hoje|amanha|prazo|urgente|preso|prisao|intimacao|audiencia|liminar|bloqueio|venc(e|ê) amanhã/.test(normalized);
    let message = match
      ? `Pelo que você descreveu, a demanda pode estar relacionada a ${match.name}. Para uma análise inicial, organize ${match.documents}. ${match.next}`
      : 'Para eu orientar melhor, informe qual é o assunto, quando aconteceu, quem está envolvido, se existe prazo ou urgência e o que você já tentou resolver. Você também pode iniciar o atendimento pelo formulário para receber um protocolo.';
    if (urgency) message += ' Você mencionou possível urgência ou prazo. Informe a data exata à equipe e procure atendimento humano o quanto antes.';
    message += ' Esta é uma orientação geral e não substitui a análise individual de um advogado.';
    return message;
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
      if (!messages.children.length) reset();
      else input.focus();
    });
  });
  dialog.addEventListener('close', () => triggers.forEach(trigger => trigger.setAttribute('aria-expanded', 'false')));
  dialog.querySelector('.ai-chat-close').addEventListener('click', () => dialog.close());
  dialog.querySelectorAll('.ai-chat-new').forEach(button => button.addEventListener('click', reset));
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.querySelector('.ai-chat-form').addEventListener('submit', event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || send.disabled) return;
    messages.querySelector('.ai-chat-welcome')?.remove();
    addMessage('user', text);
    draft = [draft, text].filter(Boolean).join('\n\n');
    input.value = '';
    send.disabled = true;
    const typing = addTyping();
    window.setTimeout(() => {
      try {
        typing.remove();
        addMessage('assistant', respond(text), true);
      } catch (error) {
        typing.remove();
        addMessage('assistant', 'Tive uma instabilidade ao analisar sua mensagem. Tente novamente ou fale diretamente com um advogado pelo formulário de atendimento.');
        console.error('Assistente Núcleo:', error);
      } finally {
        send.disabled = false;
        input.focus();
      }
    }, 420);
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      dialog.querySelector('.ai-chat-form').requestSubmit();
    }
  });
})();

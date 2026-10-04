(() => {
  if (!document.querySelector('link[href="/ai-assistente.css"]')) {
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = '/ai-assistente.css';
    document.head.append(stylesheet);
  }
  const triggers = [...document.querySelectorAll('[data-ai-assistant]')];
  if (!triggers.length) return;

  const icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-8 8H7l-3 2 1.1-4A8 8 0 1 1 20 11.5Z"/><path d="M8 11.5h8M8 14.5h5"/></svg>';
  const dialog = document.createElement('dialog');
  dialog.className = 'ai-chat';
  dialog.setAttribute('aria-label', 'Assistente de orientação inicial');
  dialog.innerHTML = `
    <div class="ai-chat-shell">
      <aside class="ai-chat-sidebar" aria-label="Navegação do assistente">
        <div class="ai-chat-side-brand"><span class="ai-chat-symbol" aria-hidden="true">N</span><span>Núcleo Advogados</span></div>
        <button type="button" class="ai-chat-new ai-chat-side-new"><span aria-hidden="true">＋</span> Nova conversa</button>
        <div class="ai-chat-side-bottom"><span>Um primeiro passo para entender seu caso.</span><a href="/triagem.html">Falar com um advogado <span aria-hidden="true">↗</span></a></div>
      </aside>
      <main class="ai-chat-main">
        <header class="ai-chat-header">
          <div class="ai-chat-brand"><strong>Assistente Núcleo</strong><span>Orientação inicial automatizada</span></div>
          <div class="ai-chat-header-actions"><button type="button" class="ai-chat-new ai-chat-mobile-new" aria-label="Nova conversa" title="Nova conversa">＋</button><button type="button" class="ai-chat-close" aria-label="Fechar conversa" title="Fechar conversa">×</button></div>
        </header>
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
  let draft = '';
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
    messages.replaceChildren();
    const welcome = document.createElement('div');
    welcome.className = 'ai-chat-welcome';
    welcome.innerHTML = '<div class="ai-chat-avatar-stage"><img src="/mauro-ai-avatar.png" alt="Avatar do Assistente Núcleo" width="447" height="558"></div><span class="ai-chat-eyebrow">BEM-VINDO AO NÚCLEO</span><h2>Como podemos ajudar?</h2><p>Conte sua situação com suas palavras. Posso ajudar a organizar os fatos para o primeiro atendimento com a equipe.</p>';
    messages.append(welcome);
    input.value = '';
    input.focus();
  };
  const respond = (text) => {
    const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
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

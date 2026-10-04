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
      <header class="ai-chat-header">
        <div class="ai-chat-brand"><span class="ai-chat-symbol" aria-hidden="true">N</span><div><strong>Assistente Núcleo</strong><span>Orientação inicial automatizada</span></div></div>
        <div class="ai-chat-header-actions"><button type="button" class="ai-chat-new" title="Nova conversa">Nova conversa</button><button type="button" class="ai-chat-close" aria-label="Fechar conversa">×</button></div>
      </header>
      <div class="ai-chat-messages" role="log" aria-label="Conversa" aria-live="polite" aria-relevant="additions"></div>
      <div class="ai-chat-bottom">
        <form class="ai-chat-form">
          <label class="sr-only" for="ai-chat-input">Sua mensagem</label>
          <textarea id="ai-chat-input" rows="2" maxlength="1800" placeholder="Escreva sua dúvida aqui…" required></textarea>
          <button type="submit" class="ai-chat-send" aria-label="Enviar mensagem" title="Enviar mensagem">↑</button>
        </form>
        <p>Não envie documentos, CPF, senhas ou informações sigilosas. Orientação geral, não consulta jurídica. <a href="/politica-de-privacidade.html" target="_blank" rel="noopener">Privacidade</a></p>
      </div>
    </div>`;
  document.body.append(dialog);

  const messages = dialog.querySelector('.ai-chat-messages');
  const input = dialog.querySelector('#ai-chat-input');
  const send = dialog.querySelector('.ai-chat-send');
  let draft = '';
  const addMessage = (role, content, link = false) => {
    const row = document.createElement('div');
    row.className = `ai-chat-row ai-chat-row--${role}`;
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
    addMessage('assistant', 'Olá! Posso ajudar você a organizar os fatos e identificar quais informações levar ao primeiro atendimento. Conte, com suas palavras, o que aconteceu. Evite compartilhar dados pessoais sensíveis.');
    input.value = '';
    input.focus();
  };
  const respond = (text) => {
    const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const areas = [
      { pattern: /trabalho|demiss|salario|ferias|fgts|rescis/, name: 'Trabalhista', documents: 'contrato de trabalho, holerites, mensagens e documentos de rescisão' },
      { pattern: /divorc|guarda|pensao|heran|inventario|familia/, name: 'Família e Sucessões', documents: 'certidões, acordos, comprovantes e registros das conversas relevantes' },
      { pattern: /empresa|socio|contrato social|societ/, name: 'Empresarial', documents: 'contrato social, acordos, contratos e comunicações entre as partes' },
      { pattern: /imovel|aluguel|locacao|compra e venda|condominio/, name: 'Imobiliário', documents: 'contrato, matrícula, comprovantes e notificações' },
      { pattern: /crime|delegacia|inquerito|prisao|acus/, name: 'Criminal', documents: 'intimações e documentos recebidos, sem enviá-los por este chat' },
      { pattern: /tribut|imposto|multa fiscal|fisco/, name: 'Tributário', documents: 'notificações, autos, guias e comprovantes relacionados à cobrança' },
      { pattern: /aposent|inss|beneficio|previdenc/, name: 'Previdenciário', documents: 'comunicações do INSS, comprovantes de contribuição e pedidos anteriores' },
      { pattern: /compra|cobranca|produto|consumidor|servico/, name: 'Consumidor', documents: 'contratos, notas, comprovantes de pagamento e protocolos de atendimento' }
    ];
    const match = areas.find(item => item.pattern.test(normalized));
    const urgency = /hoje|amanha|prazo|urgente|preso|prisao|intimacao|audiencia/.test(normalized);
    let message = match
      ? `Pelo seu relato, o assunto pode estar relacionado a ${match.name}. Para a equipe entender melhor, organize uma linha do tempo com as datas e separe ${match.documents}.`
      : 'Para organizar sua demanda, anote quando os fatos aconteceram, quem está envolvido, o que você já tentou resolver e quais documentos possui.';
    if (urgency) message += ' Você mencionou possível urgência ou prazo: informe a data exata à equipe e procure atendimento humano o quanto antes.';
    message += ' Esta é apenas uma orientação geral; o enquadramento e os próximos passos dependem da análise de um profissional.';
    return message;
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
  dialog.querySelector('.ai-chat-new').addEventListener('click', reset);
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.querySelector('.ai-chat-form').addEventListener('submit', event => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || send.disabled) return;
    addMessage('user', text);
    draft = [draft, text].filter(Boolean).join('\n\n');
    input.value = '';
    send.disabled = true;
    requestAnimationFrame(() => {
      addMessage('assistant', respond(text), true);
      send.disabled = false;
      input.focus();
    });
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      dialog.querySelector('.ai-chat-form').requestSubmit();
    }
  });
})();

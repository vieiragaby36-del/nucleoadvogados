(() => {
  if (!document.querySelector('link[href="/ai-avatar-overrides.css"]')) { const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = '/ai-avatar-overrides.css'; document.head.append(link); }
  const triggers = [...document.querySelectorAll('[data-ai-assistant]')];
  if (!triggers.length) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'ai-assistant-dialog';
  dialog.innerHTML = `<div class="ai-assistant-head"><div><p class="eyebrow">ORIENTAÇÃO INICIAL</p><h2>Como podemos organizar sua dúvida?</h2><p>Uma primeira leitura para você chegar mais preparado ao atendimento.</p></div><button class="ai-assistant-close" type="button" aria-label="Fechar">×</button></div><div class="ai-assistant-body"><label for="ai-assistant-question">Descreva, com suas palavras, o que aconteceu<textarea id="ai-assistant-question" maxlength="1800" placeholder="Ex.: Recebi uma cobrança que não reconheço e quero saber quais informações devo separar."></textarea></label><div class="ai-assistant-actions"><button class="button button-gold" type="button" data-ai-send>Gerar orientação inicial <span aria-hidden="true">→</span></button><a class="button button-outline" href="/triagem.html">Falar com um advogado</a></div><div class="ai-assistant-answer" data-ai-answer hidden></div><p class="ai-assistant-note">Esta ferramenta oferece informação geral para ajudar a organizar o primeiro contato. Não é consulta, parecer ou promessa de resultado. Evite inserir CPF, documentos, senhas ou informações sigilosas. <a href="/politica-de-privacidade.html" target="_blank" rel="noopener">Saiba como tratamos seus dados</a>.</p><div class="ai-assistant-avatar"><img src="/mauro-ai-avatar.png" alt="Mauro Cesar Ramos de Almeida"><div><strong>Atendimento Núcleo</strong><span>Depois da orientação inicial, nossa equipe pode analisar o seu caso.</span></div></div></div>`;
  document.body.append(dialog);
  const question = dialog.querySelector('#ai-assistant-question');
  const answer = dialog.querySelector('[data-ai-answer]');
  const close = () => dialog.close();
  triggers.forEach(trigger => trigger.addEventListener('click', () => { dialog.showModal(); setTimeout(() => question.focus(), 0); }));
  dialog.querySelector('.ai-assistant-close').addEventListener('click', close);
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
  dialog.querySelector('[data-ai-send]').addEventListener('click', () => {
    const text = question.value.trim();
    if (text.length < 12) { answer.hidden = false; answer.innerHTML = '<strong>Conte um pouco mais</strong>Descreva o fato principal, quando aconteceu e qual é a sua dúvida. Não inclua dados pessoais sensíveis.'; question.focus(); return; }
    const normalized = text.toLowerCase();
    let area = 'Cível ou Consumidor';
    let checklist = 'Separe contratos, comprovantes, comunicações e uma linha do tempo dos fatos.';
    if (/trabalho|demiss|salário|ferias|fgts|rescis/.test(normalized)) { area = 'Trabalhista'; checklist = 'Separe contrato, holerites, mensagens, documentos de rescisão e as datas principais.'; }
    else if (/divórc|guarda|pensão|heran|inventário|família/.test(normalized)) { area = 'Família e Sucessões'; checklist = 'Separe documentos pessoais, certidões, comprovantes e registros que ajudem a explicar a situação.'; }
    else if (/empresa|sócio|contrato social|societ/.test(normalized)) { area = 'Empresarial'; checklist = 'Separe contrato social, acordos, contratos relacionados e comunicações entre as partes.'; }
    else if (/imóvel|aluguel|locação|compra e venda|condomínio/.test(normalized)) { area = 'Imobiliário'; checklist = 'Separe matrícula, contrato, comprovantes, notificações e informações sobre prazos.'; }
    else if (/crime|delegacia|inquérito|prisão|acus/.test(normalized)) { area = 'Criminal'; checklist = 'Se houver risco imediato ou prisão, procure atendimento jurídico urgente e preserve intimações e documentos.'; }
    else if (/tribut|imposto|multa fiscal|fisco/.test(normalized)) { area = 'Tributário'; checklist = 'Separe notificações, autos, guias, comprovantes e os períodos a que a cobrança se refere.'; }
    answer.hidden = false;
    answer.innerHTML = `<strong>Orientação inicial</strong>Seu relato parece relacionado a <b>${area}</b>. ${checklist} A equipe do Núcleo Advogados poderá confirmar o enquadramento e indicar os próximos passos após conhecer os detalhes. <br><br><a class="button button-gold" data-ai-continue href="/triagem.html">Continuar para a triagem segura →</a>`;
    answer.querySelector('[data-ai-continue]').addEventListener('click', () => { try { sessionStorage.setItem('nucleo-ai-draft', text); } catch {} });
  });
})();

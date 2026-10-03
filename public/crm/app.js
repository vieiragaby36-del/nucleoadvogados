const config = window.NUCLEO_SUPABASE || {};
const configured = /^https:\/\/.+\.supabase\.co$/.test(config.url || "") && !String(config.publishableKey || "").startsWith("__");
let supabase = null;
if (configured) {
  const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm");
  supabase = createClient(config.url, config.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
}
const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
const date = (value) => value ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${String(value).slice(0, 10)}T12:00:00Z`)) : "Sem data";
const state = { session: null, profile: null, contacts: [], cases: [], tasks: [], team: [], lawyers: [], requestProfiles: [], requests: [], documents: [], assignments: [], view: "dashboard", search: "", editing: null, entity: null, signupDraft: null };
let recoveryActive = /(?:^|[&#?])type=recovery(?:&|$)/.test(`${location.search}${location.hash}`);
const staff = () => ["owner", "staff"].includes(state.profile?.role);
const authRedirectUrl = () => new URL("/crm/", location.origin).toString();

function showMessage(target, message = "", type = "") {
  const node = $(target);
  node.textContent = message;
  node.className = `message${type ? ` ${type}` : ""}${message ? "" : " hidden"}`;
}

function showAuth() {
  $("#boot").classList.add("hidden");
  $("#portal").classList.add("hidden");
  $("#auth").classList.remove("hidden");
  $("#recovery-form").classList.add("hidden");
  $("#signup-form").classList.add("hidden");
  $("#auth-form").classList.remove("hidden");
  $(".auth-actions").classList.remove("hidden");
}

function showRecovery() {
  $("#boot").classList.add("hidden");
  $("#portal").classList.add("hidden");
  $("#auth").classList.remove("hidden");
  $("#auth-form").classList.add("hidden");
  $("#signup-form").classList.add("hidden");
  $(".auth-actions").classList.add("hidden");
  $("#recovery-form").classList.remove("hidden");
  $("#auth-title").textContent = "Definir nova senha";
  $("#auth-copy").textContent = "Escolha uma senha segura para voltar ao portal.";
  showMessage("#auth-message");
}

function setAuthMode(mode) {
  const content = {
    login: ["Entrar no portal", "Use o e-mail cadastrado junto ao escritório.", "Entrar"],
    signup: ["Criar acesso", "Informe seu e-mail e senha para começar. Em seguida, você preencherá seus dados antes da confirmação por e-mail.", "Continuar cadastro"],
    reset: ["Recuperar senha", "Enviaremos um link seguro para o seu e-mail.", "Enviar link"]
  }[mode];
  $("#auth-form").dataset.mode = mode;
  $("#auth-form").classList.remove("hidden");
  $("#recovery-form").classList.add("hidden");
  $("#signup-form").classList.add("hidden");
  $(".auth-actions").classList.remove("hidden");
  $("#auth-title").textContent = content[0];
  $("#auth-copy").textContent = content[1];
  $("#auth-submit").textContent = content[2];
  $("#password-field").classList.toggle("hidden", mode === "reset");
  $("#auth-password").required = mode !== "reset";
  document.querySelectorAll("[data-auth-mode]").forEach((button) => button.classList.toggle("hidden", button.dataset.authMode === mode || (mode === "login" && button.dataset.authMode === "login")));
  showMessage("#auth-message");
}

async function submitAuth(event) {
  event.preventDefault();
  if (!supabase) return showMessage("#auth-message", "O portal ainda aguarda a configuração do banco de dados.", "error");
  const mode = event.currentTarget.dataset.mode || "login";
  const email = $("#auth-email").value.trim().toLowerCase();
  const password = $("#auth-password").value;
  const button = $("#auth-submit");
  if (mode === "signup") {
    state.signupDraft = { email, password };
    $("#auth-form").classList.add("hidden");
    $("#signup-form").classList.remove("hidden");
    $(".auth-actions").classList.add("hidden");
    $("#auth-title").textContent = "Complete seu cadastro";
    $("#auth-copy").textContent = "Preencha seus dados. Só depois enviaremos a confirmação para o seu e-mail.";
    showMessage("#auth-message");
    $("#signup-form").elements.full_name.focus();
    return;
  }
  button.disabled = true;
  try {
    let result;
    if (mode === "signup") result = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: authRedirectUrl() } });
    else if (mode === "reset") result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl() });
    else result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    if (mode === "reset") showMessage("#auth-message", "Se existir uma conta para este e-mail, enviaremos o link de recuperação. Confira spam e aguarde alguns minutos antes de solicitar outro.", "success");
  } catch (error) {
    showMessage("#auth-message", authError(error.message), "error");
  } finally { button.disabled = false; }
}

async function submitSignup(event) {
  event.preventDefault();
  if (!supabase) return showMessage("#auth-message", "O portal ainda aguarda a configuração do banco de dados.", "error");
  if (!state.signupDraft) return setAuthMode("signup");
  const button = $("#signup-submit");
  button.disabled = true;
  try {
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const data = {
      full_name: String(values.full_name || "").trim(),
      phone: String(values.phone || "").trim(),
      subject: String(values.subject || "").trim(),
      description: String(values.description || "").trim()
    };
    const result = await supabase.auth.signUp({
      email: state.signupDraft.email,
      password: state.signupDraft.password,
      options: { emailRedirectTo: authRedirectUrl(), data }
    });
    if (result.error) throw result.error;
    state.signupDraft = null;
    $("#auth-password").value = "";
    if (result.data?.session) return handleSession(result.data.session);
    $("#signup-form").classList.add("hidden");
    $("#auth-form").classList.remove("hidden");
    $(".auth-actions").classList.remove("hidden");
    setAuthMode("login");
    showMessage("#auth-message", "Cadastro recebido. Agora confirme o e-mail enviado para liberar seu acesso ao portal. Confira também o spam.", "success");
  } catch (error) {
    showMessage("#auth-message", authError(error.message), "error");
  } finally { button.disabled = false; }
}

async function submitRecovery(event) {
  event.preventDefault();
  if (!supabase || !state.session) return showMessage("#auth-message", "Abra novamente o link de recuperação enviado ao seu e-mail.", "error");
  const password = $("#new-password").value;
  if (password !== $("#confirm-password").value) return showMessage("#auth-message", "As senhas não coincidem.", "error");
  const button = $("#recovery-submit"); button.disabled = true;
  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    recoveryActive = false;
    await supabase.auth.signOut();
    showAuth(); setAuthMode("login");
    showMessage("#auth-message", "Senha atualizada. Entre com a nova senha.", "success");
  } catch (error) {
    showMessage("#auth-message", authError(error.message), "error");
  } finally { button.disabled = false; }
}

function authError(message = "") {
  message = String(message || "");
  if (/invalid login|invalid[_ ]credentials|invalid.*credential/i.test(message)) return "E-mail ou senha inválidos. Confira os dados ou use ‘Esqueci a senha’.";
  if (/already registered|user already exists/i.test(message)) return "Este e-mail já possui cadastro. Use ‘Esqueci a senha’ ou confirme o cadastro recebido por e-mail.";
  if (/email.*not authorized|email_address_not_authorized/i.test(message)) return "O envio de e-mails ainda não está liberado para este endereço. O escritório precisa configurar um servidor SMTP próprio no Supabase.";
  if (/redirect|url.*not allowed|redirect.*not authorized/i.test(message)) return "O endereço de retorno do portal ainda não foi liberado no Supabase. Configure https://nucleoadvogados.onrender.com/crm/ em Auth → URL Configuration.";
  if (/rate limit|too many|email.*limit|after.*seconds/i.test(message)) return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
  if (/email not confirmed/i.test(message)) return "Confirme seu e-mail antes de entrar. Se não recebeu a mensagem, solicite um novo cadastro ou recuperação.";
  if (/database error saving new user|trigger|relation .* does not exist/i.test(message)) return "O cadastro não pôde ser concluído porque a estrutura do portal no Supabase precisa ser atualizada. Avise o administrador do site.";
  if (/failed to fetch|network|fetch/i.test(message)) return "Não foi possível conectar ao serviço de acesso. Verifique sua internet e tente novamente.";
  if (/invalid.*email|valid.*email/i.test(message)) return "Informe um e-mail válido.";
  if (/expired|invalid.*link|otp/i.test(message)) return "O link expirou ou é inválido. Solicite um novo link de recuperação.";
  if (/password/i.test(message)) return "A senha precisa ter pelo menos 8 caracteres.";
  return "Não foi possível concluir o acesso. Tente novamente.";
}

function portalError(error) {
  const message = String(error?.message || error || "");
  if (/permission denied|row-level security|not authorized/i.test(message)) return "Seu acesso foi autenticado, mas o perfil ainda não tem permissão no portal. Confirme o e-mail e tente novamente.";
  if (/failed to fetch|network|fetch/i.test(message)) return "Não foi possível conectar ao portal. Verifique sua internet e tente novamente.";
  if (/profiles|client_requests|client_documents|does not exist/i.test(message)) return "O banco do portal ainda não terminou de sincronizar seu cadastro. Aguarde alguns segundos e entre novamente.";
  return authError(message);
}

function showUrlError() {
  const params = new URLSearchParams(`${location.search}&${location.hash.replace(/^#/, "")}`);
  const error = params.get("error_description") || params.get("error");
  if (error) showMessage("#auth-message", authError(error), "error");
}

async function handleSession(session) {
  state.session = session;
  if (recoveryActive) {
    if (session) return showRecovery();
    recoveryActive = false;
    showAuth(); setAuthMode("reset");
    showMessage("#auth-message", "O link expirou ou é inválido. Solicite um novo link de recuperação.", "error");
    return;
  }
  if (!session) return showAuth();
  $("#auth").classList.add("hidden");
  $("#boot").classList.remove("hidden");
  await loadPortal();
}

async function loadPortal() {
  try {
    const userId = state.session.user.id;
    const { data: profile, error } = await supabase.from("profiles").select("id,email,full_name,role,contact_id").eq("id", userId).single();
    if (error) throw error;
    state.profile = profile;
    if (profile.role === "pending") {
      state.contacts = []; state.cases = []; state.tasks = []; state.team = []; state.lawyers = []; state.assignments = [];
      const [requests, documents] = await Promise.all([
        supabase.from("client_requests").select("*").eq("user_id", userId),
        supabase.from("client_documents").select("*").eq("user_id", userId).order("created_at", { ascending: false })
      ]);
      if (requests.error || documents.error) throw requests.error || documents.error;
      state.requests = requests.data || []; state.documents = documents.data || [];
      const metadata = state.session.user.user_metadata || {};
      if (!state.requests.length && metadata.full_name && metadata.subject) {
        const created = await supabase.from("client_requests").insert({ user_id: userId, full_name: String(metadata.full_name).trim(), phone: String(metadata.phone || "").trim(), subject: String(metadata.subject).trim(), description: String(metadata.description || "").trim() });
        if (created.error && !/duplicate|unique/i.test(created.error.message || "")) throw created.error;
        const refreshed = await supabase.from("client_requests").select("*").eq("user_id", userId);
        if (refreshed.error) throw refreshed.error;
        state.requests = refreshed.data || [];
      }
    } else {
      const [contacts, cases, tasks, team, lawyers, requestProfiles, requests, documents, assignments] = await Promise.all([
        staff() ? supabase.from("contacts").select("*").order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
        supabase.from("cases").select("*").order("updated_at", { ascending: false }),
        supabase.from("tasks").select("*").order("due_at", { ascending: true }),
        profile.role === "owner" ? supabase.from("team_invites").select("email,created_at").order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
        profile.role === "owner" ? supabase.from("profiles").select("id,email,full_name,role").eq("role","staff") : Promise.resolve({ data: [] }),
        profile.role === "owner" ? supabase.from("profiles").select("id,email,full_name,role,contact_id") : Promise.resolve({ data: [] }),
        profile.role === "owner" ? supabase.from("client_requests").select("*").order("created_at", { ascending: false }) : supabase.from("client_requests").select("*").eq("user_id",userId),
        supabase.from("client_documents").select("*").order("created_at", { ascending: false }),
        staff() ? supabase.from("client_assignments").select("*") : Promise.resolve({ data: [] })
      ]);
      const failed = [contacts, cases, tasks, team, lawyers, requestProfiles, requests, documents, assignments].find((result) => result.error);
      if (failed) throw failed.error;
      [state.contacts, state.cases, state.tasks, state.team] = [contacts, cases, tasks, team].map((result) => result.data || []);
      [state.lawyers, state.requestProfiles, state.requests, state.documents, state.assignments] = [lawyers, requestProfiles, requests, documents, assignments].map((result) => result.data || []);
    }
    $("#boot").classList.add("hidden");
    $("#portal").classList.remove("hidden");
    $("#account-email").textContent = profile.email;
    $("#quick-new").classList.toggle("hidden", !staff());
    renderNav(); render();
  } catch (error) {
    console.error("[Núcleo Advogados] Falha ao carregar o portal", error);
    $("#boot").classList.add("hidden");
    showAuth();
    showMessage("#auth-message", portalError(error), "error");
  }
}

function renderNav() {
  const icons = {
    dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    leads: '<path d="m12 2 9 10-9 10L3 12 12 2Z"/><path d="M7 12h10"/>',
    clients: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    intake: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h6"/>',
    cases: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M2 12h20"/>',
    tasks: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m7 12 3 3 7-7"/>',
    agenda: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
    documents: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8"/>',
    requests: '<path d="M4 4h16l2 12v4H2v-4L4 4ZM2 16h6a4 4 0 0 0 8 0h6"/>',
    team: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>'
  };
  const items = state.profile.role === "pending" ? [["intake", "✎", "Meu cadastro"], ["documents", "▤", "Documentos"]] : [
    ["dashboard", "▦", "Visão geral"],
    ...(staff() ? [["leads", "◇", "Leads"], ["clients", "◉", "Clientes"]] : [["intake", "✎", "Meu cadastro"]]),
    ["cases", "▣", "Processos"], ["tasks", "✓", "Tarefas"], ["agenda", "◷", "Agenda"],
    ["documents", "▤", "Documentos"],
    ...(state.profile.role === "owner" ? [["requests", "◷", "Cadastros recebidos"], ["team", "♙", "Equipe"]] : [])
  ];
  $("#nav").innerHTML = items.map(([id, , label]) => `<button type="button" data-view="${id}" class="${state.view === id ? "active" : ""}" ${state.view === id ? 'aria-current="page"' : ''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[id]}</svg><span>${label}</span></button>`).join("");
  $("#side-caption").textContent = staff() ? "GESTÃO DO ESCRITÓRIO" : "ÁREA DO CLIENTE";
  $("#access-label").textContent = staff() ? "Painel protegido da equipe" : "Acesso privado do cliente";
}

function render() {
  if (state.profile.role === "pending") {
    if (state.view === "documents") { renderHead(); renderDocuments(); }
    else renderPending();
    return;
  }
  renderHead();
  const renderers = { dashboard: renderDashboard, leads: () => renderContacts("lead"), clients: () => renderContacts("client"), intake: renderIntake, documents: renderDocuments, requests: renderRequests, cases: renderCases, tasks: () => renderTasks(false), agenda: () => renderTasks(true), team: renderTeam };
  (renderers[state.view] || renderDashboard)();
}

function renderPending() {
  $("#page-head").innerHTML = '<div><p class="eyebrow">ÁREA DO CLIENTE</p><h1>Complete seu cadastro</h1><p>Envie seus dados e documentos para análise da equipe.</p></div>';
  renderNav();
  renderIntake();
}

function renderHead() {
  const titles = { dashboard: staff() ? "Visão geral" : "Seu atendimento", leads: "Leads", clients: "Clientes", intake: "Meu cadastro", documents: "Documentos", requests: "Cadastros recebidos", cases: "Processos", tasks: "Tarefas", agenda: "Agenda", team: "Equipe" };
  const descriptions = { dashboard: staff() ? "Acompanhe os registros do escritório em um só lugar." : "Acompanhe as informações compartilhadas pela equipe.", leads: "Organize oportunidades e próximos contatos.", clients: "Consulte as pessoas atendidas pelo escritório.", intake: "Seus dados enviados ao escritório.", documents: "Arquivos protegidos do atendimento.", requests: "Analise os pedidos antes de vincular clientes.", cases: "Acompanhe casos e processos jurídicos.", tasks: "Controle atividades e compromissos.", agenda: "Veja os compromissos em ordem de data.", team: "Gerencie quem acessa o painel do escritório." };
  const entities = { leads: ["contact", "Novo lead"], clients: ["contact", "Novo cliente"], cases: ["case", "Novo processo"], tasks: ["task", "Nova tarefa"], team: ["staff", "Adicionar integrante"] };
  const action = staff() && (state.profile.role === "owner" || state.view !== "clients") && entities[state.view] ? `<button class="primary" data-new="${entities[state.view][0]}">＋ ${entities[state.view][1]}</button>` : "";
  $("#page-head").innerHTML = `<div><p class="eyebrow">${staff() ? "NÚCLEO ADVOGADOS · CRM" : "ÁREA DO CLIENTE"}</p><h1>${titles[state.view]}</h1><p>${descriptions[state.view]}</p></div>${action}`;
}

const contactName = (id) => state.contacts.find((item) => item.id === id)?.name || "Cliente";
const intakeLeads = () => state.profile.role === "owner" ? state.requestProfiles.filter((profile) => profile.role === "pending" && !state.contacts.some((contact) => contact.email?.toLowerCase() === profile.email?.toLowerCase())) : [];
const intakeLeadRow = (profile) => {
  const request = state.requests.find((item) => item.user_id === profile.id);
  return `<article class="intake-lead"><div><strong>${esc(profile.full_name || profile.email)}</strong><small>${esc(profile.email)} · ${request ? "Formulário enviado" : "Aguardando formulário"}</small></div><span class="badge">${request ? esc(request.status) : "Cadastro iniciado"}</span></article>`;
};
const filtered = (items, fields) => !state.search ? items : items.filter((item) => fields.some((field) => String(field(item) || "").toLowerCase().includes(state.search)));
const empty = (message) => `<p class="empty">${message}</p>`;

function renderDashboard() {
  const leads = state.contacts.filter((c) => c.kind === "lead");
  const registrations = intakeLeads();
  const clients = state.contacts.filter((c) => c.kind === "client");
  const pending = state.tasks.filter((t) => !t.done);
  const cards = staff() ? [["Leads", leads.length + registrations.length, "Inclui cadastros iniciados", "leads"], ["Clientes", clients.length, "Clientes ativos", "clients"], ["Processos", state.cases.length, "Casos registrados", "cases"], ["Tarefas pendentes", pending.length, "Para acompanhar", "tasks"]] : [["Processos", state.cases.length, "Compartilhados com você", "cases"], ["Compromissos", pending.length, "Tarefas em aberto", "agenda"], ["Concluídos", state.tasks.filter((t) => t.done).length, "Compromissos finalizados", "tasks"], ["Atualizações", state.cases.length + state.tasks.length, "Itens disponíveis", "dashboard"]];
  const stages = ["novo", "em contato", "proposta enviada", "negociação"];
  const main = staff() ? `<div class="pipeline">${stages.map((stage) => `<div class="pipeline-column"><h3>${stage}<span>${leads.filter((c) => c.stage === stage).length}</span></h3>${leads.filter((c) => c.stage === stage).slice(0, 4).map((c) => `<button class="pipeline-item" data-edit="contact" data-id="${c.id}"><strong>${esc(c.name)}</strong><small>${esc(c.source || "Sem origem")}</small></button>`).join("")}</div>`).join("")}</div>${registrations.length ? `<div class="intake-leads-head"><strong>Cadastros iniciados</strong><button type="button" class="row-action" data-view="requests">Ver todos</button></div>${registrations.slice(0, 4).map(intakeLeadRow).join("")}` : ""}` : recordList(state.cases, "Nenhum processo compartilhado ainda.", (c) => `<div><strong>${esc(c.title)}</strong><small>${esc(c.area || "Área não informada")}</small></div><span></span><span class="badge">${esc(c.status)}</span>`);
  $("#workspace").innerHTML = `${staff() ? '<div class="dashboard-actions"><span>Seu espaço de trabalho</span><div><button type="button" class="secondary" data-new="contact">＋ Novo lead</button><button type="button" class="secondary" data-new="task">＋ Nova tarefa</button></div></div>' : ''}<div class="kpis">${cards.map(([label, value, note, view]) => `<button type="button" class="card" data-view="${view}" aria-label="${label}: ${value}. Abrir seção"><span>${label}</span><strong>${value}</strong><small>${note}</small><b aria-hidden="true">↗</b></button>`).join("")}</div><div class="dashboard-grid"><section class="panel"><div class="panel-head"><h2>${staff() ? "Funil de oportunidades" : "Seus processos"}</h2>${staff() ? '<button type="button" class="row-action" data-view="leads">Ver todos ↗</button>' : ''}</div>${main}</section><section class="panel"><div class="panel-head"><h2>Próximos compromissos</h2><button type="button" class="row-action" data-view="agenda">Ver agenda ↗</button></div>${recordList(pending.slice(0, 6), "Nenhum compromisso pendente.", (t) => `<div><strong>${esc(t.title)}</strong><small>${staff() ? esc(contactName(t.contact_id)) : "Compartilhado com você"}</small></div><span></span><span class="badge">${date(t.due_at)}</span>`)}</section></div>`;
}

function recordList(items, message, content, action = "") {
  return items.length ? `<div class="records">${items.map((item) => `<article class="record">${content(item)}${action ? `<button class="row-action" data-edit="${action}" data-id="${item.id}">Editar</button>` : ""}</article>`).join("")}</div>` : empty(message);
}

function renderContacts(kind) {
  const items = filtered(state.contacts.filter((c) => c.kind === kind), [(c) => c.name, (c) => c.email, (c) => c.phone, (c) => c.stage, (c) => c.source]);
  const registrations = kind === "lead" ? filtered(intakeLeads(), [(p) => p.full_name, (p) => p.email, (p) => state.requests.find((r) => r.user_id === p.id)?.subject]) : [];
  const rows = kind === "client" ? items.length ? `<div class="client-list">${items.map((c) => `<article class="client-item"><div class="client-item-head"><div><strong>${esc(c.name)}</strong><small>${esc(c.email || c.phone || "Sem contato")} · ${esc(c.stage)}</small></div><button class="row-action" type="button" data-edit="contact" data-id="${c.id}" aria-label="Editar cliente ${esc(c.name)}">Editar</button></div>${assignmentControls(c)}</article>`).join("")}</div>` : empty("Nenhum cliente encontrado.") : `${items.length ? recordList(items, "", (c) => `<div><strong>${esc(c.name)}</strong><small>${esc(c.email || c.phone || "Sem contato")}</small></div><span>${esc(c.source || "—")}</span><span class="badge">${esc(c.stage)}</span>`, "contact") : ""}${registrations.length ? `<div class="intake-leads-head"><strong>Cadastros pelo portal</strong><button type="button" class="row-action" data-view="requests">Ver cadastros</button></div>${registrations.map(intakeLeadRow).join("")}` : ""}${!items.length && !registrations.length ? empty("Nenhum lead encontrado.") : ""}`;
  $("#workspace").innerHTML = `<section class="panel"><div class="panel-head"><h2>${kind === "lead" ? "Oportunidades" : "Pessoas atendidas"}</h2><span>${items.length + registrations.length} registros</span></div>${rows}</section>`;
}

function renderCases() {
  const items = filtered(state.cases, [(c) => c.title, (c) => c.area, (c) => c.number, (c) => c.status, (c) => contactName(c.contact_id)]);
  $("#workspace").innerHTML = `<section class="panel"><div class="panel-head"><h2>Processos jurídicos</h2><span>${items.length} registros</span></div>${recordList(items, "Nenhum processo disponível.", (c) => `<div><strong>${esc(c.title)}</strong><small>${staff() ? `${esc(contactName(c.contact_id))} · ` : ""}${esc(c.area || "Área não informada")}${c.number ? ` · ${esc(c.number)}` : ""}</small></div><span>${esc(c.description || "")}</span><span class="badge">${esc(c.status)}</span>`, staff() ? "case" : "")}</section>`;
}

function renderTasks(agenda) {
  const items = filtered([...state.tasks].sort((a, b) => String(a.due_at || "9999").localeCompare(String(b.due_at || "9999"))), [(t) => t.title, (t) => contactName(t.contact_id)]);
  $("#workspace").innerHTML = `<section class="panel"><div class="panel-head"><h2>${agenda ? "Compromissos por data" : "Lista de tarefas"}</h2><span>${items.length} registros</span></div>${recordList(items, "Nenhum compromisso disponível.", (t) => `<div><strong>${t.done ? "✓ " : ""}${esc(t.title)}</strong><small>${staff() ? esc(contactName(t.contact_id)) : "Seu compromisso"}</small></div><span>${t.done ? "Concluída" : "Pendente"}</span><span class="badge">${date(t.due_at)}</span>`, staff() ? "task" : "")}</section>`;
}

function renderTeam() {
  $("#workspace").innerHTML = `<section class="panel"><div class="panel-head"><h2>Acesso da equipe</h2><span>${state.team.length} integrantes</span></div>${recordList(state.team, "Nenhum integrante cadastrado.", (item) => `<div><strong>${esc(item.email)}</strong><small>Permissão de equipe</small></div><span></span><span class="badge">Ativo</span>`)}</section>`;
}

function renderIntake() {
  const request = state.requests.find((item) => item.user_id === state.profile.id);
  $("#workspace").innerHTML = `<section class="panel intake-panel"><div class="panel-head"><h2>Solicitação de atendimento</h2><span class="badge">${esc(request?.status || "Não enviada")}</span></div>
    <div class="intake-body"><p>Seus dados ficam disponíveis para análise do escritório. O acesso aos processos será liberado após o vínculo do seu cadastro.</p>
    <form id="intake-form" class="dialog-fields">
      <label>Nome completo<input name="full_name" required minlength="2" maxlength="160" autocomplete="name" value="${esc(request?.full_name || state.profile.full_name)}"></label>
      <label>Telefone com DDD<input name="phone" type="tel" required minlength="8" maxlength="50" autocomplete="tel" value="${esc(request?.phone)}"></label>
      <label>Assunto do atendimento<input name="subject" required minlength="5" maxlength="180" value="${esc(request?.subject)}"></label>
      <label>Conte brevemente sua necessidade<textarea name="description" required minlength="10" maxlength="3000" rows="5">${esc(request?.description)}</textarea></label>
      <label class="check"><input type="checkbox" required> Confirmo que os dados são verdadeiros e li a <a href="/politica-de-privacidade.html" target="_blank" rel="noopener">Política de Privacidade</a>.</label>
      <button class="primary" type="submit">${request ? "Atualizar meus dados" : "Enviar cadastro"}</button><p id="intake-message" class="message hidden" role="status"></p>
    </form></div></section>${request ? documentUploadForm() + `<section class="panel"><div class="panel-head"><h2>Documentos enviados</h2></div>${documentRows(state.documents)}</section>` : '<p class="empty">Depois de enviar o cadastro, você poderá anexar documentos em PDF, JPG ou PNG.</p>'}`;
}

function documentUploadForm() {
  return `<section class="panel upload-panel"><div class="panel-head"><h2>Enviar documentos</h2></div><div class="intake-body">
    <p>Envie somente arquivos necessários ao atendimento. Formatos: PDF, JPG ou PNG, até 10 MB por arquivo.</p>
    <form id="document-form" class="upload-form"><label>Escolher arquivo<input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" required></label>
    <button type="submit" class="primary">Enviar documento</button><p id="document-message" class="message hidden" role="status"></p></form></div></section>`;
}

function documentRows(items) {
  return items.length ? `<div class="documents-list">${items.map((d) => `<div class="document-row"><div><strong>${esc(d.file_name)}</strong><small>${date(d.created_at)} · ${Math.ceil(d.size_bytes / 1024)} KB${staff() ? ` · ${esc(contactName(d.contact_id))}` : ""}</small></div><button type="button" class="row-action" data-download="${d.id}">Baixar</button></div>`).join("")}</div>` : empty("Nenhum documento enviado ainda.");
}

function renderDocuments() {
  const documents = filtered(state.documents, [(d) => d.file_name, (d) => contactName(d.contact_id)]);
  $("#workspace").innerHTML = `${!staff() && state.requests.length ? documentUploadForm() : ""}
    <section class="panel"><div class="panel-head"><h2>${staff() ? "Documentos dos clientes" : "Meus documentos"}</h2><span>${documents.length} arquivos</span></div>${documentRows(documents)}</section>`;
}

function renderRequests() {
  const items = state.requests.filter((r) => r.status !== "aprovado");
  const incomplete = intakeLeads().filter((profile) => !state.requests.some((request) => request.user_id === profile.id));
  $("#workspace").innerHTML = `<section class="panel"><div class="panel-head"><h2>Novos cadastros</h2><span>${items.length} para análise · ${incomplete.length} aguardando formulário</span></div>
    ${items.length ? `<div class="request-list">${items.map((r) => `<article class="request-card"><div><strong>${esc(r.full_name)}</strong><small>${esc(state.requestProfiles.find((p) => p.id === r.user_id)?.email || "")} · ${esc(r.phone)}</small><p><b>${esc(r.subject)}</b> — ${esc(r.description)}</p><small>${state.documents.filter((d) => d.user_id === r.user_id).length} documento(s) · ${esc(r.status)}</small></div><div class="request-actions"><button class="primary" type="button" data-approve="${r.id}">Aprovar e vincular</button><button class="secondary" type="button" data-request-docs="${r.user_id}">Ver documentos</button></div></article>`).join("")}</div>` : ""}${incomplete.length ? `<div class="intake-leads-head"><strong>Aguardando formulário do cliente</strong></div>${incomplete.map(intakeLeadRow).join("")}` : ""}${!items.length && !incomplete.length ? empty("Nenhum cadastro aguardando análise.") : ""}</section>`;
}

function assignmentControls(contact) {
  if (state.profile.role !== "owner") return "";
  const assigned = state.assignments.filter((a) => a.contact_id === contact.id);
  return `<div class="assignment"><label>Advogado responsável<select data-assign="${contact.id}"><option value="">Escolha um integrante</option>${state.lawyers.filter((p) => !assigned.some((a) => a.staff_id === p.id)).map((p) => `<option value="${p.id}">${esc(p.full_name || p.email)}</option>`).join("")}</select></label>
    <button type="button" class="secondary" data-assign-save="${contact.id}">Distribuir</button><div class="assigned-list">${assigned.map((a) => `<span class="badge">${esc(state.lawyers.find((p) => p.id === a.staff_id)?.full_name || state.lawyers.find((p) => p.id === a.staff_id)?.email || "Advogado")} <button type="button" data-unassign="${contact.id}" data-staff="${a.staff_id}" aria-label="Remover atribuição">×</button></span>`).join("")}</div></div>`;
}

function openDialog(entity, item = null) {
  state.entity = entity; state.editing = item;
  const clientOptions = state.contacts.filter((c) => c.kind === "client").map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
  const anyContactOptions = state.contacts.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
  const selected = (value, expected) => value === expected ? "selected" : "";
  const checked = (value) => value ? "checked" : "";
  let fields = "", title = "";
  if (entity === "contact") {
    const kind = item?.kind || (state.view === "clients" ? "client" : "lead"); title = item ? "Editar contato" : kind === "client" ? "Novo cliente" : "Novo lead";
    fields = `<label>Nome<input name="name" required maxlength="160" value="${esc(item?.name)}"></label><div class="form-grid"><label>E-mail<input name="email" type="email" maxlength="254" value="${esc(item?.email)}"></label><label>Telefone<input name="phone" maxlength="50" value="${esc(item?.phone)}"></label></div><div class="form-grid"><label>Tipo<select name="kind"><option value="lead" ${selected(kind,"lead")}>Lead</option><option value="client" ${selected(kind,"client")}>Cliente</option></select></label><label>Etapa<select name="stage">${["novo","em contato","proposta enviada","negociação","convertido"].map((s) => `<option ${selected(item?.stage || "novo",s)}>${s}</option>`).join("")}</select></label></div><label>Origem<input name="source" maxlength="100" value="${esc(item?.source)}"></label><label>Observações<textarea name="notes" rows="3" maxlength="2000">${esc(item?.notes)}</textarea></label>`;
  } else if (entity === "case") {
    title = item ? "Editar processo" : "Novo processo";
    fields = `<label>Cliente<select name="contact_id" required ${item ? "disabled" : ""}><option value="">Selecione</option>${clientOptions.replace(`value="${item?.contact_id}"`, `value="${item?.contact_id}" selected`)}</select></label><label>Título<input name="title" required maxlength="180" value="${esc(item?.title)}"></label><div class="form-grid"><label>Área<input name="area" maxlength="100" value="${esc(item?.area)}"></label><label>Número<input name="number" maxlength="100" value="${esc(item?.number)}"></label></div><label>Situação<select name="status">${["em andamento","aguardando","audiência","concluído","arquivado"].map((s) => `<option ${selected(item?.status || "em andamento",s)}>${s}</option>`).join("")}</select></label><label>Descrição<textarea name="description" rows="3" maxlength="3000">${esc(item?.description)}</textarea></label><label class="check"><input name="visible_to_client" type="checkbox" ${checked(item?.visible_to_client)}> Compartilhar no portal do cliente</label>`;
  } else if (entity === "task") {
    title = item ? "Editar tarefa" : "Nova tarefa";
    fields = `<label>Contato<select name="contact_id" required ${item ? "disabled" : ""}><option value="">Selecione</option>${anyContactOptions.replace(`value="${item?.contact_id}"`, `value="${item?.contact_id}" selected`)}</select></label><label>Tarefa ou compromisso<input name="title" required maxlength="180" value="${esc(item?.title)}"></label><label>Data<input name="due_at" type="date" value="${esc(String(item?.due_at || "").slice(0,10))}"></label><label class="check"><input name="done" type="checkbox" ${checked(item?.done)}> Concluída</label><label class="check"><input name="visible_to_client" type="checkbox" ${checked(item?.visible_to_client)}> Mostrar no portal do cliente</label>`;
  } else { title = "Adicionar integrante"; fields = `<label>E-mail do integrante<input name="email" type="email" required maxlength="254"></label>`; }
  $("#dialog-title").textContent = title; $("#dialog-fields").innerHTML = fields; showMessage("#dialog-message"); $("#record-dialog").showModal();
}

async function saveRecord(event) {
  event.preventDefault();
  const submit = $("#record-submit"); submit.disabled = true;
  const raw = Object.fromEntries(new FormData(event.currentTarget));
  const values = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value]));
  values.visible_to_client = raw.visible_to_client === "on"; values.done = raw.done === "on";
  try {
    let query;
    if (state.entity === "staff") query = supabase.from("team_invites").insert({ email: values.email.toLowerCase() });
    else {
      const table = state.entity === "contact" ? "contacts" : state.entity === "case" ? "cases" : "tasks";
      const allowed = state.entity === "contact" ? ["name","email","phone","kind","stage","source","notes"] : state.entity === "case" ? ["contact_id","title","area","number","status","description","visible_to_client"] : ["contact_id","title","due_at","done","visible_to_client"];
      const payload = Object.fromEntries(allowed.filter((key) => key in values && !(state.editing && key === "contact_id")).map((key) => [key, values[key] === "" && key === "email" ? null : values[key]]));
      query = state.editing ? supabase.from(table).update(payload).eq("id", state.editing.id) : supabase.from(table).insert(payload);
    }
    const { error } = await query; if (error) throw error;
    $("#record-dialog").close(); showMessage("#portal-message", "Registro salvo com sucesso.", "success"); await loadPortal();
  } catch (error) { showMessage("#dialog-message", /duplicate|unique/i.test(error.message) ? "Este e-mail já está cadastrado." : "Não foi possível salvar o registro.", "error"); }
  finally { submit.disabled = false; }
}

async function saveIntake(form) {
  const button = form.querySelector('button[type="submit"]'); button.disabled = true;
  try {
    const values = Object.fromEntries(new FormData(form));
    const payload = Object.fromEntries(["full_name","phone","subject","description"].map((key) => [key, String(values[key] || "").trim()]));
    const existing = state.requests.find((r) => r.user_id === state.profile.id);
    const query = existing ? supabase.from("client_requests").update(payload).eq("id",existing.id) :
      supabase.from("client_requests").insert({ ...payload, user_id: state.profile.id });
    const { error } = await query; if (error) throw error;
    await loadPortal();
    showMessage("#portal-message", "Cadastro enviado. Agora você pode anexar seus documentos.", "success");
  } catch { showMessage("#intake-message", "Não foi possível salvar o cadastro. Confira os campos e tente novamente.", "error"); }
  finally { button.disabled = false; }
}

async function uploadDocument(form) {
  const file = form.elements.file.files[0];
  if (!file) return;
  const allowed = ["application/pdf","image/jpeg","image/png"];
  if (!allowed.includes(file.type) || file.size > 10485760 || !file.size) return showMessage("#document-message", "Use PDF, JPG ou PNG com até 10 MB.", "error");
  const button = form.querySelector('button[type="submit"]'); button.disabled = true;
  const extension = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" }[file.type];
  const path = `${state.profile.id}/${crypto.randomUUID()}.${extension}`;
  try {
    const uploaded = await supabase.storage.from("client-documents").upload(path,file,{contentType:file.type,upsert:false});
    if (uploaded.error) throw uploaded.error;
    const saved = await supabase.from("client_documents").insert({user_id:state.profile.id,contact_id:state.profile.contact_id || null,path,file_name:file.name,content_type:file.type,size_bytes:file.size});
    if (saved.error) throw saved.error;
    await loadPortal(); showMessage("#portal-message", "Documento enviado com segurança.", "success");
  } catch { showMessage("#document-message", "Não foi possível enviar o documento. Tente novamente.", "error"); }
  finally { button.disabled = false; }
}

async function approveRequest(id) {
  const request = state.requests.find((r) => r.id === id);
  const email = state.requestProfiles.find((p) => p.id === request?.user_id)?.email;
  if (!request || !email) return showMessage("#portal-message","Cadastro sem e-mail vinculado. Confira a conta do usuário.","error");
  try {
    let contactId = request.contact_id;
    if (!contactId) {
      const existing = state.contacts.find((c) => c.email === email);
      if (existing && existing.kind !== "client") throw new Error("O e-mail já pertence a um lead. Converta-o em cliente primeiro.");
      if (existing) contactId = existing.id;
      else {
        const created = await supabase.from("contacts").insert({name:request.full_name,email,phone:request.phone,kind:"client",stage:"convertido",source:"Cadastro pelo portal"}).select("id").single();
        if (created.error) throw created.error;
        contactId = created.data.id;
      }
    }
    const linked = await supabase.from("client_requests").update({status:"aprovado",contact_id:contactId}).eq("id",id);
    if (linked.error) throw linked.error;
    const documents = await supabase.from("client_documents").update({contact_id:contactId}).eq("user_id",request.user_id).is("contact_id",null);
    if (documents.error) throw documents.error;
    await loadPortal(); showMessage("#portal-message","Cliente vinculado. Distribua-o na lista de Clientes.","success");
  } catch (error) { showMessage("#portal-message",error.message?.includes("lead") ? error.message : "Não foi possível aprovar. Confira se o e-mail já pertence a outro cliente.", "error"); }
}

async function updateAssignment(contactId, staffId, remove = false) {
  if (state.profile.role !== "owner" || !staffId) return;
  const query = remove ? supabase.from("client_assignments").delete().eq("contact_id",contactId).eq("staff_id",staffId)
    : supabase.from("client_assignments").insert({contact_id:contactId,staff_id:staffId});
  const { error } = await query;
  if (error) return showMessage("#portal-message","Não foi possível alterar a distribuição.","error");
  await loadPortal(); showMessage("#portal-message","Distribuição atualizada.","success");
}

document.addEventListener("click", async (event) => {
  const downloadId = event.target.closest("[data-download]")?.dataset.download;
  if (downloadId) {
    const document = state.documents.find((d) => d.id === downloadId);
    if (!document) return;
    const { data, error } = await supabase.storage.from("client-documents").download(document.path);
    if (error) return showMessage("#portal-message","Não foi possível baixar o documento.","error");
    const link = window.document.createElement("a"); const url = URL.createObjectURL(data);
    link.href = url; link.download = document.file_name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }
  const approve = event.target.closest("[data-approve]")?.dataset.approve;
  if (approve) return approveRequest(approve);
  const docsUser = event.target.closest("[data-request-docs]")?.dataset.requestDocs;
  if (docsUser) { state.view="documents"; state.search=state.requestProfiles.find((p)=>p.id===docsUser)?.email || ""; state.search=""; renderNav(); $("#workspace").innerHTML = `<section class="panel"><div class="panel-head"><h2>Documentos do cadastro</h2></div>${documentRows(state.documents.filter((d)=>d.user_id===docsUser))}</section>`; return; }
  const assignContact = event.target.closest("[data-assign-save]")?.dataset.assignSave;
  if (assignContact) return updateAssignment(assignContact,$(`[data-assign="${assignContact}"]`)?.value);
  const unassign = event.target.closest("[data-unassign]");
  if (unassign) return updateAssignment(unassign.dataset.unassign,unassign.dataset.staff,true);
  const view = event.target.closest("[data-view]")?.dataset.view;
  if (view) { state.view = view; state.search = ""; $("#search").value = ""; $("#sidebar").classList.remove("open"); $("#sidebar-scrim").classList.remove("open"); renderNav(); render(); return; }
  const add = event.target.closest("[data-new]")?.dataset.new; if (add) return openDialog(add);
  if (event.target.closest("[data-close-dialog]")) return $("#record-dialog").close();
  const edit = event.target.closest("[data-edit]"); if (edit) { const collection = edit.dataset.edit === "contact" ? state.contacts : edit.dataset.edit === "case" ? state.cases : state.tasks; return openDialog(edit.dataset.edit, collection.find((item) => item.id === edit.dataset.id)); }
});

document.addEventListener("submit", async (event) => {
  if (event.target.id === "signup-form") { await submitSignup(event); return; }
  if (event.target.id === "intake-form") { event.preventDefault(); await saveIntake(event.target); }
  if (event.target.id === "document-form") { event.preventDefault(); await uploadDocument(event.target); }
});

document.querySelectorAll("[data-auth-mode]").forEach((button) => button.addEventListener("click", () => setAuthMode(button.dataset.authMode)));
$("#auth-form").addEventListener("submit", submitAuth); $("#signup-back").addEventListener("click", () => { state.signupDraft = null; setAuthMode("signup"); }); $("#record-form").addEventListener("submit", saveRecord);
$("#recovery-form").addEventListener("submit", submitRecovery);
$("#search").addEventListener("input", (event) => { state.search = event.target.value.trim().toLowerCase(); render(); });
$("#menu-toggle").addEventListener("click", () => { $("#sidebar").classList.toggle("open"); $("#sidebar-scrim").classList.toggle("open"); });
$("#sidebar-scrim").addEventListener("click", () => { $("#sidebar").classList.remove("open"); $("#sidebar-scrim").classList.remove("open"); });
window.addEventListener("keydown", (event) => { if (event.key === "Escape") { $("#sidebar").classList.remove("open"); $("#sidebar-scrim").classList.remove("open"); } });
$("#sign-out").addEventListener("click", async () => { if (supabase) await supabase.auth.signOut(); });

setAuthMode("login");
if (!configured) { showAuth(); showMessage("#auth-message", "O banco seguro do portal ainda está sendo configurado.", "error"); }
else {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") recoveryActive = true;
    setTimeout(() => handleSession(session), 0);
  });
  const { data } = await supabase.auth.getSession(); await handleSession(data.session);
  if (!data.session) showUrlError();
}

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
const state = { session: null, profile: null, contacts: [], cases: [], tasks: [], team: [], view: "dashboard", search: "", editing: null, entity: null };
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
  $("#auth-form").classList.remove("hidden");
  $(".auth-actions").classList.remove("hidden");
}

function showRecovery() {
  $("#boot").classList.add("hidden");
  $("#portal").classList.add("hidden");
  $("#auth").classList.remove("hidden");
  $("#auth-form").classList.add("hidden");
  $(".auth-actions").classList.add("hidden");
  $("#recovery-form").classList.remove("hidden");
  $("#auth-title").textContent = "Definir nova senha";
  $("#auth-copy").textContent = "Escolha uma senha segura para voltar ao portal.";
  showMessage("#auth-message");
}

function setAuthMode(mode) {
  const content = {
    login: ["Entrar no portal", "Use o e-mail cadastrado junto ao escritório.", "Entrar"],
    signup: ["Criar acesso", "Cadastre-se com o mesmo e-mail informado ao escritório.", "Criar minha conta"],
    reset: ["Recuperar senha", "Enviaremos um link seguro para o seu e-mail.", "Enviar link"]
  }[mode];
  $("#auth-form").dataset.mode = mode;
  $("#auth-form").classList.remove("hidden");
  $("#recovery-form").classList.add("hidden");
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
  button.disabled = true;
  try {
    let result;
    if (mode === "signup") result = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: authRedirectUrl() } });
    else if (mode === "reset") result = await supabase.auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl() });
    else result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    if (mode === "signup") {
      if (result.data?.session) await handleSession(result.data.session);
      else showMessage("#auth-message", "Cadastro recebido. Abra o e-mail de confirmação e use o mesmo navegador para concluir o acesso. Confira também o spam.", "success");
    }
    if (mode === "reset") showMessage("#auth-message", "Se existir uma conta para este e-mail, enviaremos o link de recuperação. Confira spam e aguarde alguns minutos antes de solicitar outro.", "success");
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
  if (/invalid login/i.test(message)) return "E-mail ou senha inválidos.";
  if (/already registered|user already exists/i.test(message)) return "Este e-mail já possui cadastro. Use ‘Esqueci a senha’ ou confirme o cadastro recebido por e-mail.";
  if (/email.*not authorized|email_address_not_authorized/i.test(message)) return "O envio de e-mails ainda não está liberado para este endereço. O escritório precisa configurar um servidor SMTP próprio no Supabase.";
  if (/redirect|url.*not allowed|redirect.*not authorized/i.test(message)) return "O endereço de retorno do portal ainda não foi liberado no Supabase. Configure https://nucleo-advogados.netlify.app/crm/ em Auth → URL Configuration.";
  if (/rate limit|too many|email.*limit|after.*seconds/i.test(message)) return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
  if (/email not confirmed/i.test(message)) return "Confirme seu e-mail antes de entrar. Se não recebeu a mensagem, solicite um novo cadastro ou recuperação.";
  if (/invalid.*email|valid.*email/i.test(message)) return "Informe um e-mail válido.";
  if (/expired|invalid.*link|otp/i.test(message)) return "O link expirou ou é inválido. Solicite um novo link de recuperação.";
  if (/password/i.test(message)) return "A senha precisa ter pelo menos 8 caracteres.";
  return "Não foi possível concluir o acesso. Tente novamente.";
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
      state.contacts = []; state.cases = []; state.tasks = []; state.team = [];
    } else {
      const [contacts, cases, tasks, team] = await Promise.all([
        staff() ? supabase.from("contacts").select("*").order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
        supabase.from("cases").select("*").order("updated_at", { ascending: false }),
        supabase.from("tasks").select("*").order("due_at", { ascending: true }),
        profile.role === "owner" ? supabase.from("team_invites").select("email,created_at").order("created_at", { ascending: false }) : Promise.resolve({ data: [] })
      ]);
      const failed = [contacts, cases, tasks, team].find((result) => result.error);
      if (failed) throw failed.error;
      [state.contacts, state.cases, state.tasks, state.team] = [contacts, cases, tasks, team].map((result) => result.data || []);
    }
    $("#boot").classList.add("hidden");
    $("#portal").classList.remove("hidden");
    $("#account-email").textContent = profile.email;
    renderNav(); render();
  } catch {
    $("#boot").classList.add("hidden");
    showAuth();
    showMessage("#auth-message", "Não foi possível carregar o portal. Tente entrar novamente.", "error");
  }
}

function renderNav() {
  const items = state.profile.role === "pending" ? [] : [
    ["dashboard", "▦", "Visão geral"],
    ...(staff() ? [["leads", "◇", "Leads"], ["clients", "◉", "Clientes"]] : []),
    ["cases", "▣", "Processos"], ["tasks", "✓", "Tarefas"], ["agenda", "◷", "Agenda"],
    ...(state.profile.role === "owner" ? [["team", "♙", "Equipe"]] : [])
  ];
  $("#nav").innerHTML = items.map(([id, icon, label]) => `<button data-view="${id}" class="${state.view === id ? "active" : ""}"><span>${icon}</span>${label}</button>`).join("");
  $("#side-caption").textContent = staff() ? "GESTÃO DO ESCRITÓRIO" : "ÁREA DO CLIENTE";
  $("#access-label").textContent = staff() ? "Painel protegido da equipe" : "Acesso privado do cliente";
}

function render() {
  if (state.profile.role === "pending") return renderPending();
  renderHead();
  const renderers = { dashboard: renderDashboard, leads: () => renderContacts("lead"), clients: () => renderContacts("client"), cases: renderCases, tasks: () => renderTasks(false), agenda: () => renderTasks(true), team: renderTeam };
  (renderers[state.view] || renderDashboard)();
}

function renderPending() {
  $("#page-head").innerHTML = "";
  $("#workspace").innerHTML = `<div class="pending-card"><p class="eyebrow">CADASTRO CONFIRMADO</p><h2>Acesso aguardando vínculo</h2><p>Sua conta <strong>${esc(state.profile.email)}</strong> já está ativa. Para proteger os dados dos clientes, a equipe precisa vincular este e-mail ao seu cadastro antes de mostrar processos e compromissos.</p><a href="mailto:contato@nucleoadvogados.com.br?subject=Vincular%20acesso%20ao%20portal">Solicitar vínculo à equipe</a></div>`;
}

function renderHead() {
  const titles = { dashboard: staff() ? "Visão geral" : "Seu atendimento", leads: "Leads", clients: "Clientes", cases: "Processos", tasks: "Tarefas", agenda: "Agenda", team: "Equipe" };
  const descriptions = { dashboard: staff() ? "Acompanhe os registros do escritório em um só lugar." : "Acompanhe as informações compartilhadas pela equipe.", leads: "Organize oportunidades e próximos contatos.", clients: "Consulte as pessoas atendidas pelo escritório.", cases: "Acompanhe casos e processos jurídicos.", tasks: "Controle atividades e compromissos.", agenda: "Veja os compromissos em ordem de data.", team: "Gerencie quem acessa o painel do escritório." };
  const entities = { leads: ["contact", "Novo lead"], clients: ["contact", "Novo cliente"], cases: ["case", "Novo processo"], tasks: ["task", "Nova tarefa"], team: ["staff", "Adicionar integrante"] };
  const action = staff() && entities[state.view] ? `<button class="primary" data-new="${entities[state.view][0]}">＋ ${entities[state.view][1]}</button>` : "";
  $("#page-head").innerHTML = `<div><p class="eyebrow">${staff() ? "NÚCLEO ADVOGADOS · CRM" : "ÁREA DO CLIENTE"}</p><h1>${titles[state.view]}</h1><p>${descriptions[state.view]}</p></div>${action}`;
}

const contactName = (id) => state.contacts.find((item) => item.id === id)?.name || "Cliente";
const filtered = (items, fields) => !state.search ? items : items.filter((item) => fields.some((field) => String(field(item) || "").toLowerCase().includes(state.search)));
const empty = (message) => `<p class="empty">${message}</p>`;

function renderDashboard() {
  const leads = state.contacts.filter((c) => c.kind === "lead");
  const clients = state.contacts.filter((c) => c.kind === "client");
  const pending = state.tasks.filter((t) => !t.done);
  const cards = staff() ? [["Leads", leads.length, "Oportunidades cadastradas"], ["Clientes", clients.length, "Clientes ativos"], ["Processos", state.cases.length, "Casos registrados"], ["Tarefas pendentes", pending.length, "Para acompanhar"]] : [["Processos", state.cases.length, "Compartilhados com você"], ["Compromissos", pending.length, "Tarefas em aberto"], ["Concluídos", state.tasks.filter((t) => t.done).length, "Compromissos finalizados"], ["Atualizações", state.cases.length + state.tasks.length, "Itens disponíveis"]];
  const stages = ["novo", "em contato", "proposta enviada", "negociação"];
  const main = staff() ? `<div class="pipeline">${stages.map((stage) => `<div class="pipeline-column"><h3>${stage}<span>${leads.filter((c) => c.stage === stage).length}</span></h3>${leads.filter((c) => c.stage === stage).slice(0, 4).map((c) => `<button class="pipeline-item" data-edit="contact" data-id="${c.id}"><strong>${esc(c.name)}</strong><small>${esc(c.source || "Sem origem")}</small></button>`).join("")}</div>`).join("")}</div>` : recordList(state.cases, "Nenhum processo compartilhado ainda.", (c) => `<div><strong>${esc(c.title)}</strong><small>${esc(c.area || "Área não informada")}</small></div><span></span><span class="badge">${esc(c.status)}</span>`);
  $("#workspace").innerHTML = `<div class="kpis">${cards.map(([label, value, note]) => `<div class="card"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`).join("")}</div><div class="dashboard-grid"><section class="panel"><div class="panel-head"><h2>${staff() ? "Funil de oportunidades" : "Seus processos"}</h2></div>${main}</section><section class="panel"><div class="panel-head"><h2>Próximos compromissos</h2></div>${recordList(pending.slice(0, 6), "Nenhum compromisso pendente.", (t) => `<div><strong>${esc(t.title)}</strong><small>${staff() ? esc(contactName(t.contact_id)) : "Compartilhado com você"}</small></div><span></span><span class="badge">${date(t.due_at)}</span>`)}</section></div>`;
}

function recordList(items, message, content, action = "") {
  return items.length ? `<div class="records">${items.map((item) => `<article class="record">${content(item)}${action ? `<button class="row-action" data-edit="${action}" data-id="${item.id}">Editar</button>` : ""}</article>`).join("")}</div>` : empty(message);
}

function renderContacts(kind) {
  const items = filtered(state.contacts.filter((c) => c.kind === kind), [(c) => c.name, (c) => c.email, (c) => c.phone, (c) => c.stage, (c) => c.source]);
  $("#workspace").innerHTML = `<section class="panel"><div class="panel-head"><h2>${kind === "lead" ? "Oportunidades" : "Pessoas atendidas"}</h2><span>${items.length} registros</span></div>${recordList(items, "Nenhum registro encontrado.", (c) => `<div><strong>${esc(c.name)}</strong><small>${esc(c.email || c.phone || "Sem contato")}</small></div><span>${esc(c.source || "—")}</span><span class="badge">${esc(c.stage)}</span>`, "contact")}</section>`;
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

document.addEventListener("click", async (event) => {
  const view = event.target.closest("[data-view]")?.dataset.view;
  if (view) { state.view = view; state.search = ""; $("#search").value = ""; $("#sidebar").classList.remove("open"); renderNav(); render(); return; }
  const add = event.target.closest("[data-new]")?.dataset.new; if (add) return openDialog(add);
  if (event.target.closest("[data-close-dialog]")) return $("#record-dialog").close();
  const edit = event.target.closest("[data-edit]"); if (edit) { const collection = edit.dataset.edit === "contact" ? state.contacts : edit.dataset.edit === "case" ? state.cases : state.tasks; return openDialog(edit.dataset.edit, collection.find((item) => item.id === edit.dataset.id)); }
});

document.querySelectorAll("[data-auth-mode]").forEach((button) => button.addEventListener("click", () => setAuthMode(button.dataset.authMode)));
$("#auth-form").addEventListener("submit", submitAuth); $("#record-form").addEventListener("submit", saveRecord);
$("#recovery-form").addEventListener("submit", submitRecovery);
$("#search").addEventListener("input", (event) => { state.search = event.target.value.trim().toLowerCase(); render(); });
$("#menu-toggle").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
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

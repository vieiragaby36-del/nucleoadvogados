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
const state = { session: null, profile: null, contacts: [], cases: [], tasks: [], team: [], lawyers: [], requestProfiles: [], requests: [], documents: [], trashDocuments: [], assignments: [], attendances: [], attendanceHistory: [], contactHistory: [], assistantKnowledge: [], trainingArea: "trabalhista", attendanceDetail: null, view: "dashboard", search: "", editing: null, entity: null, signupDraft: null };
const assistantAreas = [
  ["trabalhista","Trabalhista"],["criminal","Criminal"],["familia","Família e Sucessões"],["civel","Cível e Contencioso"],
  ["previdenciario","Previdenciário"],["empresarial","Empresarial e Societário"],["imobiliario","Imobiliário"],
  ["tributario","Tributário"],["consumidor","Consumidor"],["lgpd","Compliance e LGPD"],
  ["administrativo","Administrativo e Licitações"],["internacional","Internacional e Arbitragem"],
  ["saude","Saúde"],["outro","Outro assunto"]
];
let recoveryActive = /(?:^|[&#?])type=recovery(?:&|$)/.test(`${location.search}${location.hash}`);
const portalPrefillEmail = new URLSearchParams(location.search).get("email")?.trim().toLowerCase() || "";
const admin = () => ["owner", "super_admin"].includes(state.profile?.role);
const staff = () => ["owner", "super_admin", "staff"].includes(state.profile?.role);
const authRedirectUrl = () => new URL("/crm/", location.origin).toString();
let portalLoadRun = 0;

function withTimeout(promise, milliseconds, message = "Tempo limite excedido") {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), milliseconds);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

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
  if (portalPrefillEmail && !$("#auth-email").value) $("#auth-email").value = portalPrefillEmail;
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
  const run = ++portalLoadRun;
  try {
    await withTimeout(loadPortal(run), 15000, "O portal demorou mais que o esperado para responder.");
  } catch (error) {
    console.error("[Núcleo Advogados] Tempo limite ao carregar o portal", error);
    $("#boot").classList.add("hidden");
    showAuth();
    showMessage("#auth-message", "O portal demorou para responder. Tente entrar novamente em alguns segundos.", "error");
  }
}

async function loadPortal(run = 0) {
  try {
    const userId = state.session.user.id;
    const pendingClaim = sessionStorage.getItem("nucleo-attendance-claim");
    if (pendingClaim) {
      try {
        const claim = JSON.parse(pendingClaim);
        const metadata = state.session.user.user_metadata || {};
        if (metadata.full_name && metadata.subject) {
          const existingRequest = await supabase.from("client_requests").select("id").eq("user_id", userId).limit(1);
          if (!existingRequest.error && !existingRequest.data?.length) {
            const createdRequest = await supabase.from("client_requests").insert({ user_id: userId, full_name: String(metadata.full_name).trim(), phone: String(metadata.phone || "").trim(), subject: String(metadata.subject).trim(), description: String(metadata.description || "").trim() });
            if (createdRequest.error && !/duplicate|unique/i.test(createdRequest.error.message || "")) throw createdRequest.error;
          }
        }
        if (claim?.attendanceId && claim?.claimToken) {
          const { error: claimError } = await supabase.rpc("claim_attendance_access", { p_attendance_id: claim.attendanceId, p_account_claim_token: claim.claimToken });
          if (!claimError) sessionStorage.removeItem("nucleo-attendance-claim");
        }
      } catch { sessionStorage.removeItem("nucleo-attendance-claim"); }
    }
    const { data: profile, error } = await supabase.from("profiles").select("id,email,full_name,role,contact_id").eq("id", userId).single();
    if (error) throw error;
    state.profile = profile;
    if (profile.role === "pending") {
      state.contacts = []; state.cases = []; state.tasks = []; state.team = []; state.lawyers = []; state.assignments = []; state.attendances = []; state.attendanceHistory = []; state.contactHistory = []; state.trashDocuments = []; state.assistantKnowledge = [];
      const [requests, documents] = await Promise.all([
        supabase.from("client_requests").select("*").eq("user_id", userId),
        supabase.from("client_documents").select("*").eq("user_id", userId).is("deleted_at", null).order("created_at", { ascending: false })
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
      const [contacts, cases, tasks, team, lawyers, requestProfiles, requests, documents, trashDocuments, assignments, attendances, attendanceHistory, contactHistory] = await Promise.all([
        staff() ? supabase.from("contacts").select("*").order("created_at", { ascending: false }) : profile.role === "client" && profile.contact_id ? supabase.from("contacts").select("*").eq("id", profile.contact_id) : Promise.resolve({ data: [] }),
        supabase.from("cases").select("*").order("updated_at", { ascending: false }),
        supabase.from("tasks").select("*").order("due_at", { ascending: true }),
        admin() ? supabase.from("team_invites").select("email,created_at,team_function,requested_role").order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
        staff() ? supabase.from("profiles").select("id,email,full_name,role,team_function,practice_area").in("role",["owner","super_admin","staff"]) : Promise.resolve({ data: [] }),
        admin() ? supabase.from("profiles").select("id,email,full_name,role,contact_id,team_function,practice_area") : Promise.resolve({ data: [] }),
        admin() ? supabase.from("client_requests").select("*").order("created_at", { ascending: false }) : supabase.from("client_requests").select("*").eq("user_id",userId),
        supabase.from("client_documents").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
        admin() ? supabase.from("client_documents").select("*").not("deleted_at", "is", null).order("deleted_at", { ascending: false }) : Promise.resolve({ data: [] }),
        staff() ? supabase.from("client_assignments").select("*") : Promise.resolve({ data: [] }),
        staff() ? supabase.from("attendances").select("*").order("created_at", { ascending: false }) : profile.role === "client" && profile.contact_id ? supabase.from("attendances").select("*").eq("contact_id", profile.contact_id).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
        staff() ? supabase.from("attendance_history").select("*").order("created_at", { ascending: true }) : Promise.resolve({ data: [] }),
        staff() ? supabase.from("contact_history").select("*").order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [] })
      ]);
      const failed = [contacts, cases, tasks, team, lawyers, requestProfiles, requests, documents, trashDocuments, assignments, attendances, attendanceHistory, contactHistory].find((result) => result.error);
      if (failed) throw failed.error;
      [state.contacts, state.cases, state.tasks, state.team] = [contacts, cases, tasks, team].map((result) => result.data || []);
      [state.lawyers, state.requestProfiles, state.requests, state.documents, state.trashDocuments, state.assignments, state.attendances, state.attendanceHistory, state.contactHistory] = [lawyers, requestProfiles, requests, documents, trashDocuments, assignments, attendances, attendanceHistory, contactHistory].map((result) => result.data || []);
      const metadata = state.session.user.user_metadata || {};
      if (profile.role === "client" && !state.requests.length && metadata.full_name && metadata.subject) {
        const createdRequest = await supabase.from("client_requests").insert({ user_id: userId, full_name: String(metadata.full_name).trim(), phone: String(metadata.phone || "").trim(), subject: String(metadata.subject).trim(), description: String(metadata.description || "").trim() });
        if (createdRequest.error && !/duplicate|unique/i.test(createdRequest.error.message || "")) throw createdRequest.error;
        const refreshedRequests = await supabase.from("client_requests").select("*").eq("user_id", userId);
        if (refreshedRequests.error) throw refreshedRequests.error;
        state.requests = refreshedRequests.data || [];
      }
      const guides = admin() ? await supabase.from("assistant_area_qa").select("*").order("created_at", { ascending: false }) : { data: [] };
      if (guides.error) throw guides.error;
      state.assistantKnowledge = guides.data || [];
    }
    if (run && run !== portalLoadRun) return;
    $("#boot").classList.add("hidden");
    $("#portal").classList.remove("hidden");
    $("#account-email").textContent = profile.email;
    $("#quick-new").classList.toggle("hidden", !staff());
    if (profile.role === "client" && state.view === "dashboard") state.view = "attendances";
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
    attendances: '<path d="M8 3h8M9 2h6v3H9z"/><rect x="4" y="4" width="16" height="18" rx="2"/><path d="M8 10h8M8 14h8M8 18h5"/>',
    leads: '<path d="m12 2 9 10-9 10L3 12 12 2Z"/><path d="M7 12h10"/>',
    clients: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    intake: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h6"/>',
    cases: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M2 12h20"/>',
    tasks: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m7 12 3 3 7-7"/>',
    agenda: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
    documents: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3"/>',
    requests: '<path d="M4 4h16l2 12v4H2v-4L4 4ZM2 16h6a4 4 0 0 0 8 0h6"/>',
    team: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    knowledge: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5ZM4 18.5A2.5 2.5 0 0 1 6.5 16H20M8 7h8M8 11h6"/>'
  };
  const items = state.profile.role === "pending" ? [["intake", "✎", "Meu cadastro"], ["documents", "▤", "Documentos"]] : [
    ["dashboard", "▦", "Visão geral"],
    ...(staff() ? [["attendances", "◷", "Atendimentos"], ["leads", "◇", "Leads"], ["clients", "◉", "Clientes"]] : state.profile.role === "client" ? [["attendances", "◷", "Meu atendimento"]] : [["intake", "✎", "Meu cadastro"]]),
    ["cases", "▣", "Processos"], ["tasks", "✓", "Tarefas"], ["agenda", "◷", "Agenda"],
    ["documents", "▤", "Documentos"],
    ...(admin() ? [["trash", "♲", "Lixeira"]] : []),
    ...(admin() ? [["requests", "◷", "Cadastros recebidos"], ["team", "♙", "Equipe"], ["knowledge", "✦", "Ensinar assistente"]] : [])
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
  const renderers = { dashboard: renderDashboard, attendances: renderAttendances, leads: () => renderContacts("lead"), clients: () => renderContacts("client"), intake: renderIntake, documents: renderDocuments, trash: renderTrash, requests: renderRequests, cases: renderCases, tasks: () => renderTasks(false), agenda: () => renderTasks(true), team: renderTeam, knowledge: renderKnowledge };
  (renderers[state.view] || renderDashboard)();
}

function renderPending() {
  $("#page-head").innerHTML = '<div><p class="eyebrow">ÁREA DO CLIENTE</p><h1>Complete seu cadastro</h1><p>Envie seus dados e documentos para análise da equipe.</p></div>';
  renderNav();
  renderIntake();
}

function renderHead() {
  const titles = { dashboard: staff() ? "Visão geral" : "Seu atendimento", attendances: "Atendimentos", leads: "Leads", clients: "Clientes", intake: "Meu cadastro", documents: "Documentos", trash: "Lixeira", requests: "Cadastros recebidos", cases: "Processos", tasks: "Tarefas", agenda: "Agenda", team: "Equipe", knowledge: "Ensinar assistente" };
  const descriptions = { dashboard: staff() ? "Acompanhe os registros do escritório em um só lugar." : "Acompanhe as informações compartilhadas pela equipe.", attendances: "Triagens recebidas pelo site e seus próximos passos.", leads: "Organize oportunidades e próximos contatos.", clients: "Consulte as pessoas atendidas pelo escritório.", intake: "Seus dados enviados ao escritório.", documents: "Arquivos protegidos do atendimento.", trash: "Restaure documentos ou faça a exclusão definitiva.", requests: "Analise os pedidos antes de vincular clientes.", cases: "Acompanhe casos e processos jurídicos.", tasks: "Controle atividades e compromissos.", agenda: "Veja os compromissos em ordem de data.", team: "Gerencie quem acessa o painel do escritório.", knowledge: "Cadastre respostas aprovadas para cada área jurídica." };
  const entities = { leads: ["contact", "Novo lead"], clients: ["contact", "Novo cliente"], cases: ["case", "Novo processo"], tasks: ["task", "Nova tarefa"], team: ["staff", "Adicionar integrante"] };
  const action = staff() && (admin() || state.view !== "clients") && entities[state.view] ? `<button class="primary" data-new="${entities[state.view][0]}">＋ ${entities[state.view][1]}</button>` : "";
  $("#page-head").innerHTML = `<div><p class="eyebrow">${staff() ? "NÚCLEO ADVOGADOS · CRM" : "ÁREA DO CLIENTE"}</p><h1>${titles[state.view]}</h1><p>${descriptions[state.view]}</p></div>${action}`;
}

const contactName = (id) => state.contacts.find((item) => item.id === id)?.name || "Cliente";
const intakeLeads = () => admin() ? state.requestProfiles.filter((profile) => profile.role === "pending" && !state.contacts.some((contact) => contact.email?.toLowerCase() === profile.email?.toLowerCase())) : [];
const intakeLeadRow = (profile) => {
  const request = state.requests.find((item) => item.user_id === profile.id);
  return `<article class="intake-lead"><div><strong>${esc(profile.full_name || profile.email)}</strong><small>${esc(profile.email)} · ${request ? "Formulário enviado" : "Aguardando formulário"}</small></div><span class="badge">${request ? esc(request.status) : "Cadastro iniciado"}</span></article>`;
};
const filtered = (items, fields) => !state.search ? items : items.filter((item) => fields.some((field) => String(field(item) || "").toLowerCase().includes(state.search)));
const empty = (message) => `<p class="empty">${message}</p>`;

function renderDashboard() {
  const leads = state.contacts.filter((c) => c.kind === "lead");
  const attendanceQueue = [["Novos","Novo atendimento"],["Em triagem","Em triagem"],["Em análise","Em análise"],["Aguardando advogado","Aguardando validação do advogado"],["Aguardando cliente","Aguardando cliente"],["Concluídos","Concluído"]];
  const urgentAttendances = state.attendances.filter((item) => item.priority === "Urgente" && !["Concluído","Cancelado"].includes(item.status)).length;
  const stalledLeads = leads.filter((item) => ["novo","em contato"].includes(item.stage)).length;
  const recentActivity = state.contactHistory.slice(0, 5);
  const registrations = intakeLeads();
  const clients = state.contacts.filter((c) => c.kind === "client");
  const pending = state.tasks.filter((t) => !t.done);
  const cards = staff() ? [["Leads", leads.length + registrations.length, "Inclui cadastros iniciados", "leads"], ["Clientes", clients.length, "Clientes ativos", "clients"], ["Processos", state.cases.length, "Casos registrados", "cases"], ["Tarefas pendentes", pending.length, "Para acompanhar", "tasks"]] : [["Processos", state.cases.length, "Compartilhados com você", "cases"], ["Compromissos", pending.length, "Tarefas em aberto", "agenda"], ["Concluídos", state.tasks.filter((t) => t.done).length, "Compromissos finalizados", "tasks"], ["Atualizações", state.cases.length + state.tasks.length, "Itens disponíveis", "dashboard"]];
  const stages = ["novo", "em contato", "proposta enviada", "negociação"];
  const main = staff() ? `<div class="pipeline" aria-label="Funil de oportunidades">${stages.map((stage) => `<div class="pipeline-column" data-pipeline-stage="${esc(stage)}" role="list"><h3>${stage}<span>${leads.filter((c) => c.stage === stage).length}</span></h3>${leads.filter((c) => c.stage === stage).slice(0, 8).map((c) => `<button type="button" class="pipeline-item" draggable="true" data-pipeline-card="${c.id}" data-edit="contact" data-id="${c.id}" role="listitem"><strong>${esc(c.name)}</strong><small>${esc(c.source || "Sem origem")}</small></button>`).join("")}${leads.filter((c) => c.stage === stage).length > 8 ? `<small class="pipeline-more">+ ${leads.filter((c) => c.stage === stage).length - 8} oportunidades</small>` : ""}</div>`).join("")}</div>${registrations.length ? `<div class="intake-leads-head"><strong>Cadastros iniciados</strong><button type="button" class="row-action" data-view="requests">Ver todos</button></div>${registrations.slice(0, 4).map(intakeLeadRow).join("")}` : ""}` : recordList(state.cases, "Nenhum processo compartilhado ainda.", (c) => `<div><strong>${esc(c.title)}</strong><small>${esc(c.area || "Área não informada")}</small></div><span></span><span class="badge">${esc(c.status)}</span>`);
  $("#workspace").innerHTML = `${staff() ? '<div class="dashboard-actions"><span>Seu espaço de trabalho</span><div><button type="button" class="secondary" data-view="attendances">Abrir atendimentos</button><button type="button" class="secondary" data-new="task">＋ Nova tarefa</button></div></div>' : ''}${staff() ? `<section class="attendance-queue"><div class="panel-head"><h2>Fila de atendimentos</h2><button type="button" class="row-action" data-view="attendances">Ver todos ↗</button></div><div>${attendanceQueue.map(([label,status]) => `<button type="button" data-view="attendances"><span>${label}</span><strong>${state.attendances.filter((item) => item.status === status).length}</strong></button>`).join("")}</div></section>` : ""}<div class="kpis">${cards.map(([label, value, note, view]) => `<button type="button" class="card" data-view="${view}" aria-label="${label}: ${value}. Abrir seção"><span>${label}</span><strong>${value}</strong><small>${note}</small><b aria-hidden="true">↗</b></button>`).join("")}</div>${staff() ? `<section class="dashboard-insights"><article><span>Atendimentos urgentes</span><strong>${urgentAttendances}</strong><small>Em aberto no fluxo jurídico</small></article><article><span>Leads para contato</span><strong>${stalledLeads}</strong><small>Nas primeiras etapas do funil</small></article><article><span>Atividade recente</span><strong>${recentActivity.length}</strong><small>Alterações de etapa registradas</small></article></section>` : ""}<div class="dashboard-grid"><section class="panel"><div class="panel-head"><h2>${staff() ? "Funil de oportunidades" : "Seus processos"}</h2>${staff() ? '<button type="button" class="row-action" data-view="leads">Ver todos ↗</button>' : ''}</div>${main}</section><section class="panel"><div class="panel-head"><h2>Próximos compromissos</h2><button type="button" class="row-action" data-view="agenda">Ver agenda ↗</button></div>${recordList(pending.slice(0, 6), "Nenhum compromisso pendente.", (t) => `<div><strong>${esc(t.title)}</strong><small>${staff() ? esc(contactName(t.contact_id)) : "Compartilhado com você"}</small></div><span></span><span class="badge">${date(t.due_at)}</span>`)}</section></div>`;
}

function recordList(items, message, content, action = "") {
  const tableByAction = { contact: "contacts", case: "cases", task: "tasks" };
  return items.length ? `<div class="records">${items.map((item) => `<article class="record">${content(item)}${action ? `<div class="row-actions"><button class="row-action" data-edit="${action}" data-id="${item.id}">Editar</button>${admin() && tableByAction[action] ? `<button class="row-action danger" data-record-delete="${tableByAction[action]}" data-id="${item.id}">Excluir</button>` : ""}</div>` : ""}</article>`).join("")}</div>` : empty(message);
}

const attendanceStatuses = ["Novo atendimento", "Em triagem", "Em análise", "Aguardando validação do advogado", "Em atendimento", "Aguardando cliente", "Concluído", "Cancelado"];
const dateTime = (value) => value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—";
const staffName = (id) => state.lawyers.find((item) => item.id === id)?.full_name || state.lawyers.find((item) => item.id === id)?.email || "Não atribuído";
const attendanceContact = (attendance) => state.contacts.find((contact) => contact.id === attendance.contact_id) || {};
const attendanceBadge = (status) => `<span class="badge attendance-status ${status === "Novo atendimento" ? "is-new" : ""}">${esc(status)}</span>`;

function renderAttendances() {
  if (state.attendanceDetail) return renderAttendanceDetail(state.attendanceDetail);
  const items = filtered(state.attendances, [(a) => attendanceContact(a).name, (a) => attendanceContact(a).phone, (a) => a.city_uf, (a) => a.demand_area, (a) => a.attendance_number, (a) => a.status]);
  const rows = items.length ? `<div class="attendance-table"><div class="attendance-row attendance-heading"><span>Cliente</span><span>Área</span><span>Cidade</span><span>WhatsApp</span><span>Data</span><span>Status</span><span>Ações</span></div>${items.map((attendance) => { const contact = attendanceContact(attendance); return `<article class="attendance-row"><div><strong>${esc(contact.name || "Cliente")}</strong><small>${esc(attendance.attendance_number)}</small></div><span>${esc(attendance.demand_area)}</span><span>${esc(attendance.city_uf)}</span><a class="phone-link" href="https://wa.me/55${String(contact.phone || "").replace(/\D/g, "")}" target="_blank" rel="noopener">${esc(contact.phone || "—")}</a><span>${date(attendance.created_at)}</span>${attendanceBadge(attendance.status)}<div class="row-actions"><button type="button" class="row-action" data-attendance-open="${attendance.id}">Abrir</button>${admin() ? `<button type="button" class="row-action danger" data-attendance-delete="${attendance.id}">Excluir</button>` : ""}</div></article>`; }).join("")}</div>` : empty("Nenhum atendimento recebido ainda.");
  const newCount = items.filter((a) => a.status === "Novo atendimento").length;
  $("#workspace").innerHTML = `<section class="panel"><div class="panel-head"><h2>Painel de Atendimento</h2><span>${items.length} registros${newCount ? ` · ${newCount} novo(s)` : ""}</span></div>${rows}</section>`;
}

const teamOptionLabel = (person) => `${person.full_name || person.email} — ${person.team_function || "Equipe"}${person.practice_area ? ` · ${person.practice_area}` : ""}`;
const teamSelectOptions = (selected, onlyLawyers = false) => `<option value="">Não atribuído</option>${state.lawyers.filter((person) => !onlyLawyers || person.team_function === "Advogado").map((person) => `<option value="${person.id}" ${selected === person.id ? "selected" : ""}>${esc(teamOptionLabel(person))}</option>`).join("")}`;
function attendanceTeamControls(attendance) {
  return `<section class="panel detail-panel management-panel"><div class="panel-head"><h3>Triagem e distribuição</h3><span>Defina quem conduz cada etapa</span></div><form id="attendance-management" class="management-form triage-management"><label>Status<select name="status">${attendanceStatuses.map((status) => `<option value="${status}" ${attendance.status === status ? "selected" : ""}>${status}</option>`).join("")}</select></label><label>Prioridade<select name="priority">${["Urgente","Prioridade normal","Baixa"].map((priority) => `<option value="${priority}" ${attendance.priority === priority ? "selected" : ""}>${priority === "Urgente" ? "🔴 Urgente" : priority === "Baixa" ? "🟢 Baixa" : "🟡 Prioridade normal"}</option>`).join("")}</select></label><label>Próxima ação<select name="next_action">${["","Solicitar documentos","Entrar em contato","Agendar reunião","Elaborar parecer","Encaminhar ao advogado","Encerrar demanda"].map((action) => `<option value="${action}" ${attendance.next_action === action ? "selected" : ""}>${action || "Definir depois"}</option>`).join("")}</select></label><label>Responsável pelo atendimento<select name="assigned_staff_id">${teamSelectOptions(attendance.assigned_staff_id)}</select></label><label>Responsável pela triagem<select name="triage_responsible_id">${teamSelectOptions(attendance.triage_responsible_id)}</select></label><label>Responsável pela análise<select name="analysis_responsible_id">${teamSelectOptions(attendance.analysis_responsible_id)}</select></label><label>Advogado responsável<select name="lawyer_responsible_id">${teamSelectOptions(attendance.lawyer_responsible_id, true)}</select></label><label class="management-wide">Anotações da triagem<textarea name="triage_notes" rows="4" maxlength="4000" placeholder="Urgência, conflito de interesses, documentos necessários e encaminhamento.">${esc(attendance.triage_notes || "")}</textarea></label><button class="primary" type="submit">Salvar triagem e distribuição</button><p id="attendance-management-message" class="message hidden" role="status"></p></form><form id="attendance-opinion" class="note-form"><label for="attendance-opinion-text">Parecer interno / análise preliminar</label><textarea id="attendance-opinion-text" name="body" maxlength="2000" rows="3" placeholder="Registre a análise preliminar para validação do advogado."></textarea><button class="secondary" type="submit">Registrar parecer</button><p id="attendance-opinion-message" class="message hidden" role="status"></p></form><div class="attendance-quick-actions"><button type="button" class="secondary" data-attendance-docs="${attendance.id}">Solicitar documentos</button></div></section>`;
}

function renderAttendanceDetail(attendance) {
  const contact = attendanceContact(attendance);
  const history = state.attendanceHistory.filter((item) => item.attendance_id === attendance.id);
  const whatsapp = `https://wa.me/55${String(contact.phone || "").replace(/\D/g, "")}`;
  const teamControls = staff() ? `<section class="panel detail-panel management-panel"><div class="panel-head"><h3>Condução do atendimento</h3></div><form id="attendance-management" class="management-form"><label>Status<select name="status">${attendanceStatuses.map((status) => `<option value="${status}" ${attendance.status === status ? "selected" : ""}>${status}</option>`).join("")}</select></label><label>Advogado/responsável<select name="assigned_staff_id"><option value="">Não atribuído</option>${state.lawyers.map((person) => `<option value="${person.id}" ${attendance.assigned_staff_id === person.id ? "selected" : ""}>${esc(person.full_name || person.email)}</option>`).join("")}</select></label><button class="primary" type="submit">Salvar alterações</button><p id="attendance-management-message" class="message hidden" role="status"></p></form><div class="attendance-quick-actions"><button type="button" class="secondary" data-attendance-docs="${attendance.id}">Solicitar documentos</button><a class="secondary" href="${whatsapp}?text=${encodeURIComponent(`Olá, ${contact.name || ""}. Para dar continuidade ao atendimento ${attendance.attendance_number}, pedimos que envie os documentos relacionados ao caso pelo seu painel seguro.`)}" target="_blank" rel="noopener">Enviar mensagem</a></div></section><section class="panel detail-panel"><div class="panel-head"><h3>Histórico do atendimento</h3><span>${history.length} eventos</span></div><div class="history-list">${history.length ? history.map((item) => `<article><div><strong>${esc(item.event_type)}</strong><p>${esc(item.body)}</p></div><time>${dateTime(item.created_at)}</time></article>`).join("") : empty("Nenhum evento registrado.")}</div><form id="attendance-note" class="note-form"><label for="attendance-note-text">Adicionar observação interna</label><textarea id="attendance-note-text" name="body" maxlength="2000" rows="3" placeholder="Registre uma informação para a equipe."></textarea><button class="secondary" type="submit">Registrar observação</button><p id="attendance-note-message" class="message hidden" role="status"></p></form></section>` : `<section class="panel detail-panel client-progress"><div class="panel-head"><h3>Acompanhamento</h3></div><p>Este é o status atual do seu atendimento. A equipe entrará em contato pelo WhatsApp sempre que precisar de novas informações ou documentos.</p><a class="secondary" href="${whatsapp}" target="_blank" rel="noopener">Falar com a equipe pelo WhatsApp</a></section>`;
  $("#workspace").innerHTML = `<section class="attendance-detail"><div class="detail-top"><button type="button" class="row-action back-detail" data-attendance-back>← ${staff() ? "Todos os atendimentos" : "Meu atendimento"}</button>${attendanceBadge(attendance.status)}</div><div class="detail-title"><div><p class="eyebrow">${esc(attendance.attendance_number)}</p><h2>${esc(contact.name || "Cliente")}</h2><p>Recebido em ${dateTime(attendance.created_at)} · Origem: ${esc(attendance.source)}</p></div>${staff() ? `<a class="primary whatsapp-action" href="${whatsapp}" target="_blank" rel="noopener">WhatsApp ↗</a>` : ""}</div><div class="attendance-detail-grid"><section class="panel detail-panel"><div class="panel-head"><h3>Dados do cliente</h3></div><dl><div><dt>Nome</dt><dd>${esc(contact.name || "—")}</dd></div><div><dt>WhatsApp</dt><dd>${esc(contact.phone || "—")}</dd></div><div><dt>Cidade/UF</dt><dd>${esc(attendance.city_uf)}</dd></div></dl></section><section class="panel detail-panel"><div class="panel-head"><h3>Informações do atendimento</h3></div><dl><div><dt>ID do atendimento</dt><dd>${esc(attendance.attendance_number)}</dd></div><div><dt>Entrada</dt><dd>${dateTime(attendance.created_at)}</dd></div><div><dt>Origem</dt><dd>${esc(attendance.source)}</dd></div></dl></section></div><section class="panel detail-panel demand-panel"><div class="panel-head"><h3>Dados da demanda</h3></div><dl><div><dt>Área</dt><dd>${esc(attendance.demand_area)}</dd></div><div><dt>Possui documentos?</dt><dd>${esc(attendance.has_documents)}</dd></div><div><dt>Descrição completa</dt><dd class="cause-description">${esc(attendance.cause_description)}</dd></div></dl></section>${teamControls}</section>`;
  if (staff()) document.querySelector(".management-panel")?.replaceWith(document.createRange().createContextualFragment(attendanceTeamControls(attendance)));
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
  const members = state.lawyers;
  $("#workspace").innerHTML = `<section class="panel"><div class="panel-head"><div><h2>Equipe e distribuição</h2><p>Defina função, área e nível de acesso de cada pessoa.</p></div><span>${members.length} membros ativos</span></div>${members.length ? `<div class="team-workflow-list">${members.map((member) => `<form class="team-profile-form" data-team-profile="${member.id}"><div class="team-profile-identity"><strong>${esc(member.full_name || member.email)}</strong><small>${esc(member.email || "")}</small><span class="badge">${member.role === "owner" ? "Administrador principal" : member.role === "super_admin" ? "Super administrador" : "Equipe"}</span></div><label>Função<select name="team_function"><option value="Atendente" ${member.team_function === "Atendente" ? "selected" : ""}>Atendente</option><option value="Estagiário" ${member.team_function === "Estagiário" ? "selected" : ""}>Estagiário</option><option value="Advogado" ${member.team_function === "Advogado" ? "selected" : ""}>Advogado</option></select></label><label>Nível de acesso<select name="role" ${member.role === "owner" ? "disabled" : ""}><option value="staff" ${member.role === "staff" ? "selected" : ""}>Equipe</option><option value="super_admin" ${member.role === "super_admin" ? "selected" : ""}>Super administrador</option></select></label><label>Área<input name="practice_area" maxlength="120" placeholder="Ex.: Trabalhista" value="${esc(member.practice_area || "")}"></label><button class="secondary" type="submit">Salvar</button><p class="message hidden" role="status"></p></form>`).join("")}</div>` : empty("Nenhum integrante ativo. Convide uma pessoa para a equipe e ela aparecerá aqui após criar o acesso.")}<div class="team-invites"><h3>Convites ativos</h3>${state.team.length ? `<div class="records">${state.team.map((item) => `<article class="record"><div><strong>${esc(item.email)}</strong><small>${esc(item.team_function || "Atendente")} · ${item.requested_role === "super_admin" ? "Super administrador" : "Equipe"}</small></div><div class="row-actions"><span class="badge">Ativo</span><button type="button" class="row-action danger" data-invite-delete="${esc(item.email)}">Excluir</button></div></article>`).join("")}</div>` : empty("Nenhum convite ativo.")}</div></section>`;
}

function renderKnowledge() {
  if (!admin()) return renderDashboard();
  const rows = state.assistantKnowledge.filter((item) => item.area_key === state.trainingArea);
  $("#workspace").innerHTML = `<div class="knowledge-layout"><section class="panel knowledge-editor">
    <div class="panel-head"><div><h2>Respostas por área</h2><p>Escolha uma área. As respostas publicadas aparecem no assistente dessa aba.</p></div></div>
    <div class="knowledge-body"><label>Área jurídica<select id="knowledge-area">${assistantAreas.map(([key,label]) => `<option value="${key}" ${state.trainingArea === key ? "selected" : ""}>${esc(label)}</option>`).join("")}</select></label>
    <form id="knowledge-form"><input type="hidden" name="id"><label>Pergunta que a pessoa pode fazer<input name="question" required minlength="8" maxlength="240" placeholder="Ex.: Como posso iniciar o atendimento?"></label>
      <label>Termos de busca <span>(opcional, separados por ;)</span><input name="keywords" maxlength="400" placeholder="Ex.: falar com advogado; primeiro contato"></label>
      <label>Resposta aprovada pela equipe<textarea name="answer" required minlength="12" maxlength="2500" rows="8" placeholder="Escreva a orientação que o assistente poderá usar nesta área."></textarea></label>
      <label class="knowledge-publish"><input type="checkbox" name="is_published"> Publicar resposta no site</label>
      <div class="knowledge-actions"><button class="primary" type="submit">Salvar resposta</button><button class="secondary" type="button" data-knowledge-clear>Nova resposta</button></div>
      <p class="field-help">Inclua apenas informações que podem ser vistas pelo público. Respostas em rascunho não aparecem no site. Este recurso usa perguntas e respostas aprovadas, sem treinar um modelo de linguagem.</p>
      <p id="knowledge-message" class="message hidden" role="status"></p>
    </form></div></section>
    <section class="panel"><div class="panel-head"><h2>Conteúdo desta área</h2><span>${rows.length} ${rows.length === 1 ? "resposta" : "respostas"}</span></div>
      ${rows.length ? `<div class="knowledge-list">${rows.map((item) => `<article><div><span class="badge">${item.is_published ? "Publicada" : "Rascunho"}</span><h3>${esc(item.question)}</h3><p>${esc(item.answer)}</p>${item.keywords ? `<small>Termos: ${esc(item.keywords)}</small>` : ""}</div><div class="knowledge-item-actions"><button type="button" class="row-action" data-knowledge-edit="${item.id}">Editar</button><button type="button" class="row-action danger" data-knowledge-delete="${item.id}">Excluir</button></div></article>`).join("")}</div>` : empty("Nenhuma resposta cadastrada nesta área.")}
    </section></div>`;
}

async function refreshKnowledge() {
  const { data, error } = await supabase.from("assistant_area_qa").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  state.assistantKnowledge = data || [];
  renderKnowledge();
}

async function saveKnowledge(form) {
  if (!admin()) return;
  const values = new FormData(form);
  const id = String(values.get("id") || "");
  const payload = {
    area_key: state.trainingArea,
    question: String(values.get("question") || "").trim(),
    keywords: String(values.get("keywords") || "").trim(),
    answer: String(values.get("answer") || "").trim(),
    is_published: values.has("is_published"),
    updated_at: new Date().toISOString()
  };
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const result = id ? await supabase.from("assistant_area_qa").update(payload).eq("id", id).select("id").single()
      : await supabase.from("assistant_area_qa").insert(payload).select("id").single();
    if (result.error) throw result.error;
    await refreshKnowledge();
    showMessage("#knowledge-message", "Resposta salva. As publicadas serão usadas na próxima conversa.", "success");
  } catch (error) {
    showMessage("#knowledge-message", friendlyError(error), "error");
  } finally { button.disabled = false; }
}

async function saveTeamProfile(form) {
  const message = form.querySelector(".message");
  const values = new FormData(form);
  const payload = { team_function: values.get("team_function"), practice_area: String(values.get("practice_area") || "").trim() };
  if (admin() && form.elements.role && !form.elements.role.disabled) payload.role = values.get("role") || "staff";
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  try {
    const { error } = await supabase.from("profiles").update(payload).eq("id", form.dataset.teamProfile);
    if (error) throw error;
    message.textContent = "Função atualizada."; message.className = "message success";
    await loadPortal();
  } catch (error) {
    message.textContent = friendlyError(error); message.className = "message error";
  } finally { button.disabled = false; }
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
    </form></div></section>${request ? documentUploadForm() + `<section class="panel"><div class="panel-head"><h2>Documentos enviados</h2></div>${documentRows(state.documents)}</section>` : '<p class="empty">Depois de enviar o cadastro, você poderá anexar documentos em PDF, imagem, áudio ou vídeo.</p>'}`;
}

function documentUploadForm() {
  return `<section class="panel upload-panel"><div class="panel-head"><h2>Enviar documentos</h2></div><div class="intake-body">
    <p>Envie somente arquivos necessários ao atendimento. Aceitamos PDF, imagens, áudio e vídeo, até 50 MB por arquivo.</p>
    <form id="document-form" class="upload-form"><label>Escolher arquivo<input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.mp3,.m4a,.wav,.ogg,.mp4,.webm,.mov,application/pdf,image/jpeg,image/png,image/webp,image/gif,audio/mpeg,audio/mp4,audio/wav,audio/ogg,video/mp4,video/webm,video/quicktime" required></label>
    <button type="submit" class="primary">Enviar documento</button><p id="document-message" class="message hidden" role="status"></p></form></div></section>`;
}

function documentRows(items) {
  return items.length ? `<div class="documents-list">${items.map((d) => `<div class="document-row"><div><strong>${esc(d.file_name)}</strong><small>${date(d.created_at)} · ${Math.ceil(d.size_bytes / 1024)} KB${staff() ? ` · ${esc(contactName(d.contact_id))}` : ""}</small></div><div class="row-actions"><button type="button" class="row-action" data-download="${d.id}">Baixar</button>${admin() ? `<button type="button" class="row-action danger" data-document-delete="${d.id}">Excluir</button>` : ""}</div></div>`).join("")}</div>` : empty("Nenhum documento enviado ainda.");
}

function renderDocuments() {
  const documents = filtered(state.documents, [(d) => d.file_name, (d) => contactName(d.contact_id)]);
  $("#workspace").innerHTML = `${!staff() && (state.requests.length || state.attendances.length) ? documentUploadForm() : ""}
    <section class="panel"><div class="panel-head"><h2>${staff() ? "Documentos dos clientes" : "Meus documentos"}</h2><span>${documents.length} arquivos</span></div>${documentRows(documents)}</section>`;
}

function renderTrash() {
  const items = filtered(state.trashDocuments, [(d) => d.file_name, (d) => contactName(d.contact_id)]);
  const rows = items.length ? `<div class="documents-list">${items.map((d) => `<div class="document-row"><div><strong>${esc(d.file_name)}</strong><small>Excluído em ${date(d.deleted_at)} · ${Math.ceil(d.size_bytes / 1024)} KB${d.contact_id ? ` · ${esc(contactName(d.contact_id))}` : ""}</small></div><div class="row-actions"><button type="button" class="row-action" data-document-restore="${d.id}">Restaurar</button><button type="button" class="row-action danger" data-document-purge="${d.id}">Excluir definitivamente</button></div></div>`).join("")}</div>` : empty("A lixeira está vazia.");
  $("#workspace").innerHTML = `<section class="panel"><div class="panel-head"><h2>Documentos na lixeira</h2><span>${items.length} arquivos</span></div>${rows}</section>`;
}

function renderRequests() {
  const items = state.requests.filter((r) => r.status !== "aprovado");
  const incomplete = intakeLeads().filter((profile) => !state.requests.some((request) => request.user_id === profile.id));
  $("#workspace").innerHTML = `<section class="panel"><div class="panel-head"><h2>Novos cadastros</h2><span>${items.length} para análise · ${incomplete.length} aguardando formulário</span></div>
    ${items.length ? `<div class="request-list">${items.map((r) => `<article class="request-card"><div><strong>${esc(r.full_name)}</strong><small>${esc(state.requestProfiles.find((p) => p.id === r.user_id)?.email || "")} · ${esc(r.phone)}</small><p><b>${esc(r.subject)}</b> — ${esc(r.description)}</p><small>${state.documents.filter((d) => d.user_id === r.user_id).length} documento(s) · ${esc(r.status)}</small></div><div class="request-actions"><button class="primary" type="button" data-approve="${r.id}">Aprovar e vincular</button><button class="secondary" type="button" data-request-docs="${r.user_id}">Ver documentos</button></div></article>`).join("")}</div>` : ""}${incomplete.length ? `<div class="intake-leads-head"><strong>Aguardando formulário do cliente</strong></div>${incomplete.map(intakeLeadRow).join("")}` : ""}${!items.length && !incomplete.length ? empty("Nenhum cadastro aguardando análise.") : ""}</section>`;
}

function assignmentControls(contact) {
  if (!admin()) return "";
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
  } else { title = "Adicionar integrante"; fields = `<label>E-mail do integrante<input name="email" type="email" required maxlength="254"></label><div class="form-grid"><label>Função<select name="team_function"><option>Atendente</option><option>Estagiário</option><option>Advogado</option></select></label><label>Nível de acesso<select name="requested_role"><option value="staff">Equipe</option><option value="super_admin">Super administrador</option></select></label></div><p class="field-help">O convite define o acesso quando a pessoa confirmar o cadastro.</p>`; }
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
    if (state.entity === "staff") query = supabase.from("team_invites").insert({ email: values.email.toLowerCase(), team_function: values.team_function || "Atendente", requested_role: values.requested_role || "staff" });
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
  const extensionByType = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov"
  };
  if (!extensionByType[file.type] || file.size > 52428800 || !file.size) return showMessage("#document-message", "Use PDF, imagem, áudio ou vídeo com até 50 MB.", "error");
  const button = form.querySelector('button[type="submit"]'); button.disabled = true;
  const extension = extensionByType[file.type];
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

async function deleteDocument(id) {
  const document = state.documents.find((item) => item.id === id);
  if (!document || !admin() || !window.confirm(`Excluir permanentemente o documento “${document.file_name}”?`)) return;
  try {
    const removed = await supabase.storage.from("client-documents").remove([document.path]);
    if (removed.error) throw removed.error;
    const { error } = await supabase.from("client_documents").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    await loadPortal(); showMessage("#portal-message", "Documento excluído.", "success");
  } catch (error) { showMessage("#portal-message", "Não foi possível excluir o documento. Verifique se você é administrador.", "error"); }
}

async function restoreDocument(id) {
  if (!admin()) return;
  const { error } = await supabase.from("client_documents").update({ deleted_at: null }).eq("id", id);
  if (error) return showMessage("#portal-message", "Não foi possível restaurar o documento.", "error");
  await loadPortal(); showMessage("#portal-message", "Documento restaurado.", "success");
}

async function purgeDocument(id) {
  const document = state.trashDocuments.find((item) => item.id === id);
  if (!document || !admin() || !window.confirm(`Excluir definitivamente “${document.file_name}”?`)) return;
  try {
    const removed = await supabase.storage.from("client-documents").remove([document.path]);
    if (removed.error) throw removed.error;
    const { error } = await supabase.from("client_documents").delete().eq("id", id);
    if (error) throw error;
    await loadPortal(); showMessage("#portal-message", "Documento excluído definitivamente.", "success");
  } catch { showMessage("#portal-message", "Não foi possível concluir a exclusão definitiva.", "error"); }
}

async function deleteRecord(table, id) {
  if (!admin() || !window.confirm("Excluir permanentemente este registro? Esta ação não pode ser desfeita.")) return;
  try {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) throw error;
    await loadPortal(); showMessage("#portal-message", "Registro excluído.", "success");
  } catch { showMessage("#portal-message", "Não foi possível excluir. O registro pode estar vinculado a outros dados.", "error"); }
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
  if (!admin() || !staffId) return;
  const query = remove ? supabase.from("client_assignments").delete().eq("contact_id",contactId).eq("staff_id",staffId)
    : supabase.from("client_assignments").insert({contact_id:contactId,staff_id:staffId});
  const { error } = await query;
  if (error) return showMessage("#portal-message","Não foi possível alterar a distribuição.","error");
  await loadPortal(); showMessage("#portal-message","Distribuição atualizada.","success");
}

async function saveAttendanceManagement(form) {
  const attendance = state.attendanceDetail;
  if (!attendance) return;
  const button = form.querySelector('button[type="submit"]'); button.disabled = true;
  const values = Object.fromEntries(new FormData(form));
  const payload = { status: values.status, priority: values.priority, next_action: values.next_action, triage_notes: String(values.triage_notes || "").trim(), assigned_staff_id: values.assigned_staff_id || null, triage_responsible_id: values.triage_responsible_id || null, analysis_responsible_id: values.analysis_responsible_id || null, lawyer_responsible_id: values.lawyer_responsible_id || null };
  try {
    const { error } = await supabase.from("attendances").update(payload).eq("id", attendance.id);
    if (error) throw error;
    await loadPortal();
    state.view = "attendances";
    state.attendanceDetail = state.attendances.find((item) => item.id === attendance.id) || null;
    renderNav(); render();
    showMessage("#portal-message", "Atendimento atualizado e histórico registrado.", "success");
  } catch { showMessage("#attendance-management-message", "Não foi possível salvar as alterações. Tente novamente.", "error"); }
  finally { button.disabled = false; }
}

async function addAttendanceHistory(attendanceId, eventType, body, target) {
  try {
    const { error } = await supabase.from("attendance_history").insert({ attendance_id: attendanceId, event_type: eventType, body });
    if (error) throw error;
    await loadPortal();
    state.view = "attendances";
    state.attendanceDetail = state.attendances.find((item) => item.id === attendanceId) || null;
    renderNav(); render();
    showMessage("#portal-message", eventType === "Observação interna" ? "Observação registrada no histórico." : "Solicitação de documentos registrada no histórico.", "success");
  } catch { showMessage(target, "Não foi possível registrar este evento. Tente novamente.", "error"); }
}

async function movePipelineCard(cardId, stage) {
  const card = state.contacts.find((item) => item.id === cardId);
  if (!card || !staff() || card.stage === stage) return;
  const previousStage = card.stage;
  card.stage = stage;
  render();
  try {
    const { error } = await supabase.from("contacts").update({ stage }).eq("id", cardId);
    if (error) throw error;
    showMessage("#portal-message", `Oportunidade movida para “${stage}”.`, "success");
  } catch {
    card.stage = previousStage;
    render();
    showMessage("#portal-message", "Não foi possível mover esta oportunidade.", "error");
  }
}

document.addEventListener("dragstart", (event) => {
  const card = event.target.closest("[data-pipeline-card]");
  if (!card) return;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", card.dataset.pipelineCard);
  card.classList.add("is-dragging");
});
document.addEventListener("dragend", (event) => {
  event.target.closest("[data-pipeline-card]")?.classList.remove("is-dragging");
  document.querySelectorAll(".pipeline-column.is-over").forEach((column) => column.classList.remove("is-over"));
});
document.addEventListener("dragover", (event) => {
  const column = event.target.closest("[data-pipeline-stage]");
  if (!column) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  document.querySelectorAll(".pipeline-column.is-over").forEach((item) => { if (item !== column) item.classList.remove("is-over"); });
  column.classList.add("is-over");
});
document.addEventListener("drop", async (event) => {
  const column = event.target.closest("[data-pipeline-stage]");
  if (!column) return;
  event.preventDefault();
  const cardId = event.dataTransfer.getData("text/plain");
  column.classList.remove("is-over");
  await movePipelineCard(cardId, column.dataset.pipelineStage);
});

document.addEventListener("click", async (event) => {
  if (event.target.closest("[data-knowledge-clear]")) { $("#knowledge-form")?.reset(); if ($("#knowledge-form")) $("#knowledge-form").elements.id.value = ""; showMessage("#knowledge-message"); return; }
  const knowledgeEdit = event.target.closest("[data-knowledge-edit]")?.dataset.knowledgeEdit;
  if (knowledgeEdit && admin()) {
    const item = state.assistantKnowledge.find((row) => row.id === knowledgeEdit);
    const form = $("#knowledge-form");
    if (!item || !form) return;
    form.elements.id.value = item.id;
    form.elements.question.value = item.question;
    form.elements.keywords.value = item.keywords || "";
    form.elements.answer.value = item.answer;
    form.elements.is_published.checked = item.is_published;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    form.elements.question.focus({ preventScroll: true });
    return;
  }
  const knowledgeDelete = event.target.closest("[data-knowledge-delete]")?.dataset.knowledgeDelete;
  if (knowledgeDelete && admin()) {
    if (!window.confirm("Excluir esta resposta do assistente?")) return;
    const { error } = await supabase.from("assistant_area_qa").delete().eq("id", knowledgeDelete);
    if (error) return showMessage("#portal-message", friendlyError(error), "error");
    await refreshKnowledge(); showMessage("#portal-message", "Resposta excluída.", "success"); return;
  }
  const attendanceOpen = event.target.closest("[data-attendance-open]")?.dataset.attendanceOpen;
  if (attendanceOpen) { state.view = "attendances"; state.attendanceDetail = state.attendances.find((item) => item.id === attendanceOpen) || null; renderNav(); render(); return; }
  if (event.target.closest("[data-attendance-back]")) { state.attendanceDetail = null; render(); return; }
  const attendanceDocs = event.target.closest("[data-attendance-docs]")?.dataset.attendanceDocs;
  if (attendanceDocs) return addAttendanceHistory(attendanceDocs, "Solicitação de documentos", "Solicitação de documentos preparada para envio ao cliente.", "#portal-message");
  const attendanceDelete = event.target.closest("[data-attendance-delete]")?.dataset.attendanceDelete;
  if (attendanceDelete) return deleteRecord("attendances", attendanceDelete);
  const documentDelete = event.target.closest("[data-document-delete]")?.dataset.documentDelete;
  if (documentDelete) return deleteDocument(documentDelete);
  const documentRestore = event.target.closest("[data-document-restore]")?.dataset.documentRestore;
  if (documentRestore) return restoreDocument(documentRestore);
  const documentPurge = event.target.closest("[data-document-purge]")?.dataset.documentPurge;
  if (documentPurge) return purgeDocument(documentPurge);
  const recordDelete = event.target.closest("[data-record-delete]");
  if (recordDelete) return deleteRecord(recordDelete.dataset.recordDelete, recordDelete.dataset.id);
  const inviteDelete = event.target.closest("[data-invite-delete]")?.dataset.inviteDelete;
  if (inviteDelete && admin() && window.confirm(`Excluir o convite de ${inviteDelete}?`)) {
    const { error } = await supabase.from("team_invites").delete().eq("email", inviteDelete);
    if (error) return showMessage("#portal-message", "Não foi possível excluir o convite.", "error");
    await loadPortal(); showMessage("#portal-message", "Convite excluído.", "success"); return;
  }
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
  if (event.target.id === "knowledge-form") { event.preventDefault(); await saveKnowledge(event.target); return; }
  if (event.target.id === "signup-form") { await submitSignup(event); return; }
  if (event.target.id === "intake-form") { event.preventDefault(); await saveIntake(event.target); }
  if (event.target.id === "document-form") { event.preventDefault(); await uploadDocument(event.target); }
  if (event.target.id === "attendance-management") { event.preventDefault(); await saveAttendanceManagement(event.target); }
  if (event.target.id === "attendance-note") { event.preventDefault(); const body = String(new FormData(event.target).get("body") || "").trim(); if (!body) return showMessage("#attendance-note-message", "Escreva uma observação antes de registrar.", "error"); await addAttendanceHistory(state.attendanceDetail?.id, "Observação interna", body, "#attendance-note-message"); }
  if (event.target.id === "attendance-opinion") { event.preventDefault(); const body = String(new FormData(event.target).get("body") || "").trim(); if (!body) return showMessage("#attendance-opinion-message", "Escreva o parecer antes de registrar.", "error"); await addAttendanceHistory(state.attendanceDetail?.id, "Parecer interno", body, "#attendance-opinion-message"); }
  if (event.target.matches(".team-profile-form")) { event.preventDefault(); await saveTeamProfile(event.target); }
});
document.addEventListener("change", (event) => {
  if (event.target.id === "knowledge-area" && admin()) { state.trainingArea = event.target.value; renderKnowledge(); }
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

const config = window.NUCLEO_SUPABASE || {};
const form = document.querySelector("#triage-form");
const message = document.querySelector("#triage-message");
const submit = document.querySelector("#triage-submit");
const description = document.querySelector("#triage-description");
const descriptionCount = document.querySelector("#description-count");
const submissionKeyName = "nucleo-triage-submission-key";
const attendanceClaimName = "nucleo-attendance-claim";
const claimTokenName = "nucleo-triage-claim-token";
try {
  const aiDraft = sessionStorage.getItem("nucleo-ai-draft");
  if (aiDraft && description && !description.value) {
    description.value = aiDraft;
    description.dispatchEvent(new Event("input", { bubbles: true }));
    sessionStorage.removeItem("nucleo-ai-draft");
  }
} catch {}

const showError = (name, value = "") => {
  const target = document.querySelector(`#error-${name}`);
  if (target) target.textContent = value;
  const input = form.elements[name];
  if (input instanceof RadioNodeList) input.forEach((item) => item.setAttribute("aria-invalid", value ? "true" : "false"));
  else if (input) input.setAttribute("aria-invalid", value ? "true" : "false");
};
const phoneMask = (value) => {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};
const valueOf = (name) => String(new FormData(form).get(name) || "").trim();
function validate() {
  const name = valueOf("name"), phone = valueOf("phone").replace(/\D/g, ""), email = valueOf("email").toLowerCase(), password = valueOf("password"), passwordConfirm = valueOf("password_confirm"), city = valueOf("city"), area = valueOf("area"), cause = valueOf("description"), documents = valueOf("documents");
  const errors = {
    name: name.length < 2 ? "Informe como podemos chamar você." : "",
    phone: !/^\d{10,11}$/.test(phone) ? "Informe um WhatsApp válido com DDD." : "",
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Informe um e-mail válido." : "",
    password: password.length < 8 ? "Crie uma senha com pelo menos 8 caracteres." : "",
    password_confirm: password !== passwordConfirm ? "As senhas não coincidem." : "",
    city: city.length < 2 ? "Informe sua cidade e UF." : "",
    area: !area ? "Selecione a área que melhor descreve sua demanda." : "",
    description: cause.length < 10 ? "Conte um pouco mais sobre o que aconteceu." : "",
    documents: !documents ? "Selecione uma opção para continuar." : ""
  };
  Object.entries(errors).forEach(([field, error]) => showError(field, error));
  const first = Object.keys(errors).find((key) => errors[key]);
  if (first) (document.querySelector(`#triage-${first}`) || form.querySelector(`[name="${first}"]`))?.focus();
  return !first;
}

document.querySelector("#triage-phone").addEventListener("input", (event) => { event.target.value = phoneMask(event.target.value); showError("phone"); });
description.addEventListener("input", () => { descriptionCount.textContent = `${description.value.length.toLocaleString("pt-BR")} / 6.000`; showError("description"); });
form.addEventListener("input", (event) => { if (["name", "email", "password", "password_confirm", "city"].includes(event.target.name)) showError(event.target.name); });
form.addEventListener("change", (event) => { if (["area", "documents"].includes(event.target.name)) showError(event.target.name); });

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.textContent = "";
  if (!validate() || submit.disabled) return;
  if (!config.url || !config.publishableKey) { message.textContent = "O atendimento está sendo preparado. Tente novamente em alguns instantes."; return; }
  submit.disabled = true;
  submit.classList.add("loading");
  submit.querySelector("span").textContent = "Enviando informações…";
  try {
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm");
    const supabase = createClient(config.url, config.publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    let submissionKey = sessionStorage.getItem(submissionKeyName);
    if (!submissionKey) { submissionKey = crypto.randomUUID(); sessionStorage.setItem(submissionKeyName, submissionKey); }
    let accountClaimToken = sessionStorage.getItem(claimTokenName);
    if (!accountClaimToken) { accountClaimToken = crypto.randomUUID(); sessionStorage.setItem(claimTokenName, accountClaimToken); }
    const { data, error } = await supabase.rpc("submit_public_attendance", {
      p_name: valueOf("name"), p_phone: valueOf("phone"), p_city_uf: valueOf("city"), p_demand_area: valueOf("area"), p_cause_description: valueOf("description"), p_has_documents: valueOf("documents"), p_email: valueOf("email").toLowerCase(), p_submission_key: submissionKey, p_account_claim_token: accountClaimToken
    });
    if (error) throw error;
    const attendance = Array.isArray(data) ? data[0] : data;
    if (!attendance?.attendance_number) throw new Error("Resposta inválida do atendimento.");
    sessionStorage.setItem("nucleo-triage-last-attendance", attendance.attendance_number);
    sessionStorage.setItem(attendanceClaimName, JSON.stringify({ attendanceId: attendance.attendance_id, claimToken: accountClaimToken }));
    const email = valueOf("email").toLowerCase();
    let accessCopy = "Confirme o e-mail enviado para liberar seu acesso. Depois, entre para acompanhar seu processo, enviar documentos e conversar com nossa equipe.";
    const signup = await supabase.auth.signUp({ email, password: valueOf("password"), options: { emailRedirectTo: new URL("/crm/", location.origin).toString(), data: { full_name: valueOf("name") } } });
    if (signup.error) accessCopy = "Seu atendimento foi registrado. Para acompanhar seu processo, entre com seu e-mail no painel ou use “Esqueci a senha” caso já possua acesso.";
    else if (!signup.data?.session) accessCopy = "Seu acesso está reservado. Confirme o e-mail enviado e, em seguida, entre para acompanhar seu processo.";
    document.querySelector("#attendance-number").textContent = `#${attendance.attendance_number}`;
    document.querySelector("#access-next-copy").textContent = accessCopy;
    document.querySelector("#portal-access-link").href = `/crm/?email=${encodeURIComponent(email)}`;
    document.querySelector("#triage-form-view").hidden = true;
    document.querySelector("#triage-success").hidden = false;
    sessionStorage.removeItem(submissionKeyName);
    sessionStorage.removeItem(claimTokenName);
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    console.error("Falha ao registrar triagem", error);
    message.textContent = /valid|invalid|Informe|Selecione|Conte/i.test(error.message || "") ? "Confira os campos informados e tente novamente." : "Não foi possível enviar neste momento. Seus dados continuam preenchidos; tente novamente em alguns instantes.";
    submit.disabled = false;
    submit.classList.remove("loading");
    submit.querySelector("span").textContent = "Continuar atendimento";
  }
});

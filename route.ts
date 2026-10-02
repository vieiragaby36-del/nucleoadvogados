import { env } from "cloudflare:workers";
import { getCrmAccess } from "@/lib/crm-auth";

export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const clean = (value: unknown, max = 500) => typeof value === "string" ? value.trim().slice(0, max) : "";
const bool = (value: unknown) => value === true || value === 1 ? 1 : 0;
const email = (value: unknown) => clean(value, 254).toLowerCase();
const validEmail = (value: string) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const staffRole = (role: string) => role === "owner" || role === "staff";
const sameOrigin = (request: Request) => {
  const origin = request.headers.get("Origin");
  return request.headers.get("Content-Type")?.startsWith("application/json") && origin === new URL(request.url).origin;
};

export async function GET() {
  const access = await getCrmAccess();
  if (!access) return json({ error: "Entre na sua conta para continuar." }, 401);
  if (access.role === "none") return json({ role: "none", email: access.email });
  if (!env.DB) return json({ error: "O banco de dados está indisponível. Tente novamente." }, 503);
  try {
    if (staffRole(access.role)) {
      const [contacts, cases, tasks, team] = await Promise.all([
        env.DB.prepare("SELECT * FROM contacts ORDER BY updated_at DESC LIMIT 500").all(),
        env.DB.prepare("SELECT * FROM cases ORDER BY updated_at DESC LIMIT 500").all(),
        env.DB.prepare("SELECT * FROM tasks ORDER BY done ASC, due_at ASC LIMIT 500").all(),
        access.role === "owner" ? env.DB.prepare("SELECT email FROM staff ORDER BY email").all() : Promise.resolve({ results: [] }),
      ]);
      return json({ role: access.role, email: access.email, contacts: contacts.results, cases: cases.results, tasks: tasks.results, team: team.results });
    }
    const [contact, cases, tasks] = await Promise.all([
      env.DB.prepare("SELECT id, name, email, phone FROM contacts WHERE id = ? AND email = ? AND kind = 'client'").bind(access.contactId, access.email).first(),
      env.DB.prepare("SELECT id, contact_id, title, area, number, status, description, created_at, updated_at FROM cases WHERE contact_id = ? AND visible_to_client = 1 ORDER BY updated_at DESC").bind(access.contactId).all(),
      env.DB.prepare("SELECT id, contact_id, case_id, title, due_at, done FROM tasks WHERE contact_id = ? AND visible_to_client = 1 ORDER BY due_at ASC").bind(access.contactId).all(),
    ]);
    if (!contact) return json({ role: "none", email: access.email });
    return json({ role: "client", email: access.email, contacts: [contact], cases: cases.results, tasks: tasks.results });
  } catch (error) {
    console.error("CRM GET failed", error);
    return json({ error: "Não foi possível carregar os dados. Tente novamente." }, 503);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Requisição não permitida." }, 403);
  const access = await getCrmAccess();
  if (!access) return json({ error: "Entre na sua conta para continuar." }, 401);
  if (!staffRole(access.role)) return json({ error: "Acesso restrito à equipe." }, 403);
  if (!env.DB) return json({ error: "O banco de dados está indisponível." }, 503);
  let data: Record<string, unknown>;
  try { data = await request.json() as Record<string, unknown>; } catch { return json({ error: "Dados inválidos." }, 400); }
  const entity = clean(data.entity, 20), id = crypto.randomUUID(), now = new Date().toISOString();
  try {
    if (entity === "contact") {
      const name = clean(data.name, 160), mail = email(data.email), kind = data.kind === "client" ? "client" : "lead";
      if (!name || !validEmail(mail)) return json({ error: "Informe um nome e um e-mail válido." }, 400);
      await env.DB.prepare("INSERT INTO contacts (id,name,email,phone,kind,stage,source,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
        .bind(id,name,mail || null,clean(data.phone,50),kind,clean(data.stage,40) || "novo",clean(data.source,100),clean(data.notes,2000),now,now).run();
    } else if (entity === "case") {
      const title = clean(data.title, 180), contactId = clean(data.contactId, 64);
      if (!title || !contactId) return json({ error: "Informe o cliente e o título do processo." }, 400);
      const contact = await env.DB.prepare("SELECT id FROM contacts WHERE id = ? AND kind = 'client'").bind(contactId).first();
      if (!contact) return json({ error: "Cliente não encontrado." }, 400);
      await env.DB.prepare("INSERT INTO cases (id,contact_id,title,area,number,status,description,visible_to_client,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
        .bind(id,contactId,title,clean(data.area,100),clean(data.number,100),clean(data.status,50) || "em andamento",clean(data.description,3000),bool(data.visibleToClient),now,now).run();
    } else if (entity === "task") {
      const title = clean(data.title, 180), contactId = clean(data.contactId, 64), caseId = clean(data.caseId, 64);
      if (!title || !contactId) return json({ error: "Informe o cliente e a tarefa." }, 400);
      const contact = await env.DB.prepare("SELECT id FROM contacts WHERE id = ?").bind(contactId).first();
      if (!contact) return json({ error: "Contato não encontrado." }, 400);
      if (caseId) {
        const linkedCase = await env.DB.prepare("SELECT id FROM cases WHERE id = ? AND contact_id = ?").bind(caseId,contactId).first();
        if (!linkedCase) return json({ error: "O processo não pertence a esse cliente." }, 400);
      }
      await env.DB.prepare("INSERT INTO tasks (id,contact_id,case_id,title,due_at,done,visible_to_client,created_at) VALUES (?,?,?,?,?,?,?,?)")
        .bind(id,contactId,caseId || null,title,clean(data.dueAt,40),0,bool(data.visibleToClient),now).run();
    } else if (entity === "staff" && access.role === "owner") {
      const mail = email(data.email);
      if (!mail || !validEmail(mail)) return json({ error: "Informe um e-mail válido." }, 400);
      await env.DB.prepare("INSERT OR IGNORE INTO staff (email,created_at) VALUES (?,?)").bind(mail,now).run();
    } else return json({ error: "Operação não permitida." }, 400);
    return json({ ok: true, id }, 201);
  } catch (error) {
    console.error("CRM POST failed", error);
    return json({ error: "Não foi possível salvar. Confira se o e-mail já está cadastrado." }, 400);
  }
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Requisição não permitida." }, 403);
  const access = await getCrmAccess();
  if (!access) return json({ error: "Entre na sua conta para continuar." }, 401);
  if (!staffRole(access.role)) return json({ error: "Acesso restrito à equipe." }, 403);
  if (!env.DB) return json({ error: "O banco de dados está indisponível." }, 503);
  let data: Record<string, unknown>;
  try { data = await request.json() as Record<string, unknown>; } catch { return json({ error: "Dados inválidos." }, 400); }
  const id = clean(data.id, 64), entity = clean(data.entity, 20), now = new Date().toISOString();
  if (!id) return json({ error: "Registro não informado." }, 400);
  try {
    if (entity === "contact") {
      const name = clean(data.name,160), mail = email(data.email), kind = data.kind === "client" ? "client" : "lead";
      if (!name || !validEmail(mail)) return json({ error: "Informe um nome e um e-mail válido." }, 400);
      const result = await env.DB.prepare("UPDATE contacts SET name=?,email=?,phone=?,kind=?,stage=?,source=?,notes=?,updated_at=? WHERE id=?")
        .bind(name,mail || null,clean(data.phone,50),kind,clean(data.stage,40),clean(data.source,100),clean(data.notes,2000),now,id).run();
      if (!result.meta.changes) return json({ error: "Contato não encontrado." }, 404);
    } else if (entity === "case") {
      const title = clean(data.title,180);
      if (!title) return json({ error: "Informe o título." }, 400);
      const result = await env.DB.prepare("UPDATE cases SET title=?,area=?,number=?,status=?,description=?,visible_to_client=?,updated_at=? WHERE id=?")
        .bind(title,clean(data.area,100),clean(data.number,100),clean(data.status,50),clean(data.description,3000),bool(data.visibleToClient),now,id).run();
      if (!result.meta.changes) return json({ error: "Processo não encontrado." }, 404);
    } else if (entity === "task") {
      const title = clean(data.title,180);
      if (!title) return json({ error: "Informe a tarefa." }, 400);
      const result = await env.DB.prepare("UPDATE tasks SET title=?,due_at=?,done=?,visible_to_client=? WHERE id=?")
        .bind(title,clean(data.dueAt,40),bool(data.done),bool(data.visibleToClient),id).run();
      if (!result.meta.changes) return json({ error: "Tarefa não encontrada." }, 404);
    } else return json({ error: "Operação não permitida." }, 400);
    return json({ ok: true });
  } catch (error) {
    console.error("CRM PATCH failed", error);
    return json({ error: "Não foi possível atualizar o registro." }, 400);
  }
}

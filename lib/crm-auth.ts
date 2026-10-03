import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";

const OWNER_EMAIL = "adrianoguimaraes.sp@gmail.com";
export type CrmAccess = { role: "owner" | "staff" | "client" | "none"; email: string; contactId?: string };

export async function getCrmAccess(): Promise<CrmAccess | null> {
  const user = await getChatGPTUser();
  if (!user) return null;
  const email = user.email.trim().toLowerCase();
  if (email === OWNER_EMAIL) return { role: "owner", email };
  if (!env.DB) return { role: "none", email };
  const member = await env.DB.prepare("SELECT email FROM staff WHERE email = ? LIMIT 1").bind(email).first();
  if (member) return { role: "staff", email };
  const contact = await env.DB.prepare("SELECT id FROM contacts WHERE email = ? AND kind = 'client' LIMIT 1").bind(email).first<{ id: string }>();
  if (contact) return { role: "client", email, contactId: contact.id };
  return { role: "none", email };
}

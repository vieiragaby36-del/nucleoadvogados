import { requireChatGPTUser, chatGPTSignOutPath } from "@/app/chatgpt-auth";
import CrmApp from "./CrmApp";

export const dynamic = "force-dynamic";
export const metadata = { title: "Área do Cliente | Núcleo Advogados", robots: { index: false, follow: false } };

export default async function CrmPage() {
  const user = await requireChatGPTUser("/crm");
  return <CrmApp email={user.email} signOutPath={chatGPTSignOutPath("/crm")} />;
}

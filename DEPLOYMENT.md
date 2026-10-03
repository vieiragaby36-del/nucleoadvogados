# Núcleo Advogados — publicação

O site público é estático. Na Netlify, a pasta de publicação é `public` e não há comando de build; os redirecionamentos e cabeçalhos estão em `netlify.toml`. O CRM em `/crm/` usa Supabase Auth e políticas RLS.

## Antes da publicação definitiva

1. A conta `adrianoguimaraes.sp@gmail.com` recebe a função `owner` pelo gatilho do banco. O titular deve escolher sua própria senha e confirmar o link recebido; não compartilhar senha com terceiros.
2. Em Supabase → Authentication → URL Configuration, definir a Site URL como a origem HTTPS publicada e incluir `https://nucleo-advogados.netlify.app/crm/` nas Redirect URLs (mais o domínio próprio, caso exista). O e-mail de confirmação e a recuperação de senha retornam a essa rota.
3. Em Supabase → Authentication → SMTP Settings, configurar e testar um servidor SMTP próprio com remetente verificado. O provedor padrão do Supabase só envia para membros da equipe do projeto e tem limite reduzido; sem SMTP próprio, cadastro e recuperação de clientes não estão prontos para produção. Não inserir credenciais SMTP no repositório nem no navegador do cliente.
4. Confirmar telefones, WhatsApp, endereços, nome e OAB antes da divulgação.
5. Fazer um teste completo com uma conta de equipe e outra de cliente. Criar um cliente, um caso e uma tarefa; validar que itens privados não aparecem ao cliente e que o cliente não consegue ler `contacts.notes` pela API.
6. Testar confirmação de cadastro, login, saída, recuperação de senha, e-mail não vinculado e acesso no celular.
7. Conferir `/`, `/crm/`, `/politica-de-privacidade.html`, `/termos-de-uso.html`, `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest` e `/sw.js` na versão publicada.
8. Se o domínio final não for o subdomínio Netlify, atualizar links canônicos, Open Graph, dados estruturados, sitemap, robots e Redirect URLs antes de solicitar indexação ao Google Search Console.

O PWA armazena offline apenas páginas e recursos públicos listados em `public/sw.js`. O CRM e os dados de clientes não são mantidos no cache do service worker. Para testar uma atualização offline, publique uma versão nova e incremente `CACHE_NAME`.

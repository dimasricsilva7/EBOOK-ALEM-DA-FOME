# Pendências do dono

| # | O quê | Onde | Urgência |
|---|---|---|---|
| 1 | **Banco permanente.** O banco atual é temporário (expira 16/10/2026). Criar um Neon pela Vercel (Storage) — passo a passo abaixo | Vercel → projeto alem-da-fome → Storage | 🔴 até 16/10 |
| 2 | Enviar o PDF real do e-book e marcar como **Pronto**; enviar a capa | Admin → Produtos e materiais | 🔴 antes de vender |
| 3 | **Seção da autora:** hoje ela NÃO aparece no site. Para publicá-la, confirme os direitos, envie a foto autorizada e marque "Autoria e imagem confirmadas" | Admin → Landing → Sobre a autora | 🔴 antes de anunciar |
| 3b | Conferir os temas de "O que é o Além da Fome" com o sumário real; enviar páginas reais na Galeria para a prévia; opcional: trechos autorizados | Admin → Landing / Galeria | 🟠 |
| 5 | Webhook `https://alem-da-fome.vercel.app/api/webhooks/bravopay` na BravoPay + `BRAVOPAY_WEBHOOK_SECRET` na Vercel (redeploy) | BravoPay + Vercel | 🔴 antes de vender |
| 6 | `RESEND_API_KEY` e `EMAIL_FROM` (domínio verificado no Resend) | Vercel → Environment Variables | 🔴 antes de vender |
| 7 | Dados de empresa/CNPJ, e-mail de suporte; revisar políticas (modelos) | Admin → Configurações | 🟠 |
| 8 | Abrir as vendas | Admin → Configurações → Vendas e garantia | quando 2–6 estiverem prontos |
| 9 | Secrets `SITE_URL` e `CRON_SECRET` no GitHub (jobs a cada 5 min) **ou** cron-job.org em `/api/tick` | GitHub → Settings → Secrets | 🟠 |
| 10 | Domínio próprio (opcional): adicionar na Vercel, atualizar `NEXT_PUBLIC_SITE_URL` e o webhook | Vercel → Domains | 🟢 |

## Banco permanente (substitui o temporário)
1. Vercel → projeto **alem-da-fome** → *Settings → Environment Variables*: apague `DATABASE_URL` e `DATABASE_URL_UNPOOLED` (senão a integração não conecta por conflito de nome).
2. Aba **Storage** → *Create Database* → **Neon** → plano gratuito, região **US East (Washington, D.C. / iad1)** → conecte ao projeto alem-da-fome (Production e Preview).
3. *Deployments* → último deploy → **Redeploy**. O build cria as tabelas e o conteúdo inicial sozinho (migrations + seed).
4. Entre no /admin e refaça as edições feitas no banco temporário (capa, preço, materiais, fotos) — o banco novo começa limpo.

# Além da Fome

Operação de vendas completa do produto digital educativo **Além da Fome**: landing page premium, quiz com captura de lead e resultado editorial, checkout PIX (BravoPay) com order bump, upsell pós-compra, crediário opcional, entrega digital segura, e-mails transacionais, tracking (próprio + Meta Pixel/CAPI + GA4) e painel administrativo.

Base técnica: **HAMA BEADS** (admin, pedidos, PIX, webhook, crediário, cupons, testes A/B, relatórios, ROAS, comportamento, online agora) + **ClearFinger** (imagens no banco com upload por arquivo **ou** link, camada de segurança anti-robô). Auditoria completa em [docs/RELATORIO.md](docs/RELATORIO.md).

## Oferta
Oferta única: **Além da Fome — E-book**, R$ 67,00 (preço, capa, textos e materiais em **Admin → Produtos e materiais**). O antigo plano "Completo" fica desativado: não aparece e o checkout recusa (pedidos antigos preservados).

## Fluxo
Anúncio → **/** (o quiz abre direto: consentimento → 5 perguntas → e-mail opcional → resultado com reflexão e exercício) → **/e-book** (página de vendas) → **/checkout** (PIX) → **/pedido/[número]?t=…** (PIX, upsell e área de acesso). A rota `/quiz` continua funcionando.

Regras de honestidade aplicadas no código:
- Material só aparece na landing e só é vendido/entregue quando está **Pronto** (arquivo enviado ou link). Sem material pronto, o checkout recusa a venda.
- Acesso liberado **somente** após confirmação do gateway (webhook/consulta) — nunca pela página de obrigado. Reembolso/contestação revoga o acesso.
- Purchase (Pixel + CAPI) só com pagamento confirmado, mesmo `event_id` (deduplicação).
- Respostas do quiz exigem consentimento, ficam restritas a ADMIN/OWNER (visualização auditada), têm retenção configurável e **nunca** vão para Meta/Google.
- Sem depoimentos, números, credenciais ou preço "de" inventados; vendas começam **fechadas** (Configurações → Vendas e garantia).

## Desenvolvimento local
```bash
npm install
cp .env.example .env              # DATABASE_URL, AUTH_SECRET, CRON_SECRET, BRAVOPAY_MODE=mock, EMAIL_PROVIDER=console…
npx prisma migrate deploy
npm run db:seed                   # produto, landing, FAQ, quiz publicado (também roda no build da Vercel)
npm run admin:hash -- "senha-forte-12+"   # cole em ADMIN_PASSWORD_HASH (+ ADMIN_EMAIL)
npm run dev                       # http://localhost:3000 · admin em /admin
```

## Testes
```bash
npm run typecheck && npm run lint && npm test            # tipos, lint, 20 testes unitários
npm run build:local && VERCEL_ENV=preview npx next start -p 3217
npx tsx scripts/e2e-funnel.ts http://localhost:3217      # ponta a ponta (BRAVOPAY_MODE=mock!) — 12 verificações
npx tsx scripts/quiz-flow.ts http://localhost:3217       # navegador: quiz, voltar, resultado, /e-book (390 e 1440 px)
```
> Nunca rode o E2E contra produção com a BravoPay real.

## Deploy
Ver [docs/RELATORIO.md](docs/RELATORIO.md) (seções Deploy, Webhooks, E-mails, Pixel/CAPI e Checklist de homologação) e [docs/PENDENCIAS.md](docs/PENDENCIAS.md).

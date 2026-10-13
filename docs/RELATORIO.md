# Além da Fome — Relatório técnico

## 1. Visão geral
Aplicação Next.js 15 (App Router) + Prisma/Postgres (Neon) publicada na Vercel (`iad1`).

| Rota | O que é |
|---|---|
| `/` | **Entrada do funil: quiz** (abertura → 5 perguntas → e-mail opcional → resultado) |
| `/quiz` | Mesmo quiz (links antigos continuam funcionando; canonical = `/`) |
| `/e-book` | Página de vendas (hero, identificação, como funciona, tópicos, produto, autora, para quem, oferta, FAQ, CTA final) |
| `/checkout` → `/pedido/[número]?t=…` | PIX, upsell e área de acesso |
| `/acesso`, `/suporte`, políticas | Reenvio de acesso, contato e páginas institucionais |

Produção: **https://alem-da-fome.vercel.app** · Admin: **/admin** · Repositório: `dimasricsilva7/EBOOK-ALEM-DA-FOME` (push na `main` = deploy).

## 2. O que foi reaproveitado
| Origem | Módulos |
|---|---|
| HAMA BEADS | Admin completo (dashboard, pedidos, clientes, cupons, testes A/B, crediário, ROAS, online agora, comportamento, funil, relatórios), PIX BravoPay, webhook HMAC idempotente, e-mails com fila, Meta Pixel + CAPI com deduplicação, jobs |
| ClearFinger | Imagens no banco (`/media/[id].webp`) com upload por **arquivo** ou **link**, proteção SSRF, camada anti-robô (honeypot, tempo mínimo, bloqueio de clientes de script) |

## 3. Quiz
- 5 perguntas (uma por tela, cards grandes, barra de progresso, **voltar preserva as respostas**, validação do consentimento).
- Consentimento específico para tratar as respostas (desmarcado). Captura de e-mail **opcional**, separada do resultado; novidades por e-mail só com opção marcada (desmarcada por padrão).
- Resultado calculado no servidor por pesos. **Temas combináveis** (`rankResults`): tema principal + tema complementar quando o segundo empata ou fica a 1 ponto (com ≥ 2 pontos); sem pontuação ou empate triplo → "Quando você quer se compreender melhor".
- Cada resultado: saudação, título, interpretação, fatores observados, tema complementar, **pergunta de reflexão**, **exercício prático** (sem restrição alimentar), apresentação do e-book e CTA para `/e-book` mantendo UTMs.
- Tudo editável em **Admin → Quiz** (perguntas, opções, pesos, regras, resultados com reflexão/exercício, textos) e publicado como versão imutável.

## 4. Oferta
| Produto | slug | Preço | Situação |
|---|---|---|---|
| Além da Fome — E-book | `alem-da-fome-ebook` | R$ 67,00 | **única oferta ativa** |
| Além da Fome Completo | `alem-da-fome-completo` | — | **desativado** (`active=false`): some da página, do sitemap e do upsell; o checkout recusa (409). Pedidos antigos preservados. |

O preço vem só do banco (frontend e backend usam o mesmo produto; o servidor recalcula o total).

## 5. Conteúdo e seed
`prisma/seed.ts` roda em **todo build** (`npm run build`), é idempotente e versionado (`Setting content_version`):
- banco vazio → cria produto, landing, FAQ e quiz já na versão atual;
- banco existente → aplica a versão 2 uma única vez (quiz novo, landing nova, FAQ nova, Completo desativado, selo "confirmação na hora" removido). Edições posteriores do admin não são sobrescritas.

Seções novas do CMS: **Tópicos do e-book** (`topics`), **Apresentação do produto** (`showcase`, usa a capa do produto e as imagens da Galeria como prévia de páginas reais) e **Sobre a autora** (`author`, foto via upload/link no admin; sem foto mostra um espaço neutro com as iniciais — nenhuma imagem inventada). Textos com `**negrito**` e `*itálico*`.

## 6. Variáveis de ambiente (produção)
| Variável | Situação |
|---|---|
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | ✅ Neon exclusivo — migrar para um banco permanente (ver Pendências) |
| `NEXT_PUBLIC_SITE_URL` | ✅ `https://alem-da-fome.vercel.app` |
| `AUTH_SECRET`, `DATA_ENCRYPTION_KEY`, `CRON_SECRET` | ✅ gerados para este projeto |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` | ✅ mesmo login do admin do ClearFinger |
| `BRAVOPAY_API_KEY` | ✅ conta BravoPay existente |
| `BRAVOPAY_WEBHOOK_SECRET` | ⏳ cadastrar webhook na BravoPay |
| `NEXT_PUBLIC_META_PIXEL_ID`, `META_CAPI_TOKENS` | ✅ mesmos pixels dos projetos anteriores |
| `RESEND_API_KEY`, `EMAIL_FROM` | ⏳ cadastrar |
| `NEXT_PUBLIC_GA_ID`, `META_TEST_EVENT_CODE` | opcionais |

Nunca usar `BRAVOPAY_MODE=mock` em produção (bloqueado no código).

## 7. Checkout, webhook e entrega
- PIX BravoPay (CPF obrigatório). Webhook `https://<domínio>/api/webhooks/bravopay`, assinatura `t=…,v1=…` (HMAC-SHA256), idempotente.
- Estados: PIX gerado, pago, expirado, reembolsado, contestado. Acesso criado **só** em `onPaid`; revogado em reembolso/contestação. A página de obrigado nunca confirma pagamento.
- Arquivos pagos servidos por `/api/acesso/[token]/[material]` (token por item de pedido).

## 8. Privacidade e eventos
- Respostas do quiz: só com consentimento, visíveis apenas para ADMIN/OWNER com auditoria, retenção configurável (padrão 180 dias), nunca enviadas a Meta/Google, nunca em URL.
- Eventos genéricos: `quiz_started`, `quiz_step_completed` (só o número da etapa), `quiz_completed`, `result_viewed`, `view_item`/`ViewContent`, `begin_checkout`, `purchase` — sem respostas, temas ou resultado. `purchase` só após confirmação do gateway (Pixel + CAPI com o mesmo `event_id`).

## 9. SEO
Título/descrição próprios para `/` e `/e-book`, canonical por página (antes todas apontavam para `/`), Open Graph com imagem `/og`, sitemap corrigido (removidas `/loja` e `/produto/...`, que não existem), robots bloqueando admin/api/checkout/pedido.

## 10. Testes executados
- `tsc`, ESLint e build sem erros; **20 testes unitários** (preço, quiz, temas combinados, navegação, segurança).
- **E2E** (`scripts/e2e-funnel.ts`, modo simulado, local) — 12/12: vendas fechadas e sem material recusam; `/` abre o quiz, `/quiz` ok, `/e-book` só com R$ 67 e seção da autora; Completo recusado no checkout; quiz com consentimento e resultado no servidor; checkout R$ 67 idempotente e honeypot; sem acesso antes do pagamento; webhook assinado idempotente e assinatura inválida 401; entrega só do E-book; lead ligado ao pedido; e-mails; upsell gera novo PIX; reembolso revoga.
- **Navegador** (`scripts/quiz-flow.ts`, Playwright, 390 px e 1440 px): validação do consentimento, voltar preserva a resposta, e-mail opcional (pular), resultado completo, CTA com UTM, âncoras `#como-funciona`/`#autora`/`#oferta`, sem rolagem horizontal e sem erros de console.
- Não testado: compra real (sem autorização para cobrar) e e-mails reais (Resend não configurado).

## 11. Rodar localmente / deploy
Ver README. Deploy: push na `main`; o build roda `prisma migrate deploy` + seed.

## 12. Checklist de homologação
1. /admin → Produtos e materiais: capa, enviar o PDF real e marcar **Pronto**.
2. Landing → "Sobre a autora": enviar a fotografia autorizada; "Tópicos": conferir com o sumário real.
3. Configurações: autoria/empresa, suporte, políticas, e-mails (envio de teste).
4. Webhook BravoPay + `BRAVOPAY_WEBHOOK_SECRET`; Resend.
5. Configurações → Vendas e garantia: **abrir vendas**.
6. Compra real de valor baixo (cupom) → e-mail, acesso, Purchase no Gerenciador de Eventos; reembolsar e conferir revogação.

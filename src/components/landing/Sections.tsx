/* eslint-disable @next/next/no-img-element */
import { Icon, formatIcon } from "@/components/ui/Icon";
import { RichText } from "@/components/ui/RichText";
import { VideoEmbed } from "@/components/ui/VideoEmbed";
import { Reveal } from "@/components/ui/Reveal";
import { MATERIAL_FORMAT_LABEL } from "@/lib/domain";
import { cfgArr, cfgStr, type SectionData } from "@/server/landing";
import { formatBRL } from "@/utils/format";
import type { PublicMaterial, PublicProduct } from "@/types/catalog";
import { BuyButton, FaqItem, OfferViewTracker, ScrollCta } from "./client";

export type LandingCtx = {
  product: PublicProduct | null;
  /** Planos à venda (ex.: E-book R$ 67 · Completo R$ 97) */
  plans: (PublicProduct & { materialTitles: string[]; sellable: boolean })[];
  planCount: number;
  materials: (PublicMaterial & { plans: string[] })[];
  faqs: { id: string; question: string; answer: string }[];
  reviews: { id: string; name: string; text: string; photoUrl: string | null }[];
  gallery: { id: string; title: string; imageUrl: string; alt: string }[];
  s: Record<string, string>;
  salesOpen: boolean;
  payment: { pix: boolean; crediario: string | null };
};

type P = { section: SectionData; ctx: LandingCtx };

const productRef = (p: PublicProduct | null) => (p ? { id: p.id, sku: p.sku, name: p.name, priceCents: p.priceCents } : null);
const closedText = (ctx: LandingCtx) => (ctx.salesOpen ? null : ctx.s.sales_closed_message || "As vendas ainda não estão abertas.");

function Heading({ section, center = false, light = false }: { section: SectionData; center?: boolean; light?: boolean }) {
  const eyebrow = cfgStr(section.config, "eyebrow");
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && <p className={`eyebrow ${light ? "!text-accent" : ""}`}>{eyebrow}</p>}
      {section.title && <h2 className={`h-section ${eyebrow ? "mt-4" : ""} ${light ? "text-bg" : ""}`}>{section.title}</h2>}
      {section.subtitle && <p className={`lead mt-5 ${light ? "!text-bg/75" : ""}`}>{section.subtitle}</p>}
    </div>
  );
}

/** Composição decorativa (sem fingir ser foto ou produto) usada enquanto não há imagem real cadastrada. */
function SoftArt({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-[2rem] bg-sand ${className}`} aria-hidden="true">
      <div className="absolute -left-10 top-10 h-56 w-56 rounded-full bg-accent/50 blur-2xl" />
      <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-secondary/25 blur-3xl" />
      <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink/10" />
      <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink/[0.06]" />
      <Icon name="leaf" className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 text-secondary/70" strokeWidth={1.2} />
    </div>
  );
}

// ───────────── Hero ─────────────

export function Hero({ section }: P) {
  const badges = cfgArr<string>(section.config, "badges").filter(Boolean).slice(0, 4);
  const eyebrow = cfgStr(section.config, "eyebrow");
  const img = section.imageUrl;
  return (
    <section className="relative overflow-hidden">
      <div className="container-page grid items-center gap-10 pb-16 pt-8 sm:pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:pb-24 lg:pt-16">
        <div className="animate-rise">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1 className="mt-5 font-display text-[2.35rem] leading-[1.06] text-ink sm:text-[3.2rem] lg:text-[3.75rem]">
            <RichTitle text={section.title ?? ""} />
          </h1>
          {section.subtitle && <p className="lead mt-6 max-w-xl">{section.subtitle}</p>}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ScrollCta label={section.ctaLabel || "Quero conhecer o Além da Fome"} target={section.ctaTarget || "#oferta"} element="hero_cta" className="btn-primary w-full sm:w-auto" />
            {cfgStr(section.config, "secondaryLabel") && (
              <a href={cfgStr(section.config, "secondaryTarget") || "/quiz"} data-cta="hero_secondary" className="btn-ghost">
                {cfgStr(section.config, "secondaryLabel")}
              </a>
            )}
          </div>
          {badges.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-ink/75">
              {badges.map((b, i) => (
                <li key={b} className="flex items-center gap-2">
                  <Icon name={["book", "lock", "pix", "clock"][i] ?? "check"} className="h-4 w-4 text-secondary" />
                  {b}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="relative animate-fade">
          {img ? (
            <figure className="relative">
              <img src={img} alt={cfgStr(section.config, "imageAlt") || ""} className="aspect-[4/5] w-full rounded-[2rem] object-cover shadow-lift sm:aspect-[5/5.4]" fetchPriority="high" />
              <div className="absolute -bottom-5 -left-3 hidden rounded-2xl border border-line bg-surface/95 px-5 py-4 shadow-soft backdrop-blur sm:block">
                <p className="font-display text-lg italic text-ink">“Você não precisa se tratar com dureza para começar a cuidar de si.”</p>
              </div>
            </figure>
          ) : (
            <SoftArt className="aspect-[4/5] w-full sm:aspect-square" />
          )}
        </div>
      </div>
    </section>
  );
}

/** Título com trecho em itálico: use *trecho* no admin. */
function RichTitle({ text }: { text: string }) {
  const parts = text.split(/\*([^*]+)\*/g);
  return (
    <>
      {parts.map((p, i) => (i % 2 ? <em key={i} className="text-primary">{p}</em> : p))}
    </>
  );
}

// ───────────── Identificação ─────────────

export function Identification({ section }: P) {
  const items = cfgArr<string>(section.config, "items").filter(Boolean);
  return (
    <section className="section paper">
      <div className="container-page grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div>
          <Heading section={section} />
          {section.body && <RichText text={section.body} className="mt-6 space-y-4 text-[1.0625rem] leading-relaxed text-ink/80" />}
        </div>
        {items.length > 0 && (
          <ul className="space-y-3 self-center">
            {items.map((it, i) => (
              <Reveal key={it} delay={i * 60}>
                <li className="flex gap-4 rounded-2xl border border-line/80 bg-surface/80 px-5 py-4 text-[15.5px] leading-relaxed text-ink/90">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                  {it}
                </li>
              </Reveal>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

// ───────────── Compreensão dos padrões ─────────────

export function Patterns({ section }: P) {
  const steps = cfgArr<{ title?: string; text?: string }>(section.config, "steps").filter((s) => s?.title);
  return (
    <section className="section">
      <div className="container-page">
        <Heading section={section} center />
        {steps.length > 0 && (
          <ol className="mx-auto mt-14 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <Reveal key={i} delay={i * 80}>
                <li className="relative h-full rounded-card border border-line bg-surface p-6">
                  <span className="font-display text-4xl italic text-accent">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-3 font-display text-xl text-ink">{s.title}</h3>
                  {s.text && <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.text}</p>}
                  {i < steps.length - 1 && <Icon name="arrow" className="absolute -right-3.5 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 rounded-full bg-bg p-1 text-secondary lg:block" />}
                </li>
              </Reveal>
            ))}
          </ol>
        )}
        {section.body && (
          <p className="mx-auto mt-10 flex max-w-2xl items-start gap-3 rounded-2xl bg-sand/70 px-5 py-4 text-sm leading-relaxed text-ink/75">
            <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
            <span>{section.body}</span>
          </p>
        )}
      </div>
    </section>
  );
}

// ───────────── Método (pilares) ─────────────

export function Method({ section }: P) {
  const items = cfgArr<{ icon?: string; title?: string; text?: string }>(section.config, "items").filter((x) => x?.title);
  return (
    <section className="section bg-ink text-bg">
      <div className="container-page">
        <Heading section={section} light />
        {items.length > 0 && (
          <div className="mt-14 grid gap-px overflow-hidden rounded-card bg-bg/10 sm:grid-cols-2">
            {items.map((it, i) => (
              <div key={i} className="bg-ink p-7 sm:p-9">
                <span className="grid h-12 w-12 place-items-center rounded-full border border-bg/20 text-accent">
                  <Icon name={it.icon || "leaf"} className="h-6 w-6" />
                </span>
                <h3 className="mt-6 font-display text-2xl text-bg">{it.title}</h3>
                {it.text && <p className="mt-3 max-w-md leading-relaxed text-bg/70">{it.text}</p>}
              </div>
            ))}
          </div>
        )}
        {section.body && <p className="mt-8 max-w-2xl text-sm text-bg/60">{section.body}</p>}
      </div>
    </section>
  );
}

// ───────────── Conteúdo incluído (somente materiais REAIS e prontos) ─────────────

export function Content({ section, ctx }: P) {
  if (!ctx.materials.length) return null;
  return (
    <section id="conteudo-incluido" className="section">
      <div className="container-page">
        <Heading section={section} />
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {ctx.materials.map((m, i) => (
            <Reveal key={m.id} delay={i * 60}>
              <article className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface">
                {m.coverUrl && <img src={m.coverUrl} alt={`Capa: ${m.title}`} className="aspect-[16/9] w-full object-cover" loading="lazy" />}
                <div className="flex flex-1 flex-col p-6 sm:p-7">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-secondary">
                    <Icon name={formatIcon(m.format)} className="h-4 w-4" /> {MATERIAL_FORMAT_LABEL[m.format]}
                  </p>
                  <h3 className="mt-3 font-display text-2xl leading-snug text-ink">{m.title}</h3>
                  {ctx.planCount > 1 && <p className="mt-1 text-xs font-semibold text-primary">{m.plans.length === ctx.planCount ? "Incluído em todos os planos" : `Incluído em: ${m.plans.join(" · ")}`}</p>}
                  {m.description && <p className="mt-3 leading-relaxed text-ink/80">{m.description}</p>}
                  <dl className="mt-5 space-y-3 border-t border-line pt-5 text-[15px]">
                    {m.howToUse && (
                      <div>
                        <dt className="font-semibold text-ink">Como usar</dt>
                        <dd className="mt-0.5 text-muted">{m.howToUse}</dd>
                      </div>
                    )}
                    {m.purpose && (
                      <div>
                        <dt className="font-semibold text-ink">Para quê</dt>
                        <dd className="mt-0.5 text-muted">{m.purpose}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
        {section.body && <p className="mt-6 text-sm text-muted">{section.body}</p>}
      </div>
    </section>
  );
}

// ───────────── Como você acessa ─────────────

export function Experience({ section }: P) {
  const steps = cfgArr<{ title?: string; text?: string }>(section.config, "steps").filter((s) => s?.title);
  const note = cfgStr(section.config, "imageNote");
  return (
    <section className="section paper">
      <div className="container-page grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div>
          <Heading section={section} />
          {steps.length > 0 && (
            <ol className="mt-10 space-y-6">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary font-display text-lg text-white">{i + 1}</span>
                  <div>
                    <h3 className="font-display text-xl text-ink">{s.title}</h3>
                    {s.text && <p className="mt-1 leading-relaxed text-muted">{s.text}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
        {section.imageUrl ? (
          <figure>
            <img src={section.imageUrl} alt={cfgStr(section.config, "imageAlt") || ""} className="w-full rounded-card object-cover shadow-lift" loading="lazy" />
            {note && <figcaption className="mt-3 text-center text-xs text-muted">{note}</figcaption>}
          </figure>
        ) : (
          <SoftArt className="aspect-[4/3] w-full" />
        )}
      </div>
    </section>
  );
}

// ───────────── Vídeo e galeria ─────────────

export function Video({ section }: P) {
  if (!section.videoUrl) return null;
  return (
    <section className="section">
      <div className="container-page">
        <Heading section={section} center />
        <VideoEmbed url={section.videoUrl} title={section.title || "Vídeo"} className="mx-auto mt-10 max-w-3xl rounded-card" vertical={cfgStr(section.config, "vertical") === "true"} />
      </div>
    </section>
  );
}

export function GallerySection({ section, ctx }: P) {
  if (!ctx.gallery.length) return null;
  return (
    <section className="section">
      <div className="container-page">
        <Heading section={section} center />
        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3">
          {ctx.gallery.slice(0, 9).map((g) => (
            <figure key={g.id} className="overflow-hidden rounded-2xl">
              <img src={g.imageUrl} alt={g.alt || g.title} className="aspect-square w-full object-cover" loading="lazy" />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

// ───────────── Para quem é ─────────────

export function Audience({ section }: P) {
  const yes = cfgArr<string>(section.config, "forYou").filter(Boolean);
  const no = cfgArr<string>(section.config, "notForYou").filter(Boolean);
  return (
    <section className="section">
      <div className="container-page">
        <Heading section={section} center />
        <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-2">
          {yes.length > 0 && (
            <div className="rounded-card border border-line bg-surface p-7">
              <h3 className="font-display text-2xl text-ink">{cfgStr(section.config, "forYouTitle") || "É para você se…"}</h3>
              <ul className="mt-5 space-y-3">
                {yes.map((t) => (
                  <li key={t} className="flex gap-3 leading-relaxed text-ink/85">
                    <Icon name="check" className="mt-1 h-4 w-4 shrink-0 text-secondary" strokeWidth={2} /> {t}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {no.length > 0 && (
            <div className="rounded-card border border-line bg-sand/60 p-7">
              <h3 className="font-display text-2xl text-ink">{cfgStr(section.config, "notForYouTitle") || "Não é o caminho se…"}</h3>
              <ul className="mt-5 space-y-3">
                {no.map((t) => (
                  <li key={t} className="flex gap-3 leading-relaxed text-ink/80">
                    <Icon name="info" className="mt-1 h-4 w-4 shrink-0 text-primary" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ───────────── Confiança (autoria só se preenchida) ─────────────

export function Trust({ section, ctx }: P) {
  const items = cfgArr<{ icon?: string; title?: string; text?: string }>(section.config, "items").filter((x) => x?.title);
  const s = ctx.s;
  const hasAuthor = Boolean(s.author_name && s.author_bio);
  if (!hasAuthor && !items.length) return null;
  return (
    <section className="section paper">
      <div className="container-page">
        <Heading section={section} center />
        {hasAuthor && (
          <div className="mx-auto mt-12 grid max-w-4xl items-center gap-8 rounded-card border border-line bg-surface p-7 sm:grid-cols-[180px_1fr] sm:p-10">
            {s.author_photo_url ? <img src={s.author_photo_url} alt={s.author_name} className="mx-auto aspect-square w-40 rounded-full object-cover sm:w-full" loading="lazy" /> : <div className="mx-auto grid aspect-square w-32 place-items-center rounded-full bg-sand font-display text-4xl italic text-primary sm:w-full">{s.author_name.slice(0, 1)}</div>}
            <div>
              <p className="eyebrow">Quem está por trás</p>
              <h3 className="mt-2 font-display text-3xl text-ink">{s.author_name}</h3>
              {s.author_role && <p className="mt-1 text-sm font-semibold text-muted">{s.author_role}</p>}
              <RichText text={s.author_bio} className="mt-4 leading-relaxed text-ink/80" />
            </div>
          </div>
        )}
        {items.length > 0 && (
          <ul className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-3">
            {items.map((it, i) => (
              <li key={i} className="rounded-2xl bg-surface/80 p-6 text-center">
                <Icon name={it.icon || "shield"} className="mx-auto h-7 w-7 text-secondary" />
                <h3 className="mt-3 font-display text-lg text-ink">{it.title}</h3>
                {it.text && <p className="mt-1 text-sm leading-relaxed text-muted">{it.text}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

// ───────────── Depoimentos (somente reais e aprovados) ─────────────

export function Reviews({ section, ctx }: P) {
  if (!ctx.reviews.length) return null;
  return (
    <section className="section">
      <div className="container-page">
        <Heading section={section} center />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {ctx.reviews.slice(0, 6).map((r) => (
            <figure key={r.id} className="flex flex-col rounded-card border border-line bg-surface p-7">
              <blockquote className="flex-1 font-display text-lg leading-relaxed text-ink/90">“{r.text}”</blockquote>
              <figcaption className="mt-5 flex items-center gap-3 text-sm font-semibold text-ink">
                {r.photoUrl && <img src={r.photoUrl} alt="" className="h-10 w-10 rounded-full object-cover" loading="lazy" />}
                {r.name}
              </figcaption>
            </figure>
          ))}
        </div>
        {section.body && <p className="mt-6 text-center text-xs text-muted">{section.body}</p>}
      </div>
    </section>
  );
}

// ───────────── Oferta (planos) ─────────────

export function Offer({ section, ctx }: P) {
  const plans = ctx.plans;
  if (!plans.length) return null;
  const extra = cfgArr<string>(section.config, "includes").filter(Boolean);
  const s = ctx.s;
  const highlight = plans.find((p) => p.featured)?.id ?? (plans.length > 1 ? plans.at(-1)!.id : plans[0].id);
  return (
    <OfferViewTracker id="oferta" productId={plans[0].id} valueCents={plans[0].priceCents} className="section paper">
      <div className="container-page">
        <Heading section={section} center />
        <div className={`mx-auto mt-12 grid gap-6 ${plans.length > 1 ? "max-w-5xl md:grid-cols-2" : "max-w-xl"}`}>
          {plans.map((p) => {
            const top = p.id === highlight && plans.length > 1;
            const items = [...p.materialTitles, ...extra];
            return (
              <article key={p.id} className={`relative flex flex-col overflow-hidden rounded-[2rem] border bg-surface ${top ? "border-primary shadow-lift" : "border-line shadow-soft"}`}>
                {top && <p className="bg-primary px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-white">{p.badge || "Experiência completa"}</p>}
                {p.imageUrl && <img src={p.imageUrl} alt={`Capa: ${p.name}`} className="aspect-[16/9] w-full object-cover" loading="lazy" />}
                <div className="flex flex-1 flex-col p-7 sm:p-9">
                  {!top && <p className="eyebrow">{p.badge || "Produto digital educativo"}</p>}
                  <h3 className={`font-display text-3xl text-ink ${top ? "" : "mt-3"}`}>{p.name}</h3>
                  {p.subtitle && <p className="mt-2 text-muted">{p.subtitle}</p>}
                  {items.length > 0 && (
                    <ul className="mt-6 space-y-3 border-t border-line pt-6">
                      {items.map((t) => (
                        <li key={t} className="flex gap-3 text-[15.5px] text-ink/90">
                          <Icon name="check" className="mt-0.5 h-5 w-5 shrink-0 text-secondary" strokeWidth={2} /> {t}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-auto pt-8">
                    <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                      {p.listPriceCents && <s className="text-lg text-muted">{formatBRL(p.listPriceCents)}</s>}
                      <span className="font-display text-5xl tabular-nums text-ink">{formatBRL(p.priceCents)}</span>
                      {p.promoLabel && <span className="chip bg-accent/25 text-ink">{p.promoLabel}</span>}
                    </div>
                    <p className="mt-2 text-sm text-muted">Pagamento único{ctx.payment.pix ? " via PIX" : ""}{ctx.payment.crediario ? ` · ou ${ctx.payment.crediario}` : ""}.</p>
                    {p.deliveryFormat && <p className="mt-1 text-sm text-muted">{p.deliveryFormat}</p>}
                    <div className="mt-6">
                      <BuyButton
                        product={productRef(p)}
                        label={plans.length > 1 ? `Quero o ${p.name.replace(/^Além da Fome\s*[—-]?\s*/i, "") || p.name}` : section.ctaLabel || "Quero o Além da Fome"}
                        element={`offer_cta_${p.slug}`}
                        className={top || plans.length === 1 ? "btn-primary w-full" : "btn-dark w-full"}
                        disabledText={closedText(ctx) ?? (p.sellable ? null : "Este plano abre em breve.")}
                      />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <ul className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted">
          <li className="flex items-center gap-2"><Icon name="mail" className="h-4 w-4 text-secondary" /> {s.checkout_access_text || "Acesso enviado por e-mail após a confirmação do pagamento."}</li>
          <li className="flex items-center gap-2"><Icon name="lock" className="h-4 w-4 text-secondary" /> Pagamento processado com segurança</li>
        </ul>

        {s.guarantee_enabled === "true" && s.guarantee_text && (
          <div className="mx-auto mt-8 max-w-3xl rounded-2xl bg-surface/80 p-6 text-center">
            <p className="flex items-center justify-center gap-2 font-display text-xl text-ink">
              <Icon name="shield" className="h-5 w-5 text-secondary" /> {s.guarantee_title || "Garantia"}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{s.guarantee_text}</p>
          </div>
        )}
        {section.body && <p className="mx-auto mt-6 max-w-xl text-center text-xs leading-relaxed text-muted">{section.body}</p>}
      </div>
    </OfferViewTracker>
  );
}



// ───────────── Limites do produto ─────────────

export function Limits({ section }: P) {
  return (
    <section className="py-14">
      <div className="container-page">
        <div className="mx-auto flex max-w-3xl gap-4 rounded-card border border-line bg-surface p-6 sm:p-8">
          <Icon name="info" className="mt-1 h-6 w-6 shrink-0 text-primary" />
          <div>
            {section.title && <h2 className="font-display text-2xl text-ink">{section.title}</h2>}
            <RichText text={section.body} className="mt-3 leading-relaxed text-ink/80" />
          </div>
        </div>
      </div>
    </section>
  );
}

// ───────────── FAQ e CTA final ─────────────

export function Faq({ section, ctx }: P) {
  if (!ctx.faqs.length) return null;
  return (
    <section id="faq" className="section">
      <div className="container-page grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <Heading section={section} />
        <div className="border-t border-line">
          {ctx.faqs.map((f, i) => (
            <FaqItem key={f.id} i={i} q={f.question} a={<RichText text={f.answer} />} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta({ section, ctx }: P) {
  return (
    <section className="section bg-ink text-bg">
      <div className="container-page text-center">
        {section.title && (
          <h2 className="mx-auto max-w-3xl font-display text-[2.2rem] leading-[1.1] sm:text-5xl">
            <RichTitle text={section.title} />
          </h2>
        )}
        {section.subtitle && <p className="mx-auto mt-5 max-w-xl text-lg text-bg/75">{section.subtitle}</p>}
        <div className="mx-auto mt-9 max-w-sm">
          <ScrollCta label={section.ctaLabel || "Quero conhecer o Além da Fome"} target={section.ctaTarget || "#oferta"} element="final_cta" className="btn btn-primary w-full" />
        </div>
        {ctx.s.footer_text && <p className="mx-auto mt-8 max-w-xl text-xs text-bg/50">{ctx.s.footer_text}</p>}
      </div>
    </section>
  );
}

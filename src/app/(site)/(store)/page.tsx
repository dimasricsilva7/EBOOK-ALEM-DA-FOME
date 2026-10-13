import { Fragment } from "react";
import { Audience, Content, Experience, Faq, FinalCta, GallerySection, Hero, Identification, Limits, Method, Offer, Patterns, Reviews, Trust, Video, type LandingCtx } from "@/components/landing/Sections";
import { LandingTracker, QuizWelcome, StickyMobileCTA } from "@/components/landing/client";
import { valueFor } from "@/lib/experiments";
import { crediarioConfig, installmentOptions } from "@/lib/crediario";
import { bravopayMode, siteUrl } from "@/lib/env";
import { db } from "@/lib/db";
import { currentAssignments, getLandingMaterials, getPlans, readyMaterialCount } from "@/server/catalog";
import { getApprovedReviews, getFaqs, getGallery, getLandingSections, loadLandingSectionsDirect, safeLoad, type SectionData } from "@/server/landing";
import { getPublishedQuiz } from "@/server/quiz";
import { getSettings, isOn } from "@/server/settings";
import { formatBRL } from "@/utils/format";

export const dynamic = "force-dynamic";

function orderSections(sections: SectionData[], override: string | null) {
  if (!override) return sections;
  const order = override.split(",").map((s) => s.trim());
  const rank = (k: string) => (order.includes(k) ? order.indexOf(k) : order.length + sections.findIndex((s) => s.key === k));
  return [...sections].sort((a, b) => rank(a.key) - rank(b.key));
}

/** Landing page: todo o conteúdo vem do CMS e dos materiais reais cadastrados no admin. */
export default async function LandingPage() {
  const assignments = await currentAssignments();
  // Cada leitura é independente: uma falha do banco nunca derruba a página inteira
  const [sectionsRaw, planList, gallery, faqs, reviews, s, quiz] = await Promise.all([
    safeLoad(getLandingSections, loadLandingSectionsDirect, []),
    getPlans(assignments).catch(() => []),
    safeLoad(getGallery, () => db.galleryItem.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }), []),
    safeLoad(getFaqs, () => db.faq.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }), []),
    safeLoad(getApprovedReviews, async () => [], []),
    getSettings(),
    getPublishedQuiz(),
  ]);
  const product = planList[0] ?? null;
  const planData = await Promise.all(planList.map(async (pl) => ({ product: pl, materials: await getLandingMaterials(pl.id).catch(() => []), ready: await readyMaterialCount(pl.id).catch(() => 0) })));
  const readyCount = planData.reduce((s, x) => s + x.ready, 0);
  // Conteúdo incluído: união dos materiais de todos os planos, indicando em quais planos cada um está
  const materials = [...new Map(planData.flatMap((x) => x.materials.map((m) => [m.id, m] as const))).values()].map((m) => ({
    ...m,
    plans: planData.filter((x) => x.materials.some((y) => y.id === m.id)).map((x) => x.product.name),
  }));

  const cfg = crediarioConfig(s);
  const lastInstallment = planList.at(-1) && cfg.enabled ? installmentOptions(planList.at(-1)!.priceCents, cfg).at(-1) : null;
  const ctx: LandingCtx = {
    product,
    plans: planData.map((x) => ({ ...x.product, materialTitles: x.materials.map((m) => m.title), sellable: x.ready > 0 })),
    planCount: planData.length,
    materials,
    faqs: faqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer })),
    reviews: reviews.map((r) => ({ id: r.id, name: r.name, text: r.text, photoUrl: r.photoUrl })),
    gallery: gallery.map((g) => ({ id: g.id, title: g.title, imageUrl: g.imageUrl, alt: g.alt })),
    s,
    // Vendas abertas = chave ligada no admin + PIX/crediário disponível + material real pronto
    salesOpen: isOn(s.sales_enabled) && readyCount > 0 && ((isOn(s.pix_enabled) && bravopayMode() !== "disabled") || cfg.enabled),
    payment: { pix: isOn(s.pix_enabled), crediario: lastInstallment ? `parcelamento no ${cfg.methodLabel.toLowerCase()}` : null },
  };

  const sections = orderSections(sectionsRaw.filter((x) => x.active), valueFor(assignments, "section_order"));
  const RENDER: Record<string, (p: { section: SectionData; ctx: LandingCtx }) => React.ReactNode> = {
    hero: Hero,
    identification: Identification,
    patterns: Patterns,
    method: Method,
    content: Content,
    experience: Experience,
    video: Video,
    gallery: GallerySection,
    audience: Audience,
    trust: Trust,
    reviews: Reviews,
    offer: Offer,
    limits: Limits,
    faq: Faq,
    final_cta: FinalCta,
  };
  const heroOverride = (x: SectionData): SectionData =>
    x.type === "hero" ? { ...x, title: valueFor(assignments, "hero_headline") ?? x.title, ctaLabel: valueFor(assignments, "hero_cta") ?? x.ctaLabel, imageUrl: valueFor(assignments, "hero_image") ?? x.imageUrl } : x;

  const resultTexts = Object.fromEntries((quiz?.data.results ?? []).map((r) => [r.key, { title: r.title, subtitle: r.subtitle }]));
  const base = siteUrl();
  const jsonLd = [
    { "@context": "https://schema.org", "@type": "WebSite", name: s.store_name, url: base },
    ...(planList.length
      ? planList.map((product) => ({ "@context": "https://schema.org", "@type": "Product", name: product.name, description: product.shortDescription ?? undefined, sku: product.sku, brand: { "@type": "Brand", name: s.store_name }, ...(product.imageUrl ? { image: product.imageUrl } : {}), offers: { "@type": "Offer", url: `${base}/#oferta`, priceCurrency: "BRL", price: (product.priceCents / 100).toFixed(2), availability: ctx.salesOpen ? "https://schema.org/InStock" : "https://schema.org/PreOrder" } }))
      : []),
    ...(ctx.faqs.length ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: ctx.faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") } })) }] : []),
  ];

  return (
    <>
      <QuizWelcome texts={resultTexts} />
      {sections.map((x) => {
        const C = RENDER[x.type];
        return C ? <Fragment key={x.key}>{C({ section: heroOverride(x), ctx })}</Fragment> : null;
      })}
      <LandingTracker product={product ? { id: product.id, sku: product.sku, name: product.name, priceCents: product.priceCents } : null} />
      {isOn(s.sticky_cta_enabled) && product && <StickyMobileCTA label={`${s.sticky_cta_label || "Quero conhecer"} · ${planList.length > 1 ? "a partir de " : ""}${formatBRL(Math.min(...planList.map((x) => x.priceCents)))}`} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}

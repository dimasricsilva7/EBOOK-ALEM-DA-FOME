import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";
import { db } from "@/lib/db";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const products = await db.product.findMany({ where: { active: true, priceCents: { gt: 0 } }, select: { slug: true, updatedAt: true } }).catch(() => []);
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/loja`, changeFrequency: "weekly", priority: 0.8 },
    ...products.map((p) => ({ url: `${base}/produto/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...["politica-de-privacidade", "termos", "trocas-e-devolucoes", "cookies"].map((s) => ({ url: `${base}/${s}`, changeFrequency: "yearly" as const, priority: 0.2 })),
  ];
}

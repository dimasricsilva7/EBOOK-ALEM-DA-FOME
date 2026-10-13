"use server";

import { revalidatePath } from "next/cache";
import type { CouponType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { formatBRL } from "@/utils/format";
import { refreshStore, withAdmin, type ActionResult } from "@/server/admin/guard";
import { bool, int, jsonArray, optStr, parseLocalDateTime, parseMoney, str } from "@/server/admin/forms";

const ids = (fd: FormData, k: string) => jsonArray<string>(fd, k).filter((x) => typeof x === "string" && /^[a-z0-9]+$/i.test(x));
const url = (fd: FormData, k: string) => {
  const v = optStr(fd, k, 500);
  return v && /^(https:\/\/|\/)/.test(v) ? v : null;
};
const asRecord = (v: unknown) => v as Record<string, unknown>;

// ───────────── Order bumps ─────────────

export async function saveBump(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return withAdmin("ADMIN", async (admin) => {
    const id = optStr(fd, "id", 40);
    const productId = str(fd, "productId", 40);
    if (!(await db.product.findUnique({ where: { id: productId } }))) return { error: "Selecione um produto." };
    const price = parseMoney(fd.get("price"));
    const data = {
      name: str(fd, "name", 80) || "Order bump",
      productId,
      title: str(fd, "title", 140),
      description: optStr(fd, "description", 400),
      benefit: optStr(fd, "benefit", 140),
      imageUrl: url(fd, "imageUrl"),
      priceCents: price && price > 0 ? price : null,
      sortOrder: int(fd, "sortOrder", 0),
      active: bool(fd, "active"),
      triggerProductIds: ids(fd, "triggerProductIds"),
      showModal: bool(fd, "showModal"),
      modalTitle: optStr(fd, "modalTitle", 140),
    };
    if (!data.title) return { error: "Informe o título do bump." };
    if (id) {
      const before = await db.orderBump.findUniqueOrThrow({ where: { id } });
      const after = await db.orderBump.update({ where: { id }, data });
      await audit(admin.id, "order_bump_updated", "orderBump", id, {
        summary: before.priceCents !== after.priceCents ? `Bump "${after.name}": preço ${before.priceCents ? formatBRL(before.priceCents) : "do produto"} → ${after.priceCents ? formatBRL(after.priceCents) : "do produto"}` : `Bump "${after.name}" atualizado`,
        before: asRecord(before),
        after: asRecord(after),
      });
    } else {
      const created = await db.orderBump.create({ data });
      await audit(admin.id, "order_bump_created", "orderBump", created.id, { summary: `Bump criado: ${created.name}` });
    }
    refreshStore("catalog");
    revalidatePath("/admin/order-bumps");
    return { ok: true, message: "Order bump salvo." };
  });
}

export async function deleteBump(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return withAdmin("ADMIN", async (admin) => {
    const b = await db.orderBump.delete({ where: { id: str(fd, "id", 40) } });
    await audit(admin.id, "order_bump_deleted", "orderBump", b.id, { summary: `Bump excluído: ${b.name}` });
    refreshStore("catalog");
    revalidatePath("/admin/order-bumps");
    return { ok: true, message: "Excluído." };
  });
}

// ───────────── Upsells ─────────────

export async function saveUpsell(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return withAdmin("ADMIN", async (admin) => {
    const id = optStr(fd, "id", 40);
    const productId = str(fd, "productId", 40);
    if (!(await db.product.findUnique({ where: { id: productId } }))) return { error: "Selecione um produto." };
    const price = parseMoney(fd.get("price"));
    const data = {
      name: str(fd, "name", 80) || "Upsell",
      productId,
      headline: str(fd, "headline", 140),
      title: str(fd, "title", 140),
      description: optStr(fd, "description", 500),
      imageUrl: url(fd, "imageUrl"),
      priceCents: price && price > 0 ? price : null,
      sortOrder: int(fd, "sortOrder", 0),
      active: bool(fd, "active"),
      triggerProductIds: ids(fd, "triggerProductIds"),
    };
    if (!data.title || !data.headline) return { error: "Informe chamada e título." };
    if (data.priceCents != null && data.priceCents < 500) return { error: "O PIX tem valor mínimo de R$ 5,00: o upsell precisa custar pelo menos isso." };
    if (id) {
      const before = await db.upsell.findUniqueOrThrow({ where: { id } });
      const after = await db.upsell.update({ where: { id }, data });
      await audit(admin.id, "upsell_updated", "upsell", id, { summary: `Upsell "${after.name}" atualizado`, before: asRecord(before), after: asRecord(after) });
    } else {
      const created = await db.upsell.create({ data });
      await audit(admin.id, "upsell_created", "upsell", created.id, { summary: `Upsell criado: ${created.name}` });
    }
    refreshStore("catalog");
    revalidatePath("/admin/upsells");
    return { ok: true, message: "Upsell salvo." };
  });
}

export async function deleteUpsell(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return withAdmin("ADMIN", async (admin) => {
    const u = await db.upsell.delete({ where: { id: str(fd, "id", 40) } });
    await audit(admin.id, "upsell_deleted", "upsell", u.id, { summary: `Upsell excluído: ${u.name}` });
    refreshStore("catalog");
    revalidatePath("/admin/upsells");
    return { ok: true, message: "Excluído." };
  });
}

// ───────────── Cupons ─────────────

export async function saveCoupon(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return withAdmin("ADMIN", async (admin) => {
    const id = optStr(fd, "id", 40);
    const code = str(fd, "code", 40).toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    if (code.length < 3) return { error: "Código com pelo menos 3 caracteres (letras, números, - e _)." };
    const type = (str(fd, "type", 10) === "FIXED" ? "FIXED" : "PERCENT") as CouponType;
    const value = type === "PERCENT" ? int(fd, "value", 0) : parseMoney(fd.get("value")) ?? 0;
    if (type === "PERCENT" && (value < 1 || value > 100)) return { error: "Percentual entre 1 e 100." };
    if (type === "FIXED" && value <= 0) return { error: "Informe o valor do desconto." };
    const startsAt = parseLocalDateTime(fd.get("startsAt"));
    const endsAt = parseLocalDateTime(fd.get("endsAt"));
    if (startsAt && endsAt && endsAt <= startsAt) return { error: "A validade final precisa ser depois do início." };
    const maxUses = String(fd.get("maxUses") ?? "").trim() ? int(fd, "maxUses", 0) : null;
    const data = { code, type, value, minSubtotalCents: parseMoney(fd.get("minSubtotal")) || null, startsAt, endsAt, maxUses, productIds: ids(fd, "productIds"), active: bool(fd, "active") };
    if (id) {
      const before = await db.coupon.findUniqueOrThrow({ where: { id } });
      const after = await db.coupon.update({ where: { id }, data });
      await audit(admin.id, "coupon_updated", "coupon", id, { summary: `Cupom ${code} atualizado`, before: asRecord(before), after: asRecord(after) });
    } else {
      const created = await db.coupon.create({ data });
      await audit(admin.id, "coupon_created", "coupon", created.id, { summary: `Cupom criado: ${code}` });
    }
    revalidatePath("/admin/cupons");
    return { ok: true, message: "Cupom salvo." };
  });
}

export async function deleteCoupon(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return withAdmin("ADMIN", async (admin) => {
    const id = str(fd, "id", 40);
    const used = await db.order.count({ where: { couponId: id } });
    if (used) {
      await db.coupon.update({ where: { id }, data: { active: false } });
      revalidatePath("/admin/cupons");
      return { ok: true, message: "Cupom já usado em pedidos: foi desativado (histórico preservado)." };
    }
    const c = await db.coupon.delete({ where: { id } });
    await audit(admin.id, "coupon_deleted", "coupon", id, { summary: `Cupom excluído: ${c.code}` });
    revalidatePath("/admin/cupons");
    return { ok: true, message: "Excluído." };
  });
}

// ───────────── Testes A/B ─────────────

export async function saveExperiment(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return withAdmin("ADMIN", async (admin) => {
    const id = optStr(fd, "id", 40);
    const key = str(fd, "key", 40).toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const target = str(fd, "target", 60);
    const variants = jsonArray<{ key: string; label?: string; weight: number; value: string }>(fd, "variants")
      .filter((v) => v?.key)
      .map((v) => ({ key: String(v.key).slice(0, 20), label: String(v.label ?? "").slice(0, 60), weight: Math.max(0, Math.min(100, Number(v.weight) || 0)), value: String(v.value ?? "").slice(0, 1000) }));
    if (!key || !target) return { error: "Informe chave e alvo." };
    if (variants.length < 2) return { error: "Um teste precisa de pelo menos 2 variantes." };
    if (new Set(variants.map((v) => v.key)).size !== variants.length) return { error: "As chaves das variantes precisam ser diferentes." };
    if (target.startsWith("price:") && variants.some((v) => v.value && (!/^\d+$/.test(v.value) || Number(v.value) < 500))) return { error: "Em testes de preço, o valor é em centavos (ex.: 5990) e no mínimo 500." };
    const active = bool(fd, "active");
    if (active) {
      const clash = await db.experiment.findFirst({ where: { target, active: true, ...(id ? { NOT: { id } } : {}) } });
      if (clash) return { error: `Já existe um teste ativo para este alvo (${clash.name}).` };
    }
    const data = { key, name: str(fd, "name", 80) || key, target, active, variants: variants as unknown as Prisma.InputJsonValue };
    if (id) {
      const before = await db.experiment.findUniqueOrThrow({ where: { id } });
      const after = await db.experiment.update({ where: { id }, data });
      await audit(admin.id, "experiment_updated", "experiment", id, { summary: `Teste "${after.name}" ${before.active !== after.active ? (after.active ? "ativado" : "pausado") : "atualizado"}`, before: asRecord(before), after: asRecord(after) });
    } else {
      const created = await db.experiment.create({ data });
      await audit(admin.id, "experiment_created", "experiment", created.id, { summary: `Teste criado: ${created.name}` });
    }
    refreshStore("experiments");
    revalidatePath("/admin/experimentos");
    return { ok: true, message: "Teste salvo." };
  });
}

export async function deleteExperiment(_: ActionResult, fd: FormData): Promise<ActionResult> {
  return withAdmin("ADMIN", async (admin) => {
    const e = await db.experiment.delete({ where: { id: str(fd, "id", 40) } });
    await audit(admin.id, "experiment_deleted", "experiment", e.id, { summary: `Teste excluído: ${e.name}` });
    refreshStore("experiments");
    revalidatePath("/admin/experimentos");
    return { ok: true, message: "Excluído." };
  });
}

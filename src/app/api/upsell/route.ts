import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, isSameOrigin } from "@/lib/request";
import { log } from "@/lib/log";
import { CheckoutError, acceptUpsell, findOrderByAccess, getNextUpsell, recordUpsellEvent } from "@/server/orders";

export const dynamic = "force-dynamic";

const schema = z.object({
  pedido: z.string().max(40),
  t: z.string().max(80),
  upsellId: z.string().max(40),
  action: z.enum(["view", "accept", "reject"]),
});

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  const ip = getClientIp(req.headers);
  if (!rateLimit(`upsell:${ip}`, 20, 10 * 60_000)) return NextResponse.json({ error: "Muitas tentativas." }, { status: 429 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  const parent = await findOrderByAccess(parsed.data.pedido, parsed.data.t);
  if (!parent) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  const { upsellId, action } = parsed.data;

  try {
    if (action === "view") {
      const next = await getNextUpsell(parent);
      if (next?.id === upsellId) await recordUpsellEvent(parent, upsellId, "VIEW", { priceCents: next.priceCents });
      return NextResponse.json({ ok: true });
    }
    if (action === "reject") {
      await recordUpsellEvent(parent, upsellId, "REJECT");
      return NextResponse.json({ ok: true, next: await getNextUpsell(parent) });
    }
    const order = await acceptUpsell(parent.id, upsellId, { ip, userAgent: req.headers.get("user-agent"), host: req.headers.get("host") });
    return NextResponse.json({ orderNumber: order.orderNumber, token: order.accessToken });
  } catch (err) {
    if (err instanceof CheckoutError) return NextResponse.json({ error: err.message }, { status: err.status });
    log.error("upsell", "erro", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Não conseguimos gerar o PIX agora. Tente novamente." }, { status: 500 });
  }
}

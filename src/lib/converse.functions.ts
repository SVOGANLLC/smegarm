import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const CONVERSE_BASE = "https://pay.conversebank.am";

function getCreds() {
  const merchant_id = process.env.CONVERSE_MERCHANT_ID;
  const token = process.env.CONVERSE_TOKEN;
  if (!merchant_id || !token) throw new Error("ConverseBank credentials not configured");
  return { merchant_id: Number(merchant_id), token };
}

function getOrigin(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getRequestHeader } = require("@tanstack/react-start/server") as typeof import("@tanstack/react-start/server");
    const host = getRequestHeader("x-forwarded-host") || getRequestHeader("host");
    const proto = getRequestHeader("x-forwarded-proto") || "https";
    if (host) return `${proto}://${host}`;
  } catch { /* ignore */ }
  return "https://smeg.previewsite.cc";
}

/** Register a payment with HostX for an existing order and return the formUrl */
export const startConversePayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ order_id: z.string().uuid(), lang: z.enum(["ru", "en", "hy"]).default("ru") }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id,order_no,total_amd,payment_status")
      .eq("id", data.order_id)
      .single();
    if (error || !order) throw new Error("Заказ не найден");
    if (order.payment_status === "paid") throw new Error("Заказ уже оплачен");
    if (!order.total_amd || order.total_amd < 1) throw new Error("Некорректная сумма");

    const { merchant_id, token } = getCreds();
    const origin = getOrigin();
    const returnUrl = `${origin}/payment/converse/return?order=${order.id}`;

    const payload = {
      merchant_id,
      amount: order.total_amd,
      currency: "051", // AMD
      orderNumber: String(order.order_no),
      returnUrl,
      lang: data.lang,
      token,
    };

    const res = await fetch(`${CONVERSE_BASE}/ecommerce.php?c=register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!json?.success || !json?.content?.formUrl) {
      console.error("converse register failed", json);
      throw new Error(json?.respmess || "Не удалось инициализировать платёж");
    }

    await supabaseAdmin
      .from("orders")
      .update({ px_number: json.content.pxNumber, payment_status: "pending" })
      .eq("id", order.id);

    return { formUrl: json.content.formUrl as string, pxNumber: json.content.pxNumber as string };
  });

/** Poll HostX for status and update the order. Returns final payment_status. */
export const checkConversePayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id,order_no,px_number,payment_status,status")
      .eq("id", data.order_id)
      .single();
    if (error || !order) throw new Error("Заказ не найден");
    if (!order.px_number) return { payment_status: order.payment_status ?? "unknown", order_no: order.order_no };

    const { merchant_id, token } = getCreds();
    const res = await fetch(`${CONVERSE_BASE}/ecommerce.php?c=check_status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant_id, token, pxNumber: order.px_number }),
    });
    const json: any = await res.json().catch(() => ({}));
    const status = String(json?.content?.status ?? "");
    // 2 = paid, 6 = not paid, 3 = cancelled/reversed, 4 = refunded
    let payment_status = order.payment_status ?? "pending";
    if (status === "2") payment_status = "paid";
    else if (status === "6") payment_status = "failed";
    else if (status === "3") payment_status = "cancelled";
    else if (status === "4") payment_status = "refunded";

    const updates: Record<string, unknown> = { payment_status };
    // Auto-confirm order on successful payment
    if (payment_status === "paid" && order.status === "new") updates.status = "confirmed";

    await supabaseAdmin.from("orders").update(updates).eq("id", order.id);
    return { payment_status, order_no: order.order_no };
  });
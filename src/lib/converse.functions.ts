import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { randomBytes } from "node:crypto";

const CONVERSE_BASE = "https://pay.conversebank.am";

/** Converse register returns legacy `ecommerce_pay/webX`, which auto-redirects to the ArCa card form.
 *  `ecommerce_pay_applePay/webX` shows Apple Pay only. `px_transfer/{pxNumber}` shows both. */
function buildConversePaymentUrl(rawFormUrl: string, pxNumber: string): string {
  const host = new URL(rawFormUrl).hostname.toLowerCase();
  if (!host.endsWith("conversebank.am")) {
    throw new Error("Некорректный ответ платёжного шлюза");
  }
  return `${CONVERSE_BASE}/px_transfer/${pxNumber}`;
}

function getCreds() {
  const merchant_id = process.env.CONVERSE_MERCHANT_ID;
  const token = process.env.CONVERSE_TOKEN;
  if (!merchant_id || !token) throw new Error("ConverseBank credentials not configured");
  return { merchant_id: Number(merchant_id), token };
}

/** Converse requires a unique merchant-local ID per payment session (not just per order). */
function buildConverseOrderNumber(orderNo: number) {
  return `${orderNo}-${randomBytes(4).toString("hex")}`;
}

async function converseCheckStatus(merchant_id: number, token: string, pxNumber: string) {
  const res = await fetch(`${CONVERSE_BASE}/ecommerce.php?c=check_status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ merchant_id, token, pxNumber }),
  });
  const json: any = await res.json().catch(() => ({}));
  return String(json?.content?.status ?? "");
}

async function getOrigin(): Promise<string> {
  // Explicit base URL wins — this is the address ConverseBank returns the
  // customer to. Set PUBLIC_BASE_URL on the server (e.g. https://smeg.am).
  const explicit = process.env.PUBLIC_BASE_URL || process.env.SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  try {
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const host = getRequestHeader("x-forwarded-host") || getRequestHeader("host");
    const proto = getRequestHeader("x-forwarded-proto") || "https";
    if (host) return `${proto}://${host}`;
  } catch { /* ignore */ }
  return "https://smeg.am";
}

/** Register a payment with HostX for an existing order and return the formUrl */
export const startConversePayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ order_id: z.string().uuid(), lang: z.enum(["ru", "en", "hy"]).default("ru") }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id,order_no,total_amd,payment_status,px_number")
      .eq("id", data.order_id)
      .single();
    if (error || !order) throw new Error("Заказ не найден");
    if (order.payment_status === "paid") throw new Error("Заказ уже оплачен");
    if (!order.total_amd || order.total_amd < 1) throw new Error("Некорректная сумма");

    const { merchant_id, token } = getCreds();

    if (order.px_number) {
      const status = await converseCheckStatus(merchant_id, token, order.px_number);
      if (status === "2") throw new Error("Заказ уже оплачен");
    }

    const origin = await getOrigin();
    const returnUrl = `${origin}/payment/converse/return?order=${order.id}`;

    const payload = {
      merchant_id,
      amount: order.total_amd,
      currency: "051", // AMD
      orderNumber: buildConverseOrderNumber(order.order_no),
      comment: `Order SMEG-${order.order_no}`,
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
      console.error("converse register failed", { orderId: order.id, orderNo: order.order_no, json });
      const msg = String(json?.respmess ?? "");
      if (msg.includes("DUPLICAT")) {
        throw new Error("Платёж уже был инициализирован. Попробуйте ещё раз через несколько секунд.");
      }
      throw new Error(msg || "Не удалось инициализировать платёж");
    }

    let formUrl: string;
    try {
      formUrl = buildConversePaymentUrl(String(json.content.formUrl), String(json.content.pxNumber));
    } catch (e) {
      console.error("converse invalid formUrl", json.content.formUrl, e);
      throw new Error("Некорректный адрес формы оплаты");
    }

    await supabaseAdmin
      .from("orders")
      .update({ px_number: json.content.pxNumber, payment_status: "pending" })
      .eq("id", order.id);

    return { formUrl, pxNumber: json.content.pxNumber as string };
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
    const status = await converseCheckStatus(merchant_id, token, order.px_number);
    // 2 = paid, 6 = not paid, 3 = cancelled/reversed, 4 = refunded
    let payment_status = order.payment_status ?? "pending";
    if (status === "2") payment_status = "paid";
    else if (status === "6") payment_status = "failed";
    else if (status === "3") payment_status = "cancelled";
    else if (status === "4") payment_status = "refunded";

    const updates: { payment_status: string; status?: string } = { payment_status };
    if (payment_status === "paid" && order.status === "new") updates.status = "confirmed";
    await supabaseAdmin.from("orders").update(updates).eq("id", order.id);
    return { payment_status, order_no: order.order_no };
  });
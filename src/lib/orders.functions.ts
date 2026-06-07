import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ItemSchema = z.object({
  sku: z.string().min(1).max(64),
  qty: z.number().int().min(1).max(999),
});

const OrderInput = z.object({
  customer_name: z.string().min(1).max(200),
  customer_phone: z.string().min(3).max(50),
  customer_email: z.string().email().max(255).optional().or(z.literal("")),
  city: z.string().max(120).optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  delivery_method: z.enum(["pickup", "courier_yerevan", "courier_armenia"]),
  payment_method: z.enum(["cash", "card_transfer", "idram"]),
  comment: z.string().max(2000).optional().or(z.literal("")),
  lang: z.enum(["ru", "en", "hy"]).default("ru"),
  items: z.array(ItemSchema).min(1).max(50),
});

export type CreateOrderInput = z.infer<typeof OrderInput>;

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => OrderInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Authoritative price lookup — never trust client prices
    const skus = data.items.map((i) => i.sku);
    const { data: products, error: pErr } = await supabaseAdmin
      .from("products")
      .select("sku,name,price_amd,main_image,is_published")
      .in("sku", skus);
    if (pErr) throw new Error(pErr.message);
    const map = new Map(products?.map((p) => [p.sku, p]) ?? []);

    const itemsToInsert = data.items
      .map((i) => {
        const p = map.get(i.sku);
        if (!p || !p.is_published) return null;
        const unit = p.price_amd ?? 0;
        return {
          product_sku: p.sku,
          name: p.name,
          image: p.main_image,
          unit_price_amd: unit,
          qty: i.qty,
          subtotal_amd: unit * i.qty,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (!itemsToInsert.length) throw new Error("Корзина пуста или товары больше недоступны");

    const total = itemsToInsert.reduce((s, i) => s + i.subtotal_amd, 0);
    const itemsCount = itemsToInsert.reduce((s, i) => s + i.qty, 0);

    // Try to capture user_id if a bearer is provided
    let userId: string | null = null;
    try {
      const { getRequestHeader } = await import("@tanstack/react-start/server");
      const auth = getRequestHeader("authorization");
      if (auth?.startsWith("Bearer ")) {
        const { data: u } = await supabaseAdmin.auth.getUser(auth.slice(7));
        userId = u.user?.id ?? null;
      }
    } catch {
      /* anon */
    }

    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_email: data.customer_email || null,
        city: data.city || null,
        address: data.address || null,
        delivery_method: data.delivery_method,
        payment_method: data.payment_method,
        comment: data.comment || null,
        lang: data.lang,
        total_amd: total,
        items_count: itemsCount,
      })
      .select("id,order_no")
      .single();
    if (oErr || !order) throw new Error(oErr?.message ?? "Не удалось создать заказ");

    const { error: iErr } = await supabaseAdmin
      .from("order_items")
      .insert(itemsToInsert.map((i) => ({ ...i, order_id: order.id })));
    if (iErr) {
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      throw new Error(iErr.message);
    }

    // Fire-and-forget Telegram notification to team
    try {
      const { broadcastToTeam } = await import("./telegram.functions");
      const lines = [
        `🆕 <b>Новый заказ №${order.order_no}</b>`,
        `Клиент: ${data.customer_name}`,
        `Телефон: ${data.customer_phone}`,
        `Сумма: ${total.toLocaleString("ru-RU")} ֏ · позиций: ${itemsCount}`,
        `Доставка: ${data.delivery_method} · Оплата: ${data.payment_method}`,
        ...(data.comment ? [`Комментарий: ${data.comment}`] : []),
      ];
      await broadcastToTeam(lines.join("\n"));
    } catch (e) {
      console.error("telegram notify failed", e);
    }

    return { id: order.id, order_no: order.order_no, total_amd: total };
  });
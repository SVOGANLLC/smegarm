import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InquiryInput = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(50).optional().or(z.literal("")),
  email: z.string().email().max(255).optional().or(z.literal("")),
  message: z.string().max(2000).optional().or(z.literal("")),
  product_sku: z.string().max(64).optional().or(z.literal("")),
  lang: z.enum(["ru", "en", "hy"]).default("ru"),
});

export type SubmitInquiryInput = z.infer<typeof InquiryInput>;

export const submitInquiry = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InquiryInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const row = {
      name: data.name.trim(),
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      message: data.message?.trim() || null,
      product_sku: data.product_sku?.trim() || null,
      lang: data.lang,
    };

    const { data: inquiry, error } = await supabaseAdmin
      .from("inquiries")
      .insert(row)
      .select("id")
      .single();
    if (error || !inquiry) throw new Error(error?.message ?? "Не удалось отправить заявку");

    try {
      const { broadcastToTeam } = await import("./telegram.functions");
      const lines = [
        `📩 <b>Новая заявка с сайта</b>`,
        `Имя: ${row.name}`,
        ...(row.phone ? [`Телефон: ${row.phone}`] : []),
        ...(row.email ? [`Email: ${row.email}`] : []),
        ...(row.product_sku ? [`Товар: <code>${row.product_sku}</code>`] : []),
        ...(row.message ? [`Сообщение: ${row.message}`] : []),
      ];
      await broadcastToTeam(lines.join("\n"), "inquiry_new");
    } catch (e) {
      console.error("telegram inquiry notify failed", e);
    }

    return { id: inquiry.id as string };
  });

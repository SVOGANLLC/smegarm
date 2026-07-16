import { useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { submitInquiry } from "@/lib/inquiries.functions";
import { toast } from "sonner";

export function ContactForm({
  className,
  variant = "light",
  productSku,
}: {
  className?: string;
  variant?: "light" | "dark";
  productSku?: string;
}) {
  const { t, lang } = useI18n();
  const send = useServerFn(submitInquiry);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const fieldCls =
    variant === "dark"
      ? "w-full rounded-sm border border-background/25 bg-background/10 px-3 py-2.5 text-sm text-background placeholder:text-background/45 outline-none focus:border-background"
      : "w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground";
  const labelCls = variant === "dark" ? "eyebrow text-background/55" : "eyebrow text-muted-foreground";
  const btnCls =
    variant === "dark"
      ? "w-full rounded-full bg-background px-6 py-3 text-xs uppercase tracking-[0.2em] text-foreground transition hover:opacity-90 disabled:opacity-50"
      : "w-full rounded-full bg-foreground px-6 py-3 text-xs uppercase tracking-[0.2em] text-background transition hover:opacity-90 disabled:opacity-50";
  const successCls =
    variant === "dark"
      ? "rounded-sm border border-background/25 bg-background/10 px-4 py-3 text-sm text-background"
      : "rounded-sm border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await send({
        data: {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          message: message.trim(),
          product_sku: productSku,
          lang,
        },
      });
    } catch {
      setBusy(false);
      toast.error(t("contact.error"));
      return;
    }
    setBusy(false);
    setSent(true);
    setName("");
    setPhone("");
    setEmail("");
    setMessage("");
    toast.success(t("contact.success"));
  }

  if (sent) {
    return (
      <div className={className}>
        <p className={successCls}>{t("contact.success")}</p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className={`mt-3 text-xs uppercase tracking-[0.18em] ${variant === "dark" ? "text-background/60 hover:text-background" : "text-muted-foreground hover:text-foreground"}`}
        >
          {t("contact.sendAnother")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={className}>
      <p className={labelCls}>{t("contact.title")}</p>
      <div className="mt-4 space-y-3">
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={t("contact.name")} className={fieldCls} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("contact.phone")} className={fieldCls} />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("contact.email")} className={fieldCls} />
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder={t("contact.message")} className={fieldCls} />
        <button type="submit" disabled={busy} className={btnCls}>
          {busy ? "…" : t("contact.submit")}
        </button>
      </div>
    </form>
  );
}

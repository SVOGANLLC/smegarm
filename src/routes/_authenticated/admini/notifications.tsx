import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Send, Save, MessageCircle, Copy, Check, Bell } from "lucide-react";
import {
  getMyTelegram,
  saveMyTelegram,
  saveMyTelegramPrefs,
  sendMyTelegramTest,
} from "@/lib/telegram.functions";
import {
  DEFAULT_TELEGRAM_NOTIFY_PREFS,
  TELEGRAM_NOTIFY_EVENTS,
  type TelegramNotifyEvent,
  type TelegramNotifyPrefs,
} from "@/lib/telegram-notify";
import { AdminCheckbox } from "@/components/admin/AdminCheckbox";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admini/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { t } = useI18n();
  const get = useServerFn(getMyTelegram);
  const save = useServerFn(saveMyTelegram);
  const savePrefs = useServerFn(saveMyTelegramPrefs);
  const test = useServerFn(sendMyTelegramTest);
  const qc = useQueryClient();

  const me = useQuery({ queryKey: ["my-telegram"], queryFn: () => get() });
  const [val, setVal] = useState("");
  const [prefs, setPrefs] = useState<TelegramNotifyPrefs>(DEFAULT_TELEGRAM_NOTIFY_PREFS);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (me.data) {
      setVal(me.data.chat_id ?? "");
      setPrefs(me.data.prefs ?? DEFAULT_TELEGRAM_NOTIFY_PREFS);
    }
  }, [me.data]);

  const saveM = useMutation({
    mutationFn: () => save({ data: { chat_id: val.trim() || null } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-telegram"] });
      toast.success(t("admin.saved"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  const prefsM = useMutation({
    mutationFn: () => savePrefs({ data: prefs }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-telegram"] });
      toast.success(t("admin.saved"));
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  const testM = useMutation({
    mutationFn: () => test(),
    onSuccess: () => toast.success(t("admin.notify.testSent")),
    onError: (e) => toast.error(e instanceof Error ? e.message : t("admin.error")),
  });

  const bot = me.data?.bot ?? "smegarmbot";
  const botLink = `https://t.me/${bot}`;
  const prefsDirty =
    me.data?.prefs && TELEGRAM_NOTIFY_EVENTS.some((k) => prefs[k] !== me.data!.prefs[k]);

  function togglePref(key: TelegramNotifyEvent, next: boolean) {
    setPrefs((p) => ({ ...p, [key]: next }));
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <header>
        <h1 className="font-serif text-4xl">{t("admin.notify.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("admin.notify.desc")}</p>
      </header>

      <section className="rounded-sm border border-border p-6 bg-secondary/20">
        <h2 className="font-medium text-lg flex items-center gap-2">
          <MessageCircle className="h-5 w-5" /> {t("admin.notify.howTo")}
        </h2>
        <ol className="mt-4 space-y-3 text-sm">
          <li>
            <span className="font-medium">1.</span> {t("admin.notify.step1")}{" "}
            <a href={botLink} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-primary">
              @{bot}
            </a>{" "}
            {t("admin.notify.step1b")}
          </li>
          <li>
            <span className="font-medium">2.</span> {t("admin.notify.step2")} <b>Start</b> {t("admin.notify.step2b")}{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">/start</code>).
          </li>
          <li>
            <span className="font-medium">3.</span> {t("admin.notify.step3")} <b>Chat ID</b> {t("admin.notify.step3b")}{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">123456789</code>.
          </li>
          <li>
            <span className="font-medium">4.</span> {t("admin.notify.step4")}
          </li>
        </ol>
        <a
          href={botLink}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-sm bg-foreground px-4 py-2 text-sm text-background hover:opacity-90"
        >
          <MessageCircle className="h-4 w-4" /> {t("admin.notify.openBot", { bot })}
        </a>
      </section>

      <section className="rounded-sm border border-border p-6 space-y-4">
        <h2 className="font-medium text-lg">{t("admin.notify.chatId")}</h2>
        {me.isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <div className="flex gap-2">
              <input
                inputMode="numeric"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                placeholder={t("admin.notify.chatIdPlaceholder")}
                className="flex-1 rounded-sm border border-border bg-background px-3 py-2 font-mono text-sm"
              />
              {me.data?.chat_id && val === me.data.chat_id && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(val);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-border px-3 py-2 text-xs hover:bg-secondary"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => saveM.mutate()}
                disabled={saveM.isPending || val === (me.data?.chat_id ?? "")}
                className="inline-flex items-center gap-2 rounded-sm bg-foreground px-4 py-2 text-sm text-background disabled:opacity-40"
              >
                {saveM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t("admin.save")}
              </button>
              <button
                type="button"
                onClick={() => testM.mutate()}
                disabled={testM.isPending || !me.data?.chat_id}
                className="inline-flex items-center gap-2 rounded-sm border border-border px-4 py-2 text-sm hover:bg-secondary disabled:opacity-40"
              >
                {testM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {t("admin.notify.sendTest")}
              </button>
              {val && (
                <button
                  type="button"
                  onClick={() => {
                    setVal("");
                    saveM.mutate();
                  }}
                  className="ml-auto inline-flex items-center gap-2 rounded-sm border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-secondary"
                >
                  {t("admin.notify.disconnect")}
                </button>
              )}
            </div>
          </>
        )}
      </section>

      <section className="rounded-sm border border-border p-6 space-y-4">
        <h2 className="font-medium text-lg flex items-center gap-2">
          <Bell className="h-5 w-5" /> {t("admin.notify.prefsTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("admin.notify.prefsDesc")}</p>
        <div className="space-y-3">
          {TELEGRAM_NOTIFY_EVENTS.map((key) => (
            <AdminCheckbox
              key={key}
              checked={prefs[key]}
              onChange={(next) => togglePref(key, next)}
              label={t(`admin.notify.event.${key}`)}
              description={t(`admin.notify.event.${key}.desc`)}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => prefsM.mutate()}
          disabled={prefsM.isPending || !prefsDirty}
          className="inline-flex items-center gap-2 rounded-sm bg-foreground px-4 py-2 text-sm text-background disabled:opacity-40"
        >
          {prefsM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("admin.notify.savePrefs")}
        </button>
        <p className="text-xs text-muted-foreground">{t("admin.notify.footer")}</p>
      </section>
    </div>
  );
}

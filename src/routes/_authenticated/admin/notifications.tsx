import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Send, Save, MessageCircle, Copy, Check } from "lucide-react";
import { getMyTelegram, saveMyTelegram, sendMyTelegramTest } from "@/lib/telegram.functions";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const get = useServerFn(getMyTelegram);
  const save = useServerFn(saveMyTelegram);
  const test = useServerFn(sendMyTelegramTest);
  const qc = useQueryClient();

  const me = useQuery({ queryKey: ["my-telegram"], queryFn: () => get() });
  const [val, setVal] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (me.data) setVal(me.data.chat_id ?? "");
  }, [me.data]);

  const saveM = useMutation({
    mutationFn: () => save({ data: { chat_id: val.trim() || null } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-telegram"] });
      toast.success("Сохранено");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Ошибка"),
  });

  const testM = useMutation({
    mutationFn: () => test(),
    onSuccess: () => toast.success("Тестовое сообщение отправлено"),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Ошибка"),
  });

  const bot = me.data?.bot ?? "smegarmbot";
  const botLink = `https://t.me/${bot}`;

  return (
    <div className="space-y-8 max-w-3xl">
      <header>
        <h1 className="font-serif text-4xl">Уведомления</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Получайте новые заказы и заявки прямо в Telegram. Настраивается индивидуально для каждого сотрудника.
        </p>
      </header>

      <section className="rounded-sm border border-border p-6 bg-secondary/20">
        <h2 className="font-medium text-lg flex items-center gap-2">
          <MessageCircle className="h-5 w-5" /> Как подключить Telegram-бота
        </h2>
        <ol className="mt-4 space-y-3 text-sm">
          <li>
            <span className="font-medium">1.</span> Откройте бота{" "}
            <a
              href={botLink}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-primary"
            >
              @{bot}
            </a>{" "}
            в Telegram.
          </li>
          <li>
            <span className="font-medium">2.</span> Нажмите кнопку <b>Start</b> (или отправьте команду{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">/start</code>).
          </li>
          <li>
            <span className="font-medium">3.</span> Бот пришлёт вам ваш <b>Chat ID</b> — это число вида{" "}
            <code className="rounded bg-muted px-1.5 py-0.5">123456789</code>.
          </li>
          <li>
            <span className="font-medium">4.</span> Скопируйте Chat ID и вставьте его в поле ниже.
            Нажмите «Сохранить», затем «Отправить тест».
          </li>
        </ol>
        <a
          href={botLink}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-sm bg-foreground px-4 py-2 text-sm text-background hover:opacity-90"
        >
          <MessageCircle className="h-4 w-4" /> Открыть @{bot}
        </a>
      </section>

      <section className="rounded-sm border border-border p-6 space-y-4">
        <h2 className="font-medium text-lg">Ваш Chat ID</h2>
        {me.isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <div className="flex gap-2">
              <input
                inputMode="numeric"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                placeholder="например, 123456789"
                className="flex-1 rounded-sm border border-border bg-background px-3 py-2 font-mono text-sm"
              />
              {me.data?.chat_id && val === me.data.chat_id && (
                <button
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
                onClick={() => saveM.mutate()}
                disabled={saveM.isPending || val === (me.data?.chat_id ?? "")}
                className="inline-flex items-center gap-2 rounded-sm bg-foreground px-4 py-2 text-sm text-background disabled:opacity-40"
              >
                {saveM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Сохранить
              </button>
              <button
                onClick={() => testM.mutate()}
                disabled={testM.isPending || !me.data?.chat_id}
                className="inline-flex items-center gap-2 rounded-sm border border-border px-4 py-2 text-sm hover:bg-secondary disabled:opacity-40"
              >
                {testM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Отправить тест
              </button>
              {val && (
                <button
                  onClick={() => {
                    setVal("");
                    saveM.mutate();
                  }}
                  className="ml-auto inline-flex items-center gap-2 rounded-sm border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-secondary"
                >
                  Отключить
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Уведомления получают все сотрудники с сохранённым Chat ID.
              Если тест не приходит — убедитесь, что вы написали боту хотя бы один раз (Telegram запрещает писать первым).
            </p>
          </>
        )}
      </section>
    </div>
  );
}
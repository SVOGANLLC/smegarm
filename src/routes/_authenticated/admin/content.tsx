import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getI18nDefaults, type Lang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/content")({
  component: ContentPage,
});

type Field = { i18nKey: string; label: string; multiline?: boolean };
type Block = { key: string; label: string; fields: Field[] };

const BLOCKS: Block[] = [
  {
    key: "hero",
    label: "Hero (главный экран)",
    fields: [
      { i18nKey: "hero.eyebrow", label: "Надстрочник" },
      { i18nKey: "hero.title", label: "Заголовок (\\n для переноса строки)", multiline: true },
      { i18nKey: "hero.subtitle", label: "Подзаголовок", multiline: true },
      { i18nKey: "hero.cta", label: "Кнопка 1" },
      { i18nKey: "hero.cta2", label: "Кнопка 2" },
      { i18nKey: "hero.scroll", label: "Подпись «Scroll»" },
      { i18nKey: "hero.quote", label: "Цитата" },
      { i18nKey: "hero.quoteCaption", label: "Подпись цитаты" },
    ],
  },
  {
    key: "story",
    label: "Блок «История бренда»",
    fields: [
      { i18nKey: "section.story.eyebrow", label: "Надстрочник" },
      { i18nKey: "section.story.title", label: "Заголовок (\\n для переноса)", multiline: true },
      { i18nKey: "section.story.body", label: "Текст", multiline: true },
      { i18nKey: "section.story.cta", label: "Кнопка" },
      { i18nKey: "section.story.stat.years", label: "Подпись: Лет" },
      { i18nKey: "section.story.stat.countries", label: "Подпись: Стран" },
      { i18nKey: "section.story.stat.colours", label: "Подпись: Цветов" },
    ],
  },
  {
    key: "dealer",
    label: "Блок «Шоурум / Дилер»",
    fields: [
      { i18nKey: "section.dealer.eyebrow", label: "Надстрочник" },
      { i18nKey: "section.dealer.title", label: "Заголовок" },
      { i18nKey: "section.dealer.body", label: "Текст", multiline: true },
      { i18nKey: "section.dealer.cta", label: "Кнопка" },
      { i18nKey: "section.dealer.address", label: "Адрес" },
    ],
  },
  {
    key: "benefits",
    label: "Блок «Почему Smeg»",
    fields: [
      { i18nKey: "section.benefits.eyebrow", label: "Надстрочник" },
      { i18nKey: "section.benefits.title", label: "Заголовок (\\n для переноса)", multiline: true },
      { i18nKey: "section.benefits.1.t", label: "Пункт 1 — заголовок" },
      { i18nKey: "section.benefits.1.d", label: "Пункт 1 — описание", multiline: true },
      { i18nKey: "section.benefits.2.t", label: "Пункт 2 — заголовок" },
      { i18nKey: "section.benefits.2.d", label: "Пункт 2 — описание", multiline: true },
      { i18nKey: "section.benefits.3.t", label: "Пункт 3 — заголовок" },
      { i18nKey: "section.benefits.3.d", label: "Пункт 3 — описание", multiline: true },
      { i18nKey: "section.benefits.4.t", label: "Пункт 4 — заголовок" },
      { i18nKey: "section.benefits.4.d", label: "Пункт 4 — описание", multiline: true },
    ],
  },
  {
    key: "footer",
    label: "Подвал",
    fields: [
      { i18nKey: "footer.tagline", label: "Описание", multiline: true },
      { i18nKey: "footer.address.line1", label: "Адрес — строка 1" },
      { i18nKey: "footer.address.line2", label: "Адрес — строка 2" },
    ],
  },
];

const LANGS: { code: Lang; label: string }[] = [
  { code: "ru", label: "Русский" },
  { code: "en", label: "English" },
  { code: "hy", label: "Հայերեն" },
];

type BlockValue = Record<string, Partial<Record<Lang, string>>>;

function ContentPage() {
  const qc = useQueryClient();
  const defaults = getI18nDefaults();
  const q = useQuery({
    queryKey: ["site-content"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_content").select("*");
      if (error) throw error;
      const map: Record<string, BlockValue> = {};
      (data ?? []).forEach((r) => (map[r.key] = (r.value as BlockValue) ?? {}));
      return map;
    },
  });

  const [state, setState] = useState<Record<string, BlockValue>>({});
  useEffect(() => {
    if (q.data) setState(q.data);
  }, [q.data]);

  const save = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: BlockValue }) => {
      const { error } = await supabase
        .from("site_content")
        .upsert({ key, value }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-content"] });
      toast.success("Сохранено. Обновите страницу сайта, чтобы увидеть изменения.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Ошибка"),
  });

  const updateField = (block: string, i18nKey: string, lang: Lang, value: string) => {
    setState((prev) => {
      const next = { ...prev };
      const blockVal = { ...(next[block] ?? {}) };
      const fieldVal = { ...(blockVal[i18nKey] ?? {}) };
      fieldVal[lang] = value;
      blockVal[i18nKey] = fieldVal;
      next[block] = blockVal;
      return next;
    });
  };

  return (
    <div>
      <h1 className="font-serif text-4xl">Контент сайта</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Тексты разделов главной страницы во всех трёх языках. В каждом поле показан текущий
        текст по умолчанию — оставьте пустым, чтобы использовать его, или впишите свой вариант.
      </p>

      <div className="mt-10 space-y-8">
        {BLOCKS.map((b) => {
          const v = state[b.key] ?? {};
          return (
            <div key={b.key} className="rounded-sm border border-border p-6">
              <h2 className="font-serif text-2xl">{b.label}</h2>
              <div className="mt-4 space-y-6">
                {b.fields.map((f) => (
                  <div key={f.i18nKey} className="rounded-sm bg-secondary/40 p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium text-foreground">{f.label}</span>
                      <code className="text-[10px] text-muted-foreground">{f.i18nKey}</code>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                      {LANGS.map((l) => {
                        const placeholder = defaults[l.code][f.i18nKey] ?? "";
                        const fieldVal = v[f.i18nKey]?.[l.code] ?? "";
                        return (
                          <label key={l.code} className="block">
                            <span className="eyebrow mb-1 block text-muted-foreground">{l.label}</span>
                            <textarea
                              rows={f.multiline ? 3 : 2}
                              value={fieldVal}
                              maxLength={2000}
                              placeholder={placeholder}
                              onChange={(e) => updateField(b.key, f.i18nKey, l.code, e.target.value)}
                              className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => save.mutate({ key: b.key, value: v })}
                className="mt-4 rounded-sm bg-foreground px-5 py-2 text-xs uppercase tracking-[0.2em] text-background hover:opacity-90"
              >
                Сохранить блок
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
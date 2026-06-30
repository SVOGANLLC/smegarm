import { createFileRoute, Link, useRouteContext } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { ADMIN_HELP_SECTIONS, pickHelp } from "@/lib/admin-help-content";

export const Route = createFileRoute("/_authenticated/admini/help")({
  component: AdminHelpPage,
});

function AdminHelpPage() {
  const { t, lang } = useI18n();
  const ctx = useRouteContext({ from: "/_authenticated/admini" }) as { role?: "admin" | "manager" };
  const role = ctx.role ?? "admin";
  const [openId, setOpenId] = useState<string | null>("start");

  const sections = useMemo(
    () => ADMIN_HELP_SECTIONS.filter((s) => !s.adminOnly || role === "admin"),
    [role],
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-start gap-4">
        <BookOpen className="mt-1 h-8 w-8 shrink-0 text-muted-foreground" />
        <div>
          <h1 className="font-serif text-4xl">{t("admin.help.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("admin.help.intro")}</p>
        </div>
      </div>

      <nav className="mt-8 rounded-sm border border-border bg-secondary/30 p-4">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{t("admin.help.toc")}</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#help-${s.id}`}
                onClick={() => setOpenId(s.id)}
                className="inline-block rounded-full bg-background px-3 py-1 text-xs text-foreground/80 ring-1 ring-border hover:text-foreground"
              >
                {pickHelp(s.title, lang)}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8 space-y-3">
        {sections.map((section) => {
          const expanded = openId === section.id;
          return (
            <section
              key={section.id}
              id={`help-${section.id}`}
              className="scroll-mt-24 rounded-sm border border-border"
            >
              <button
                type="button"
                onClick={() => setOpenId(expanded ? null : section.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
              >
                <span className="font-medium">{pickHelp(section.title, lang)}</span>
                {expanded ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>

              {expanded && (
                <div className="space-y-4 border-t border-border px-4 pb-5 pt-4 text-sm leading-relaxed text-foreground/90">
                  {section.paragraphs.map((p, i) => (
                    <p key={i}>{pickHelp(p, lang)}</p>
                  ))}

                  {section.bullets && section.bullets.length > 0 && (
                    <ul className="list-disc space-y-1.5 pl-5 text-foreground/80">
                      {section.bullets.map((b, i) => (
                        <li key={i}>{pickHelp(b, lang)}</li>
                      ))}
                    </ul>
                  )}

                  {section.tips?.map((tip, i) => (
                    <p key={i} className="rounded-sm border border-dashed border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                      {pickHelp(tip, lang)}
                    </p>
                  ))}

                  {section.link && (
                    <Link
                      to={section.link.to}
                      className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-foreground hover:underline"
                    >
                      {pickHelp(section.link.label, lang)}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <p className="mt-10 text-xs text-muted-foreground">{t("admin.help.docsHint")}</p>
    </div>
  );
}

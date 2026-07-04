import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useI18n, getI18nDefaults } from "@/lib/i18n";
import {
  fetchPublishedNewsBySlug,
  formatNewsDate,
  newsBodyParagraphs,
  newsCategory,
  newsExcerpt,
  newsTitle,
  type NewsRow,
} from "@/lib/news";
import { breadcrumbJsonLd, canonicalLink, hreflangLinks, seoMeta } from "@/lib/seo";

export const Route = createFileRoute("/news/$slug")({
  loader: async ({ params }) => {
    let item: NewsRow | null = null;
    try {
      item = await fetchPublishedNewsBySlug(params.slug);
    } catch (e) {
      console.error("[news] load failed", params.slug, e);
      throw e;
    }
    if (!item) throw notFound();
    return { item };
  },
  head: ({ loaderData }) => {
    const item = loaderData?.item;
    const hy = getI18nDefaults().hy;
    if (!item) {
      return { meta: [{ title: "News — Smeg Armenia" }, { name: "robots", content: "noindex" }] };
    }
    const path = `/news/${item.slug}`;
    const title = `${item.title_hy || item.title_en || item.title} — Smeg Armenia`;
    const description = (item.excerpt_hy || item.excerpt_en || item.excerpt || title).slice(0, 320);
    return {
      meta: seoMeta({
        title,
        description,
        path,
        image: item.image_url ?? undefined,
        locale: "hy_AM",
      }),
      links: [...hreflangLinks(path), ...canonicalLink(path)],
      scripts: [
        {
          type: "application/ld+json" as const,
          children: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Smeg Armenia", path: "/" },
              { name: hy["nav.news"] ?? "News", path: "/news" },
              { name: item.title_hy || item.title_en || item.title, path },
            ]),
          ),
        },
      ],
    };
  },
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-2xl">News</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Failed to load article"}
        </p>
        <Link to="/news" className="mt-6 inline-block text-xs uppercase tracking-[0.18em] underline">
          ← News
        </Link>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="max-w-md text-center">
        <p className="font-serif text-2xl">Not found</p>
        <Link to="/news" className="mt-4 inline-block text-sm uppercase tracking-wider underline">
          News
        </Link>
      </div>
    </div>
  ),
  component: NewsArticlePage,
});

function NewsArticlePage() {
  const { item } = Route.useLoaderData();
  const { lang, t } = useI18n();

  const title = newsTitle(item, lang);
  const lead = newsExcerpt(item, lang);
  const category = newsCategory(item, lang);
  const paragraphs = newsBodyParagraphs(item, lang);
  const date = item.published_at ? formatNewsDate(item.published_at, lang) : "";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="pt-14 md:pt-20">
        <article className="mx-auto max-w-[920px] px-4 pb-20 pt-10 md:px-10 md:pt-14">
          <nav className="mb-8 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              Smeg Armenia
            </Link>
            <span aria-hidden>/</span>
            <Link to="/news" className="hover:text-foreground">
              {t("nav.news")}
            </Link>
            {category && (
              <>
                <span aria-hidden>/</span>
                <span>{category}</span>
              </>
            )}
          </nav>

          {category && (
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{category}</p>
          )}

          <h1 className="mt-4 font-serif text-[clamp(2rem,5vw,3.5rem)] leading-[1.08] tracking-tight">
            {title}
          </h1>

          {lead && (
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              {lead}
            </p>
          )}

          {date && (
            <time
              dateTime={item.published_at}
              className="mt-5 block text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
            >
              {date}
            </time>
          )}

          {item.image_url && (
            <figure className="mt-10 md:mt-14">
              <div className="aspect-[16/10] overflow-hidden bg-secondary">
                <img src={item.image_url} alt={title} className="h-full w-full object-cover" />
              </div>
            </figure>
          )}

          <div className="mt-10 max-w-[40rem] space-y-6 md:mt-14">
            {paragraphs.length > 0 ? (
              paragraphs.map((p, i) => (
                <p key={i} className="text-base leading-[1.75] text-foreground/90 md:text-[1.05rem]">
                  {p}
                </p>
              ))
            ) : lead ? (
              <p className="text-base leading-[1.75] text-foreground/90 md:text-[1.05rem]">{lead}</p>
            ) : null}
          </div>

          <div className="mt-14 border-t border-border/60 pt-8">
            <Link
              to="/news"
              className="text-xs uppercase tracking-[0.18em] text-foreground/70 transition hover:text-foreground"
            >
              ← {t("news.backToList")}
            </Link>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const url = new URL(request.url);
        const origin = `${url.protocol}//${url.host}`;

        const [{ data: products }, { data: collections }, { data: cats }] = await Promise.all([
          supabaseAdmin
            .from("products")
            .select("sku,updated_at")
            .eq("is_published", true)
            .limit(5000),
          supabaseAdmin
            .from("collections")
            .select("slug,updated_at")
            .eq("is_published", true),
          supabaseAdmin
            .from("products")
            .select("category,category_en")
            .eq("is_published", true)
            .not("category", "is", null)
            .limit(5000),
        ]);

        const slugify = (s: string) =>
          s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

        const categorySlugs = Array.from(
          new Set(
            (cats ?? [])
              .map((c) =>
                slugify(
                  ((c as { category_en: string | null; category: string }).category_en ||
                    (c as { category: string }).category) as string,
                ),
              )
              .filter(Boolean),
          ),
        );

        const staticUrls = ["/", "/catalog", "/sale", "/house-of-coffee", "/news", "/service", "/business"];
        const urls: Array<{ loc: string; lastmod?: string }> = [
          ...staticUrls.map((p) => ({ loc: `${origin}${p}` })),
          ...categorySlugs.map((s) => ({ loc: `${origin}/catalog?category=${s}` })),
          ...((collections ?? []).map((c) => ({
            loc: `${origin}/collection/${c.slug}`,
            lastmod: c.updated_at ?? undefined,
          }))),
          ...((products ?? []).map((p) => ({
            loc: `${origin}/product/${p.sku}`,
            lastmod: p.updated_at ?? undefined,
          }))),
        ];

        const escape = (s: string) =>
          s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        const formatLastmod = (iso?: string | null) => (iso ? iso.slice(0, 10) : undefined);

        const xml =
          `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          urls
            .map(
              (u) =>
                `  <url><loc>${escape(u.loc)}</loc>${u.lastmod ? `<lastmod>${formatLastmod(u.lastmod)}</lastmod>` : ""}</url>`,
            )
            .join("\n") +
          `\n</urlset>\n`;

        return new Response(xml, {
          status: 200,
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
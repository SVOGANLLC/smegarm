import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/sitemap.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const url = new URL(request.url);
        const origin = `${url.protocol}//${url.host}`;

        const [{ data: products }, { data: collections }] = await Promise.all([
          supabaseAdmin
            .from("products")
            .select("sku,updated_at")
            .eq("is_published", true)
            .limit(5000),
          supabaseAdmin
            .from("collections")
            .select("slug,updated_at")
            .eq("is_published", true),
        ]);

        const staticUrls = ["/", "/catalog", "/sale"];
        const urls: Array<{ loc: string; lastmod?: string }> = [
          ...staticUrls.map((p) => ({ loc: `${origin}${p}` })),
          ...((collections ?? []).map((c) => ({
            loc: `${origin}/collection/${c.slug}`,
            lastmod: c.updated_at ?? undefined,
          }))),
          ...((products ?? []).map((p) => ({
            loc: `${origin}/product/${p.sku}`,
            lastmod: p.updated_at ?? undefined,
          }))),
        ];

        const xml =
          `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          urls
            .map(
              (u) =>
                `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`,
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
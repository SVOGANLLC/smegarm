import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ProductGrid } from "@/components/site/ProductCard";
import { fetchCollectionWithProducts } from "@/lib/products";

export const Route = createFileRoute("/collection/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Коллекция ${params.slug} — Smeg Armenia` },
      { property: "og:title", content: `Коллекция ${params.slug} — Smeg Armenia` },
    ],
    links: [{ rel: "canonical", href: `/collection/${params.slug}` }],
  }),
  component: CollectionPage,
  errorComponent: ({ error }) => (
    <div className="p-10 text-center text-muted-foreground">{(error as Error)?.message ?? "Ошибка"}</div>
  ),
  notFoundComponent: () => (
    <div className="p-10 text-center text-muted-foreground">Коллекция не найдена</div>
  ),
});

function CollectionPage() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["collection", slug],
    queryFn: async () => {
      const res = await fetchCollectionWithProducts(slug);
      if (!res) throw notFound();
      return res;
    },
  });
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="mx-auto max-w-[1400px] px-6 py-20 md:px-10 md:py-28">
        {isLoading || !data ? (
          <p className="text-muted-foreground">Загрузка…</p>
        ) : (
          <>
            <div className="mb-12">
              <Link to="/" className="eyebrow text-muted-foreground hover:text-foreground">
                ← На главную
              </Link>
              <h1 className="mt-4 font-serif text-5xl md:text-6xl">{data.collection.name}</h1>
              {data.collection.description && (
                <p className="mt-4 max-w-2xl text-foreground/70">{data.collection.description}</p>
              )}
            </div>
            {data.collection.cover_image && (
              <div className="mb-14 aspect-[21/9] overflow-hidden rounded-sm bg-secondary">
                <img src={data.collection.cover_image} alt={data.collection.name} className="h-full w-full object-cover" />
              </div>
            )}
            {data.products.length === 0 ? (
              <p className="text-muted-foreground">В коллекции пока нет товаров.</p>
            ) : (
              <ProductGrid items={data.products} />
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
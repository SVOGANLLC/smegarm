import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { fetchSiteContentBundle, siteContentQueryKey } from "./lib/site-content";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Transient API blips on the VPS should not crash the whole page.
        retry: 2,
        retryDelay: (attempt) => Math.min(800 * 2 ** attempt, 4_000),
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        throwOnError: false,
      },
    },
  });

  void queryClient
    .prefetchQuery({
      queryKey: siteContentQueryKey,
      queryFn: fetchSiteContentBundle,
      staleTime: 60_000,
    })
    .catch(() => {
      // CMS bundle is optional for first paint — never fail router boot.
    });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 30_000,
  });

  return router;
};

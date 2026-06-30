import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { fetchSiteContentBundle, siteContentQueryKey } from "./lib/site-content";

export const getRouter = () => {
  const queryClient = new QueryClient();

  void queryClient.prefetchQuery({
    queryKey: siteContentQueryKey,
    queryFn: fetchSiteContentBundle,
    staleTime: 60_000,
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};

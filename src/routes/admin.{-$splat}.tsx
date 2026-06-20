import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy /admin URLs → /admini */
export const Route = createFileRoute("/admin/{-$splat}")({
  beforeLoad: ({ params, location }) => {
    const rest = params.splat ? `/${params.splat}` : "";
    throw redirect({
      to: `/admini${rest}` as "/admini",
      search: location.search,
      replace: true,
    });
  },
});

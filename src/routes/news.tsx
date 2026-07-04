import { Outlet, createFileRoute } from "@tanstack/react-router";

/** Layout for /news and /news/$slug — must render Outlet for articles. */
export const Route = createFileRoute("/news")({
  component: () => <Outlet />,
});

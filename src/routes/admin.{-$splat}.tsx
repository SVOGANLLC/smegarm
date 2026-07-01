import { createFileRoute, notFound } from "@tanstack/react-router";

/** /admin is a honeypot — real panel is at /admini only. */
export const Route = createFileRoute("/admin/{-$splat}")({
  beforeLoad: () => {
    throw notFound();
  },
});

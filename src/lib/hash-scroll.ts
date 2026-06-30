/** Scroll to a homepage section anchor; retries until the element exists (async sections). */
export function scrollToHomeSection(
  hash: string,
  options?: { behavior?: ScrollBehavior; headerOffset?: number },
): () => void {
  const id = hash.replace(/^#/, "");
  if (!id) return () => {};

  const behavior = options?.behavior ?? "smooth";
  const offset = options?.headerOffset ?? 88;
  let attempts = 0;
  const maxAttempts = 50;

  const tryScroll = () => {
    const el = document.getElementById(id);
    if (!el) return false;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior });
    return true;
  };

  if (tryScroll()) return () => {};

  const timer = window.setInterval(() => {
    attempts += 1;
    if (tryScroll() || attempts >= maxAttempts) window.clearInterval(timer);
  }, 100);

  return () => window.clearInterval(timer);
}

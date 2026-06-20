/** Open Converse payment form in a new tab (call preparePaymentTab synchronously in click handler). */
export function openPaymentTab(formUrl: string, preOpened?: Window | null): boolean {
  if (preOpened && !preOpened.closed) {
    // Must NOT use noopener when pre-opening — otherwise the reference is null and the tab stays on about:blank.
    preOpened.location.replace(formUrl);
    preOpened.opener = null;
    return true;
  }
  const w = window.open(formUrl, "_blank");
  if (w) {
    w.opener = null;
    return true;
  }
  // Popup blocked — fall back to same-tab redirect.
  window.location.assign(formUrl);
  return true;
}

/** Call synchronously inside a user click handler, before any await. */
export function preparePaymentTab(): Window | null {
  return window.open("about:blank", "_blank");
}

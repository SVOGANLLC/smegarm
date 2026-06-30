/** Throws when a write mutation did not affect a row (e.g. RLS blocked silently). */
export function assertRowUpdated<T>(row: T | null | undefined, message: string): T {
  if (row == null) throw new Error(message);
  return row;
}

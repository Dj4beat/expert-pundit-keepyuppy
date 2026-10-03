/** Hosted visitors enter the current game; portable originals retain their edition. */
export function gameEntry(search: string, portable = false, focusPortable = false) {
  const query = new URLSearchParams(search);
  if (focusPortable || query.has('focus')) return 'focus';
  if (query.has('benchmark')) return 'benchmark';
  if (portable || query.has('classic')) return 'classic';
  return 'focus';
}

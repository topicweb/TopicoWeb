/** Hard navigation used when a session boundary requires a fresh document. */
export function replaceSessionDocument(path: '/login' | '/dashboard'): void {
  window.location.replace(path);
}

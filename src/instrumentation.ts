// Server error monitoring hook. Next calls onRequestError for uncaught errors
// during server rendering, route handlers and server actions. For now it logs
// structured context (visible in Vercel logs); a real monitor (e.g. Sentry)
// can forward `err` from here without touching the rest of the app.
export async function onRequestError(
  err: unknown,
  request: { path?: string; method?: string },
  context: { routerKind?: string; routePath?: string; renderSource?: string },
) {
  try {
    console.error(
      "[onRequestError]",
      JSON.stringify({
        message: err instanceof Error ? err.message : String(err),
        path: request?.path,
        method: request?.method,
        route: context?.routePath,
        kind: context?.routerKind,
        source: context?.renderSource,
        digest: (err as { digest?: string })?.digest,
      }),
    );
    if (err instanceof Error && err.stack) console.error(err.stack);
  } catch {
    // never let logging throw
  }
}

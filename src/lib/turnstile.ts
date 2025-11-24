// Turnstile is disabled in this local-only build, so these helpers are no-ops.

export async function loadTurnstile(): Promise<void> {
  return;
}

export function getTurnstileToken(): string | null {
  return null;
}

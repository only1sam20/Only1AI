const fallbackPath = '/mission-control';
const applicationOrigin = 'https://only1ai.invalid';

export function safeReturnPath(returnTo: string | null): string {
  if (!returnTo?.startsWith('/') || returnTo.startsWith('//')) return fallbackPath;
  try {
    const destination = new URL(returnTo, applicationOrigin);
    // Browsers treat backslashes and some control characters as URL separators.
    // Check the parsed origin instead of trusting the first characters alone.
    if (destination.origin !== applicationOrigin) return fallbackPath;
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return fallbackPath;
  }
}

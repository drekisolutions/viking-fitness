import PostHog from 'posthog-react-native';

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

let client: PostHog | null = null;

/**
 * Initialize PostHog analytics once at app startup.
 * Safe no-op when EXPO_PUBLIC_POSTHOG_API_KEY is not configured.
 */
export function initAnalytics(): void {
  if (client || !POSTHOG_API_KEY) return;
  try {
    client = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
      captureAppLifecycleEvents: true,
    });
  } catch {
    client = null;
  }
}

export function identifyUser(
  userId: string,
  properties?: Record<string, string | number | boolean | null>
): void {
  if (!client || !userId || userId.startsWith('guest-')) return;
  try {
    client.identify(userId, properties);
  } catch {
    // Non-blocking analytics
  }
}

export function trackEvent(
  event: string,
  properties?: Record<string, string | number | boolean | null>
): void {
  if (!client) return;
  try {
    client.capture(event, properties);
  } catch {
    // Non-blocking analytics
  }
}

export function resetAnalytics(): void {
  if (!client) return;
  try {
    client.reset();
  } catch {
    // Non-blocking analytics
  }
}

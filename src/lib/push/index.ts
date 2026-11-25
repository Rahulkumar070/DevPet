import webpush from "web-push";

export function getPushConfig() {
  const { VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey } = process.env;
  if (!publicKey || !privateKey) return null;

  const vapidDetails = { subject: "mailto:devpet@example.com", publicKey, privateKey };
  try {
    webpush.setVapidDetails(vapidDetails.subject, publicKey, privateKey);
    return vapidDetails;
  } catch {
    return null;
  }
}

export function isSupportedPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    const allowedHosts = ["fcm.googleapis.com", "push.services.mozilla.com", "push.apple.com", "notify.windows.com"];
    return url.protocol === "https:" && !url.port && !url.username && !url.password &&
      allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

export async function sendPushNotification(
  subscriptionJson: string,
  payload: PushPayload,
): Promise<boolean> {
  const vapidDetails = getPushConfig();
  if (!vapidDetails) return false;
  try {
    const subscription = JSON.parse(subscriptionJson) as webpush.PushSubscription;
    if (!isSupportedPushEndpoint(subscription.endpoint)) return false;
    await webpush.sendNotification(subscription, JSON.stringify(payload), { vapidDetails });
    return true;
  } catch (err) {
    console.error("Push notification failed:", err);
    return false;
  }
}

export async function sendPushToMany(
  subscriptions: string[],
  payload: PushPayload,
): Promise<void> {
  await Promise.allSettled(
    subscriptions.map((s) => sendPushNotification(s, payload)),
  );
}

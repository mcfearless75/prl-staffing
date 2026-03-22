import webpush from "web-push";
import { prisma } from "@/lib/db";

// Generate VAPID keys once and store them
// Run: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:admin@prlsitesolutions.co.uk",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export async function sendPushToContractor(
  contractorId: string,
  title: string,
  body: string,
  url?: string
) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { contractorId },
  });

  const payload = JSON.stringify({ title, body, url: url || "/portal" });

  // Save notification record
  await prisma.notification.create({
    data: {
      recipientType: "contractor",
      recipientId: contractorId,
      title,
      body,
      url,
    },
  });

  // Send to all their devices
  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      )
    )
  );

  // Clean up expired subscriptions
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === "rejected") {
      try {
        await prisma.pushSubscription.delete({
          where: { id: subscriptions[i].id },
        });
      } catch {
        // ignore
      }
    }
  }

  return results.filter((r) => r.status === "fulfilled").length;
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  url?: string
) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  const payload = JSON.stringify({ title, body, url: url || "/" });

  await prisma.notification.create({
    data: {
      recipientType: "user",
      recipientId: userId,
      title,
      body,
      url,
    },
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      )
    )
  );

  for (let i = 0; i < results.length; i++) {
    if (results[i].status === "rejected") {
      try {
        await prisma.pushSubscription.delete({
          where: { id: subscriptions[i].id },
        });
      } catch {
        // ignore
      }
    }
  }

  return results.filter((r) => r.status === "fulfilled").length;
}

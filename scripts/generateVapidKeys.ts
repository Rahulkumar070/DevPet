import webpush from "web-push";

const vapidKeys = webpush.generateVAPIDKeys();

console.log("VAPID Keys Generated:");
console.log("====================");
console.log("");
console.log("Add these to your .env.local file:");
console.log("");
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log("");
console.log("Keep the private key secure!");

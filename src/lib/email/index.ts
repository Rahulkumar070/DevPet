import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendWelcomeEmail(
  email: string,
  username: string,
  companionName: string,
): Promise<void> {
  if (!resend) return;
  await resend.emails.send({
    from: "DevPet <noreply@devpet.dev>",
    to: email,
    subject: `${companionName} has hatched and is waiting for you! 🥚`,
    html: `
      <h2>Welcome to DevPet, ${username}!</h2>
      <p>Your companion <strong>${companionName}</strong> has hatched and is ready to join you on your coding journey.</p>
      <p>Open your dashboard to meet them: <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard">Go to Dashboard</a></p>
      <p>Happy coding! 🐾</p>
    `,
  });
}

import { redirect } from "next/navigation";
import connectDB from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User";
import { cookies } from "next/headers";

interface ReferralPageProps {
  params: Promise<{ code: string }>;
}

export default async function ReferralPage({ params }: ReferralPageProps) {
  const { code } = await params;

  await connectDB();

  // Verify referral code exists
  const referrer = await User.findOne({ referralCode: code.toUpperCase() });

  if (referrer) {
    // Store referral in cookie for later attribution
    const cookieStore = await cookies();
    cookieStore.set("referral_code", code.toUpperCase(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }

  redirect("/login?ref=" + code);
}

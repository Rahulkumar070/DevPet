import NextAuth, { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import { connectDB } from "@/lib/db/mongoose";
import { User } from "@/lib/db/models/User";
import { generateReferralCode, encryptToken } from "@/lib/utils";
import { runGithubSync } from "@/lib/github/syncRunner";

export const authConfig: NextAuthConfig = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile, user, trigger }) {
      let dbUser;
      if (account) {
        if (account.provider !== "github" || !account.providerAccountId ||
            typeof profile?.login !== "string" || !profile.login) {
          throw new Error("GitHub returned an incomplete account profile");
        }

        await connectDB();
        dbUser = await User.findOneAndUpdate(
          { githubId: account.providerAccountId },
          {
            $set: {
              username: profile.login,
              avatarUrl: user.image ?? "",
              ...(user.email && { email: user.email }),
              ...(account.access_token && { githubAccessToken: encryptToken(account.access_token) }),
            },
            $setOnInsert: { referralCode: generateReferralCode() },
          },
          { upsert: true, returnDocument: "after", runValidators: true },
        );
        if (!dbUser) throw new Error("Unable to load the DevPet account");
        void runGithubSync(dbUser._id.toString()).catch(console.error);
      } else {
        // Sessions without a local account ID must go through GitHub again.
        if (typeof token.userId !== "string" || !/^[a-f\d]{24}$/i.test(token.userId)) return null;
        if (trigger !== "update" && token.username && typeof token.xp === "number" &&
            typeof token.level === "number" && typeof token.streak === "number") return token;

        await connectDB();
        dbUser = await User.findById(token.userId);
        if (!dbUser) return null;
      }

      token.userId = dbUser._id.toString();
      token.username = dbUser.username;
      token.activeCompanionId = dbUser.activeCompanionId?.toString();
      token.guildId = dbUser.guildId?.toString();
      token.xp = dbUser.xp;
      token.level = dbUser.level;
      token.streak = dbUser.streak;
      token.referralCode = dbUser.referralCode;
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.userId as string;
      session.user.username = token.username as string;
      session.user.activeCompanionId = token.activeCompanionId as string | undefined;
      session.user.guildId = token.guildId as string | undefined;
      session.user.xp = token.xp as number;
      session.user.level = token.level as number;
      session.user.streak = token.streak as number;
      session.user.referralCode = token.referralCode as string;
      return session;
    },
  },
  pages: { signIn: "/login", error: "/login" },
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  trustHost: Boolean(process.env.AUTH_URL || process.env.NEXTAUTH_URL) || undefined,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

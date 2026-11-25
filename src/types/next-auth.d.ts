import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      username: string;
      activeCompanionId?: string;
      guildId?: string;
      xp: number;
      level: number;
      streak: number;
      referralCode: string;
    };
  }
  interface User {
    username?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    username: string;
    activeCompanionId?: string;
    guildId?: string;
    xp: number;
    level: number;
    streak: number;
    referralCode: string;
    githubAccessToken?: string;
  }
}

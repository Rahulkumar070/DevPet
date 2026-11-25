declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXTAUTH_SECRET: string;
      NEXTAUTH_URL: string;
      GITHUB_CLIENT_ID: string;
      GITHUB_CLIENT_SECRET: string;
      MONGODB_URI: string;
      ANTHROPIC_API_KEY: string;
      REDIS_URL: string;
      RESEND_API_KEY: string;
      VAPID_PUBLIC_KEY: string;
      VAPID_PRIVATE_KEY: string;
      NEXT_PUBLIC_APP_URL: string;
      // Generate ENCRYPTION_KEY with:
      // node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
      // Must be exactly 64 hex characters (32 bytes)
      ENCRYPTION_KEY: string;
    }
  }
}
export {};

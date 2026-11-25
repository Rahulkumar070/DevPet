"use client";
import { Suspense, useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GithubIcon } from "@/components/icons/GithubIcon";

function loginDestination(callbackUrl: string | null) {
  try {
    const url = new URL(callbackUrl || "/dashboard", window.location.origin);
    if (url.origin === window.location.origin && url.pathname !== "/login" &&
        !url.pathname.startsWith("/api/auth/")) return url.href;
  } catch {
    // An invalid return URL should still allow sign-in.
  }
  return "/dashboard";
}

function LoginContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const error = searchParams.get("error");

  useEffect(() => {
    if (session) {
      router.replace(loginDestination(callbackUrl));
    }
  }, [session, router, callbackUrl]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-6xl animate-float">🥚</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-amber-50 to-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="text-center">
            <div className="text-6xl mb-4">🐾</div>
            <CardTitle className="text-2xl">Welcome to DevPet</CardTitle>
            <CardDescription>
              Sign in with GitHub to hatch your unique coding companion
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(error || failed) && (
              <p role="alert" className="mb-4 text-sm text-red-700">
                {error === "AccessDenied"
                  ? "GitHub sign-in was declined. Continue with GitHub to try again."
                  : "DevPet couldn’t complete GitHub sign-in. Please try again."}
              </p>
            )}
            <Button
              size="lg"
              className="w-full"
              disabled={pending}
              onClick={async () => {
                setPending(true);
                try {
                  await signIn("github", { redirectTo: loginDestination(callbackUrl) });
                } catch {
                  setFailed(true);
                  setPending(false);
                }
              }}
            >
              <GithubIcon className="w-5 h-5 mr-2" />
              {pending ? "Connecting to GitHub…" : "Continue with GitHub"}
            </Button>

            <p className="text-xs text-center text-zinc-500 mt-4">
              By signing in, you agree to our Terms of Service and Privacy
              Policy. Your GitHub data is used only to generate your companion.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-6xl animate-float">🥚</div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

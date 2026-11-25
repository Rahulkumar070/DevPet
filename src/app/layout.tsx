import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { SocketProvider } from "@/components/providers/SocketProvider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "DevPet - Your AI Coding Companion",
  description:
    "Hatch your unique coding companion from your GitHub profile. Battle, chat, evolve, and join guilds.",
  keywords: ["coding", "companion", "AI", "GitHub", "developer", "game", "pet"],
  authors: [{ name: "DevPet Team" }],
  openGraph: {
    title: "DevPet - Your AI Coding Companion",
    description: "Hatch your unique coding companion from your GitHub profile",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DevPet - Your AI Coding Companion",
    description: "Hatch your unique coding companion from your GitHub profile",
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/web-app-manifest-192x192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-[#f5f3ed]">
        <AuthProvider>
          <QueryProvider>
            <SocketProvider>
              {children}
              <Toaster richColors position="top-right" />
            </SocketProvider>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

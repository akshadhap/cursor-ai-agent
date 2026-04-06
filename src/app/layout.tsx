import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Provider } from "jotai";
import { TRPCReactProvider } from "@/trpc/client";
import { Toaster } from "@/components/ui/sonner";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ThemeProvider } from "@/components/theme-provider";
import { ConvexClientProvider } from "@/components/convex-provider";
import { PolarInit } from "@/components/PolarInit";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Spinabot",
  description: "Spinabot - Your AI Workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PolarInit />
          <ThemeProvider>
            <TRPCReactProvider>
              <ConvexClientProvider>
              <NuqsAdapter>
                <Provider>
                  {children}
                  <Toaster />
                </Provider>
              </NuqsAdapter>
              </ConvexClientProvider>
            </TRPCReactProvider>
          </ThemeProvider>
        
      </body>
    </html>
  );
}

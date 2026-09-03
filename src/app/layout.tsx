import type { Metadata } from "next";
import { ThemeProvider } from "@/components/themes/provider";
import "./globals.css";
import { inter } from "./fonts";

import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "@/app/api/uploadthing/core";
import { NavBar } from "@/components/navbar";

export const metadata: Metadata = {
  title: "Vercel + Neon",
  description: "Use Neon with Vercel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
          <NavBar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

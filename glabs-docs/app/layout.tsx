import "./globals.css";
import { RootProvider } from "fumadocs-ui/provider";
import { Inter, JetBrains_Mono } from "next/font/google";
import type { Metadata } from "next";
import type { ReactNode } from "react";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: {
    template: "%s | GLabs SDK",
    default: "GLabs SDK",
  },
  description: "TypeScript SDK for Google Labs AI media generation APIs",
  metadataBase: new URL("https://glabs.getvrex.com"),
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}

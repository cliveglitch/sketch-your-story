import "~/styles/globals.css";

import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: { default: "Sketch Your Story", template: "%s · Sketch Your Story" },
  description:
    "A collaborative visual studio for mapping characters, scenes, and story worlds.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  openGraph: {
    title: "Sketch Your Story",
    description:
      "Find the shape of your story in a collaborative visual studio for writers.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Sketch Your Story collaborative canvas",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sketch Your Story",
    description:
      "Find the shape of your story in a collaborative visual studio for writers.",
    images: ["/og.png"],
  },
};

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
const lora = Lora({ subsets: ["latin"], variable: "--font-display" });

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${mono.variable} ${lora.variable}`}
    >
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}

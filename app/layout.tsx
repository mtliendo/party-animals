import type { Metadata, Viewport } from "next";
import { Inter, Bangers, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { getBrand } from "@/lib/brand";
import { getEvent } from "@/lib/event-settings";

import { publicEventConfig } from "@/lib/event";
import { EventProvider } from "@/components/EventProvider";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const bangers = Bangers({
  variable: "--font-bangers",
  subsets: ["latin"],
  weight: "400",
});

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { SITE_NAME, SITE_DESCRIPTION } = await getBrand();
  return {
  title: SITE_NAME,
  applicationName: SITE_NAME,
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#08080f",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const event = await getEvent();
  return (
    <html
      lang="en"
      className={cn("h-full", inter.variable, bangers.variable, "font-sans", geist.variable)}
    >
      <body className="min-h-dvh flex flex-col bg-[#08080f] text-[#f0f0f8]">
        <EventProvider value={publicEventConfig(event)}>{children}</EventProvider>
      </body>
    </html>
  );
}

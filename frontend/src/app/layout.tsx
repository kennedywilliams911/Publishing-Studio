import type { Metadata } from "next";
import { Fraunces, Literata, DM_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";
import FaviconController from "@/components/FaviconController";
import { getBrandProfile } from "@/lib/branding";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const literata = Literata({
  subsets: ["latin"],
  variable: "--font-literata",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getBrandProfile();
  const siteName = profile?.churchName?.trim() || "Publishing Studio";
  const icon = profile?.churchLogoUrl || "/open-book.svg";

  return {
    metadataBase: new URL(appUrl),
    icons: {
      icon,
      shortcut: icon,
      apple: icon,
    },
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description:
      profile?.bio || "Explore the latest publications from this studio.",
    openGraph: {
      type: "website",
      siteName,
    },
    twitter: {
      card: "summary_large_image",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await getBrandProfile();

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fraunces.variable} ${literata.variable} ${dmSans.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
        >
          {children}
          <FaviconController organizationLogoUrl={profile?.churchLogoUrl} />
          <Toaster richColors position="top-center" theme="light" />
        </ThemeProvider>
      </body>
    </html>
  );
}

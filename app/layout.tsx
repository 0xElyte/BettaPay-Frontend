import type { Metadata } from "next";
import { Fraunces, DM_Sans } from "next/font/google";
import { Toaster } from "@/components/ui";
import { Providers } from "@/components/providers";
import "./globals.css";
import { cn } from "@/lib/utils";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { I18nProvider } from '@/components/i18n/I18nProvider';
import { ensureCsrfCookie } from '@/lib/utils/csrf';


const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-heading",
});

const dmSans = DM_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-body",
});


export const metadata: Metadata = {
  // Resolves relative canonical/openGraph URLs declared by individual pages.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://betta.pay"),
  title: "BettaPay | Non-custodial Merchant Platform",
  description: "Accept USDC and stablecoins easily across Africa",
};


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Seed the CSRF cookie before the page HTML is streamed to the client.
  // ensureCsrfCookie() is a no-op when a valid token is already present,
  // so this adds no overhead on subsequent requests.
  await ensureCsrfCookie();

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  // Pass the clientId straight to GoogleOAuthProvider only when configured;
  // otherwise pass an empty placeholder so the provider target render does
  // not blow up if a GoogleLogin button somehow ends up rendered. The login
  // page is responsible for showing a disabled fallback when the ID is
  // missing so users still get an explanatory UI instead of a silent failure.

  return (
    <html lang="en" className={cn("font-sans antialiased", fraunces.variable, dmSans.variable)}>
      <body className="min-h-screen bg-background text-foreground">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground shadow-md ring-2 ring-ring"
        >
          Skip to main content
        </a>
        <GoogleOAuthProvider clientId={googleClientId ?? ''}>
          <I18nProvider>
            <Providers>
              {children}
              <Toaster />
              <div id="announcer" aria-live="polite" aria-atomic="true" className="sr-only" />
            </Providers>
          </I18nProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}

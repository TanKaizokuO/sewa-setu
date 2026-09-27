import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { LangProvider } from "@/components/lang-provider";
import { SiteHeader } from "@/components/site-header";
import { RoleSwitcher } from "@/components/role-switcher";
import { getLang } from "@/lib/i18n";
import { getSession } from "@/lib/session";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const deva = localFont({
  variable: "--font-deva",
  src: [
    { path: "./fonts/NotoSansDevanagari-Regular.ttf", weight: "400" },
    { path: "./fonts/NotoSansDevanagari-Bold.ttf", weight: "700" },
  ],
});

export const metadata: Metadata = {
  title: "Sewa Setu — AI Citizen Services (Prototype)",
  description: "AI-powered next-generation Sewa Setu for Chhattisgarh: discover, apply, verify and track government services.",
};

export const viewport: Viewport = { themeColor: "#1f4fa3" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [lang, session] = await Promise.all([getLang(), getSession()]);
  return (
    <html lang={lang} className={`${inter.variable} ${deva.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <LangProvider lang={lang}>
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <footer className="border-t bg-card/60 py-6 print:hidden text-center text-xs text-muted-foreground">
              Sewa Setu (Prototype) — hackathon demo. Not an official Government of Chhattisgarh website. All people and
              documents shown are fictional.
            </footer>
            <RoleSwitcher current={session} />
            <Toaster richColors position="top-center" />
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Michroma, Open_Sans } from "next/font/google";
import "./globals.css";

const michroma = Michroma({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-michroma",
  display: "swap",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
  display: "swap",
});

import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Arena Tempur — Platform Turnamen Komunitas Esports",
  description: "Platform manajemen dan administrasi turnamen komunitas Battle Royale terpercaya & independen.",
  manifest: "/manifest.json",
  icons: {
    icon: "/images/logo-monogram.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${openSans.variable} ${michroma.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 font-sans selection:bg-[#DA292A] selection:text-white overflow-x-hidden">
        {children}
        <Toaster position="top-right" richColors theme="dark" closeButton />
      </body>
    </html>
  );
}


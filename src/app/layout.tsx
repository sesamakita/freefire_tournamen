import type { Metadata } from "next";
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
  title: "ArenaKu — Platform Turnamen Free Fire",
  description: "Platform manajemen dan administrasi turnamen Free Fire terpercaya.",
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
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 font-sans selection:bg-amber-500 selection:text-black">
        {children}
        <Toaster position="top-right" richColors theme="dark" closeButton />
      </body>
    </html>
  );
}


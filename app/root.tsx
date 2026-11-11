import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  Link,
} from "react-router";
import type { LinksFunction } from "react-router";
import { Toaster } from "sonner";
import "./globals.css";

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Michroma&family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap",
  },
  { rel: "icon", href: "/images/logo-monogram.svg", type: "image/png" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="h-full antialiased dark font-sans">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Michroma&family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap"
        />
        <Meta />
        <Links />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 font-sans selection:bg-[#DA292A] selection:text-white overflow-x-hidden">
        {children}
        <Toaster position="top-right" richColors theme="dark" closeButton />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: { error: unknown }) {
  let message = "Oops!";
  let details = "Terjadi kesalahan pada sistem.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404 — Tidak Ditemukan" : `${error.status} ${error.statusText}`;
    details =
      error.status === 404
        ? "Halaman atau turnamen yang Anda cari tidak tersedia atau telah dipindahkan."
        : String(error.data || details);
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-zinc-950 text-zinc-100">
      <div className="max-w-md w-full p-8 rounded-2xl bg-[#141416] border border-zinc-800 text-center space-y-4 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-[#DA292A] flex items-center justify-center mx-auto text-xl font-bold font-mono">
          !
        </div>
        <h1 className="text-xl font-bold font-headline text-white">{message}</h1>
        <p className="text-xs text-zinc-400 leading-relaxed">{details}</p>
        {stack && (
          <pre className="p-3 rounded-xl bg-black/60 border border-zinc-800 text-left text-[11px] font-mono text-red-400 overflow-x-auto max-h-48">
            {stack}
          </pre>
        )}
        <div className="pt-2">
          <Link
            to="/"
            className="px-5 py-2.5 rounded-xl bg-[#DA292A] hover:bg-[#B81D1E] text-white text-xs font-bold uppercase transition-colors inline-block"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </main>
  );
}


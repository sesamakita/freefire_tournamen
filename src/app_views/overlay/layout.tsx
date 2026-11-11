import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OBS Broadcast Overlay — Arena Tempur",
  description: "Dynamic Web Overlay for OBS Studio Broadcast",
  robots: "noindex, nofollow",
};

export default function OverlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-transparent overflow-hidden text-white select-none antialiased">
      {children}
    </div>
  );
}

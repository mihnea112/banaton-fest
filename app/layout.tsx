import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://banaton-fest.vercel.app"),
  title: {
    default: "Banaton Fest 2026",
    template: "%s | Banaton Fest 2026",
  },
  description: "Bilete oficiale Banaton Fest 2026. Acces General & VIP.",
  openGraph: {
    type: "website",
    url: "https://banaton-fest.vercel.app",
    siteName: "Banaton Fest",
    title: "Banaton Fest 2026",
    description: "Bilete oficiale Banaton Fest 2026. Acces General & VIP.",
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "2-Mobp-wXt2b-SZ_53Ec3SJvgbVNYYUBaYOwWvJW0G8",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  metadataBase: new URL("https://panavestkds.com"),
  title: "PanAvest Knowledge | Certificate Verification & CPD Programs",
  description: "Verify PanAvest certificates, explore CPD/CPPD programs, and access hands-on assessments across leadership, analytics, and supply chain.",
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
  openGraph: {
    title: "PanAvest Knowledge | Certificate Verification & CPD Programs",
    description:
      "Verify PanAvest-issued certificates and discover practical, industry-ready learning paths across leadership, analytics, project management, and supply chain.",
    url: "https://panavestkds.com",
    siteName: "PanAvest Knowledge",
    images: [{ url: "/favicon.ico" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PanAvest Knowledge | Certificate Verification & CPD Programs",
    description:
      "Verify certificates and explore PanAvest’s CPD/CPPD pathways with hands-on assessments and industry projects.",
    images: ["/favicon.ico"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* flex column to push footer to bottom */}
      <body className="min-h-dvh flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}

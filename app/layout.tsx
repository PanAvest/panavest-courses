import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "PanAvest Knowledge | Certificate Verification & CPD Programs",
  description: "Verify PanAvest certificates, explore CPD/CPPD programs, and access hands-on assessments across leadership, analytics, and supply chain.",
  icons: {
    icon: "/vercel.png",
    apple: "/vercel.png",
  },
  openGraph: {
    title: "PanAvest Knowledge | Certificate Verification & CPD Programs",
    description:
      "Verify PanAvest-issued certificates and discover practical, industry-ready learning paths across leadership, analytics, project management, and supply chain.",
    url: "https://panavestkds.com",
    siteName: "PanAvest Knowledge",
    images: [{ url: "/vercel.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PanAvest Knowledge | Certificate Verification & CPD Programs",
    description:
      "Verify certificates and explore PanAvest’s CPD/CPPD pathways with hands-on assessments and industry projects.",
    images: ["/vercel.png"],
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
      </body>
    </html>
  );
}

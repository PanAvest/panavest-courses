import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "PanAvest Knowledge",
  description: "Learn. Assess. Excel.",
  icons: {
    icon: "/vercel.png",
    apple: "/vercel.png",
  },
  openGraph: {
    title: "PanAvest Knowledge",
    description: "Learn. Assess. Excel.",
    images: [{ url: "/vercel.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PanAvest Knowledge",
    description: "Learn. Assess. Excel.",
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

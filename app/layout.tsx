import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: {
    default: "PanAvest KDS — Knowledge Development Series",
    template: "%s | PanAvest KDS",
  },
  description:
    "PanAvest Knowledge Development Series (KDS) offers certified CPPD knowledge programs, protected e-books, secure mobile learning, and professional assessments rooted in internationally recognized work by Prof. Douglas Boateng.",
  metadataBase: new URL("https://panavestkds.com"),
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    url: "https://panavestkds.com",
    title: "PanAvest Knowledge Development Series (KDS)",
    description:
      "Africa-informed, globally trusted CPPD knowledge programs and digital publications by Prof. Douglas Boateng.",
    siteName: "PanAvest KDS",
    images: [
      {
        url: "/og-cover.png",
        width: 1200,
        height: 630,
        alt: "PanAvest KDS",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PanAvest Knowledge Development Series",
    description:
      "Governance, leadership, sourcing, and ethics programs for professionals across Africa and globally.",
    images: ["/og-cover.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "EducationalOrganization",
              name: "PanAvest Knowledge Development Series",
              url: "https://panavestkds.com",
              logo: "https://panavestkds.com/favicon.ico",
              description:
                "PanAvest KDS provides CPPD knowledge programs, secure e-learning, governance insights, and internationally recognized publications developed by Prof. Douglas Boateng.",
              founder: {
                "@type": "Person",
                name: "Professor Douglas Boateng",
              },
              sameAs: [
                "https://www.linkedin.com/company/panavest",
                "https://twitter.com/panavest",
              ],
            }),
          }}
        />
      </head>
      {/* flex column to push footer to bottom */}
      <body className="min-h-dvh flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider, App } from "antd";
import { PostHogProvider } from "@/components/PostHogProvider";
import theme from "@/theme/config";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.reallandlording.com";

export const metadata: Metadata = {
  title: {
    default: "Real Landlording",
    template: "%s | Real Landlording",
  },
  description: "Vetted for Philly. Tell us what you need and we'll connect you with a reliable, landlord-savvy pro.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "Get Matched with a Trusted Vendor",
    description: "Vetted for Philly. Tell us what you need and we'll connect you with a reliable, landlord-savvy pro.",
    siteName: "Real Landlording",
    url: siteUrl,
    images: [
      {
        url: "/og-request.jpeg",
        width: 1200,
        height: 630,
        alt: "Real Landlording - Philadelphia's Trusted Landlord Community",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Get Matched with a Trusted Vendor",
    description: "Vetted for Philly. Tell us what you need and we'll connect you with a reliable, landlord-savvy pro.",
    images: ["/og-request.jpeg"],
  },
  other: {
    "fb:app_id": process.env.NEXT_PUBLIC_FB_APP_ID || "",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className={poppins.className}>
        <PostHogProvider>
          <AntdRegistry>
            <ConfigProvider theme={theme}>
              <App>
                {children}
              </App>
            </ConfigProvider>
          </AntdRegistry>
        </PostHogProvider>
      </body>
    </html>
  );
}

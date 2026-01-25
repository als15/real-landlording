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

export const metadata: Metadata = {
  title: "Real Landlording",
  description: "Connecting Philadelphia landlords with trusted contractors",
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

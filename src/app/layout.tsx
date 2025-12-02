import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider } from "antd";
import "./globals.css";

export const metadata: Metadata = {
  title: "Real Landlording",
  description: "Property management made simple",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AntdRegistry>
          <ConfigProvider>
            {children}
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}

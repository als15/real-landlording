import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Get Matched with a Trusted Vendor',
};

export default function RequestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

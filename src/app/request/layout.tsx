import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Get Matched with a Trusted Vendor | Real Landlording',
  description: "Vetted for Philly. Tell us what you need and we'll connect you with a reliable, landlord-savvy pro.",
  openGraph: {
    title: 'Get Matched with a Trusted Vendor',
    description: "Vetted for Philly. Tell us what you need and we'll connect you with a reliable, landlord-savvy pro.",
    siteName: 'Real Landlording',
    images: [
      {
        url: '/og-request.png', // Add a 1200x630px image to /public/og-request.png
        width: 1200,
        height: 630,
        alt: 'Real Landlording - Get Matched with Trusted Philadelphia Vendors',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Get Matched with a Trusted Vendor',
    description: "Vetted for Philly. Tell us what you need and we'll connect you with a reliable, landlord-savvy pro.",
    images: ['/og-request.png'],
  },
};

export default function RequestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

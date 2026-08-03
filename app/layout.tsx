import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'City Explorer — walk the world in 3D',
  description:
    'A first-person 3D explorer for real cities. Start in Mumbai: the Gateway of India, Marine Drive, CSMT and the Sea Link, modelled where they actually stand.',
};

export const viewport: Viewport = {
  themeColor: '#0a0710',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

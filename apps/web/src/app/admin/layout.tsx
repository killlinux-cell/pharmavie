import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin — PharmaVie',
  description: 'Portail d\'administration nationale PharmaVie',
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}

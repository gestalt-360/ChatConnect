import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ChatConnect',
  description: 'Modern messaging application',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className="dark">
      <body suppressHydrationWarning className={`${inter.className} bg-brand-bg text-white overflow-hidden m-0 p-0`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
